import uvicorn
import os
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings
from app.core.models import init_db, create_default_admin

# Import routers
from app.routers import auth, servers, reports

# --- Configurazione App ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="InfoBi Platform - Agnostic Database BI with Apache Arrow",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# Inizializza database al startup
@app.on_event("startup")
async def startup_event():
    """Inizializzazione al startup"""
    init_db()
    create_default_admin()
    print("✅ InfoBi Platform avviata")

# --- Configurazione CORS ---
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8090",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type"]
)

# --- Modelli Dati ---
class QueryRequest(BaseModel):
    query_name: str
    params: Optional[Dict[str, Any]] = {}

# --- Include Routers ---
app.include_router(auth.router)
app.include_router(servers.router)
app.include_router(reports.router)

# --- Rotte API ---

@app.get("/")
def read_root():
    return {
        "status": "ok", 
        "message": "InfoBi 2025 Backend Running", 
        "docs": "http://localhost:8090/docs"
    }

@app.get("/api/v1/reports-list")
def list_reports():
    """
    Scansiona la cartella queries e restituisce l'albero dei file.
    """
    reports = []
    # Risolviamo il path in modo assoluto per sicurezza
    root_path = settings.QUERIES_PATH.resolve()
    
    if not root_path.exists():
        return {"error": f"Cartella non trovata: {root_path}"}

    # Scorre ricorsivamente le cartelle
    for root, dirs, files in os.walk(root_path):
        for file in files:
            if file.endswith(".qry"):
                full_path = Path(root) / file
                
                try:
                    # Calcola il percorso relativo (es. "vendite/mensile.qry")
                    relative_path = full_path.relative_to(root_path)
                    
                    # Nome categoria (cartella padre) o "Generale" se è nella root
                    category = relative_path.parent.name if relative_path.parent.name else "Generale"
                    
                    reports.append({
                        "name": file.replace(".qry", ""),
                        # Sostituiamo backslash con slash per standard web
                        "path": str(relative_path).replace("\\", "/").replace(".qry", ""),
                        "category": category.capitalize()
                    })
                except ValueError:
                    continue
    
    # Raggruppa per categoria
    grouped = {}
    for r in reports:
        cat = r["category"]
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(r)
        
    return grouped

# --- Router Registration ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(servers.router, prefix="/api/v1/servers", tags=["Database Servers"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])

if __name__ == "__main__":
    # Avvio su porta 8090
    uvicorn.run("main:app", host="0.0.0.0", port=8090, reload=True)