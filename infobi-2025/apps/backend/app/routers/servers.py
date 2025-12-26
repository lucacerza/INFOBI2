"""
Router per gestione Server Database
Solo ADMIN
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.core.models import get_db, DBServer
from app.core.security import require_admin, CredentialEncryption
from app.core.database import db_engine

router = APIRouter(prefix="/api/v1/servers", tags=["Database Servers"], dependencies=[Depends(require_admin)])


# --- Pydantic Models ---

class ServerCreate(BaseModel):
    name: str
    db_type: str  # mssql, postgresql, mysql
    server: str
    database: str
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    driver: Optional[str] = None


class ServerUpdate(BaseModel):
    name: Optional[str] = None
    server: Optional[str] = None
    database: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    driver: Optional[str] = None
    is_active: Optional[bool] = None


class ServerResponse(BaseModel):
    id: int
    name: str
    db_type: str
    server: str
    database: str
    port: Optional[int]
    driver: Optional[str]
    is_active: bool
    
    class Config:
        from_attributes = True


# --- Endpoints ---

@router.post("/", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
async def create_server(server_data: ServerCreate, db: Session = Depends(get_db)):
    """
    Crea nuovo server database
    Le credenziali vengono CIFRATE prima del salvataggio
    """
    # Cifra credenziali
    username_encrypted = None
    password_encrypted = None
    
    if server_data.username:
        username_encrypted = CredentialEncryption.encrypt(server_data.username)
    
    if server_data.password:
        password_encrypted = CredentialEncryption.encrypt(server_data.password)
    
    # Crea server
    new_server = DBServer(
        name=server_data.name,
        db_type=server_data.db_type,
        server=server_data.server,
        database=server_data.database,
        port=server_data.port,
        username_encrypted=username_encrypted,
        password_encrypted=password_encrypted,
        driver=server_data.driver,
        is_active=True
    )
    
    db.add(new_server)
    db.commit()
    db.refresh(new_server)
    
    return new_server


@router.get("/", response_model=List[ServerResponse])
async def list_servers(db: Session = Depends(get_db)):
    """Lista tutti i server configurati"""
    servers = db.query(DBServer).filter(DBServer.is_active == True).all()
    return servers


@router.get("/{server_id}", response_model=ServerResponse)
async def get_server(server_id: int, db: Session = Depends(get_db)):
    """Dettagli di un server"""
    server = db.query(DBServer).filter(DBServer.id == server_id).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server non trovato"
        )
    
    return server


@router.put("/{server_id}", response_model=ServerResponse)
async def update_server(server_id: int, server_data: ServerUpdate, db: Session = Depends(get_db)):
    """
    Aggiorna configurazione server
    Se vengono fornite nuove credenziali, vengono cifrate
    """
    server = db.query(DBServer).filter(DBServer.id == server_id).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server non trovato"
        )
    
    # Aggiorna campi
    update_data = server_data.model_dump(exclude_unset=True)
    
    # Gestione credenziali cifrate
    if "username" in update_data and update_data["username"]:
        server.username_encrypted = CredentialEncryption.encrypt(update_data.pop("username"))
    
    if "password" in update_data and update_data["password"]:
        server.password_encrypted = CredentialEncryption.encrypt(update_data.pop("password"))
    
    # Aggiorna altri campi
    for key, value in update_data.items():
        setattr(server, key, value)
    
    db.commit()
    db.refresh(server)
    
    return server


@router.delete("/{server_id}")
async def delete_server(server_id: int, db: Session = Depends(get_db)):
    """Disattiva un server (soft delete)"""
    server = db.query(DBServer).filter(DBServer.id == server_id).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server non trovato"
        )
    
    server.is_active = False
    db.commit()
    
    return {"message": "Server disattivato"}


@router.post("/{server_id}/test")
async def test_server_connection(server_id: int, db: Session = Depends(get_db)):
    """
    Testa la connessione a un server
    """
    server = db.query(DBServer).filter(DBServer.id == server_id).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server non trovato"
        )
    
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
    
    # Test connessione
    result = await db_engine.test_connection(server.db_type, config)
    
    return result
