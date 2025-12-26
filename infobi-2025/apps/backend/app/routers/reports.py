"""
Router per gestione Report e esecuzione query
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import io

from app.core.models import get_db, Report, DBServer
from app.core.security import get_current_user, require_admin, CredentialEncryption
from app.core.database import db_engine
from app.core.arrow_utils import ArrowConverter, create_arrow_response_headers
from app.utils.excel_export import export_to_excel_with_pivot

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


# --- Pydantic Models ---

class ReportCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    sql_query: str
    server_id: int
    perspective_layout: Optional[str] = None
    config_json: Optional[str] = None
    is_public: bool = False


class ReportUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    sql_query: Optional[str] = None
    perspective_layout: Optional[str] = None
    config_json: Optional[str] = None
    is_public: Optional[bool] = None


class ReportResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    sql_query: str
    server_id: int
    is_public: bool
    is_active: bool
    
    class Config:
        from_attributes = True


class QueryExecute(BaseModel):
    server_id: int
    sql_query: str
    params: Optional[Dict[str, Any]] = None
    format: str = "arrow"  # arrow, json


# --- Endpoints ---

@router.post("/", response_model=ReportResponse, dependencies=[Depends(get_current_user)])
async def create_report(
    report_data: ReportCreate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea nuovo report"""
    # Verifica server esiste
    server = db.query(DBServer).filter(DBServer.id == report_data.server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server non trovato")
    
    new_report = Report(
        name=report_data.name,
        description=report_data.description,
        category=report_data.category,
        sql_query=report_data.sql_query,
        server_id=report_data.server_id,
        perspective_layout=report_data.perspective_layout,
        config_json=report_data.config_json,
        is_public=report_data.is_public,
        owner_id=current_user["user_id"]
    )
    
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    return new_report


@router.get("/", response_model=List[ReportResponse])
async def list_reports(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista report accessibili all'utente"""
    user_id = current_user["user_id"]
    role = current_user["role"]
    
    if role == "admin":
        # Admin vede tutto
        reports = db.query(Report).filter(Report.is_active == True).all()
    else:
        # User vede solo i suoi + pubblici
        reports = db.query(Report).filter(
            Report.is_active == True,
            (Report.owner_id == user_id) | (Report.is_public == True)
        ).all()
    
    return reports


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dettagli report"""
    report = db.query(Report).filter(Report.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    # Verifica permessi
    if not report.is_public and report.owner_id != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    return report


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int, 
    report_data: ReportUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggiorna report"""
    report = db.query(Report).filter(Report.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    # Verifica permessi (solo owner o admin)
    if report.owner_id != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Aggiorna campi
    update_data = report_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(report, key, value)
    
    db.commit()
    db.refresh(report)
    
    return report


@router.delete("/{report_id}")
async def delete_report(report_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Disattiva report"""
    report = db.query(Report).filter(Report.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    # Verifica permessi
    if report.owner_id != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    report.is_active = False
    db.commit()
    
    return {"message": "Report eliminato"}


@router.post("/execute")
async def execute_query(
    query_data: QueryExecute,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Esegue una query SQL su un server
    Supporta formato Arrow o JSON
    """
    # Ottieni configurazione server
    server = db.query(DBServer).filter(DBServer.id == query_data.server_id).first()
    
    if not server or not server.is_active:
        raise HTTPException(status_code=404, detail="Server non trovato o inattivo")
    
    # Decifra credenziali
    config: Dict[str, Any] = {
        "server": server.server,
        "database": server.database,
        "port": server.port,
        "driver": server.driver
    }
    
    if server.username_encrypted:
        config["username"] = CredentialEncryption.decrypt(server.username_encrypted)
    
    if server.password_encrypted:
        config["password"] = CredentialEncryption.decrypt(server.password_encrypted)
    
    # Esegui query
    try:
        results = await db_engine.execute_query(
            server_id=str(server.id),
            db_type=server.db_type,
            config=config,
            query=query_data.sql_query,
            params=query_data.params
        )
        
        # Formato risposta
        if query_data.format == "arrow":
            # Converti in Arrow bytes
            arrow_bytes = ArrowConverter.to_arrow_bytes(results)
            
            return Response(
                content=arrow_bytes,
                media_type="application/vnd.apache.arrow.stream",
                headers=create_arrow_response_headers()
            )
        else:
            # JSON standard
            return {
                "count": len(results),
                "data": results
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore esecuzione query: {str(e)}"
        )


@router.get("/{report_id}/execute")
async def execute_saved_report(
    report_id: int,
    format: str = "arrow",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Esegue un report salvato"""
    report = db.query(Report).filter(Report.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    # Verifica permessi
    if not report.is_public and report.owner_id != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Esegui query del report
    query_data = QueryExecute(
        server_id=report.server_id,
        sql_query=report.sql_query,
        format=format
    )
    
    return await execute_query(query_data, current_user, db)


@router.post("/{report_id}/export/excel")
async def export_report_excel(
    report_id: int,
    pivot_config: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Esporta report in Excel con mantenimento gerarchia pivot
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    # Verifica permessi
    if not report.is_public and report.owner_id != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Ottieni dati
    server = db.query(DBServer).filter(DBServer.id == report.server_id).first()
    
    config: Dict[str, Any] = {
        "server": server.server,
        "database": server.database,
        "port": server.port,
        "driver": server.driver
    }
    
    if server.username_encrypted:
        config["username"] = CredentialEncryption.decrypt(server.username_encrypted)
    
    if server.password_encrypted:
        config["password"] = CredentialEncryption.decrypt(server.password_encrypted)
    
    results = await db_engine.execute_query(
        server_id=str(server.id),
        db_type=server.db_type,
        config=config,
        query=report.sql_query
    )
    
    # Esporta in Excel
    excel_bytes = export_to_excel_with_pivot(results, pivot_config or {})
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={report.name}.xlsx"
        }
    )
