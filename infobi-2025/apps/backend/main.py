import uvicorn
import os                                   # <--- Aggiunto per fixare l'errore
from pathlib import Path                    # <--- Aggiunto per fixare l'errore
from typing import Dict, Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings
from app.legacy_engine.query_loader import legacy_engine
from app.legacy_engine.rep_loader import rep_loader

# --- Configurazione App ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# --- Configurazione CORS ---
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8090",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelli Dati ---
class QueryRequest(BaseModel):
    query_name: str
    params: Optional[Dict[str, Any]] = {}

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

@app.post("/api/v1/run-legacy")
async def run_legacy_query(payload: QueryRequest):
    """
    Esegue query + Legge configurazione .rep
    """
    # 1. Esegue Dati
    data = await legacy_engine.execute(payload.query_name, payload.params)
    
    # 2. Legge Configurazione JSON (.rep)
    # Assumiamo che il file .rep abbia lo stesso nome del file .qry
    config = rep_loader.load_config(payload.query_name)
    
    return {
        "query": payload.query_name,
        "count": len(data),
        "config": config, # <--- ORA IL FRONTEND RICEVE LE ISTRUZIONI
        "data": data
    }

if __name__ == "__main__":
    # Avvio su porta 8090
    uvicorn.run("main:app", host="0.0.0.0", port=8090, reload=True)