import os
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "InfoBi 2025 API"
    API_V1_STR: str = "/api/v1"
    
    # Percorsi Cartelle
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent.parent
    APP_DIR: Path = Path(__file__).resolve().parent.parent
    QUERIES_PATH: Path = APP_DIR / "legacy_engine" / "queries"
    REPORTS_PATH: Path = APP_DIR / "legacy_engine" / "reports"
    
    # Database interno (SQLite)
    DATABASE_PATH: Path = APP_DIR / "data" / "infobi.db"

    # --- CONFIGURAZIONE SQL SERVER ---
    # Inserisci qui i dati del tuo SQL Server Express
    DB_SERVER: str = "server2023"  # Es: 192.168.1.10 o PC-UFFICIO\SQLEXPRESS
    DB_NAME: str = "cattaneo10"       # Es: GESTIONALE_2024
    DB_USER: str = "sa"                      # Utente SQL
    DB_PASSWORD: str = "Infostudi0"        # Password SQL
    
    # Driver ODBC: Solitamente è "ODBC Driver 17 for SQL Server" o "SQL Server"
    DB_DRIVER: str = "ODBC Driver 17 for SQL Server" 

    # Costruzione Connection String
    @property
    def SQL_CONNECTION_STRING(self) -> str:
        return (
            f"Driver={{{self.DB_DRIVER}}};"
            f"Server={self.DB_SERVER};"
            f"Database={self.DB_NAME};"
            f"UID={self.DB_USER};"
            f"PWD={self.DB_PASSWORD};"
            "TrustServerCertificate=yes;" # Utile per connessioni locali/dev
        )

    class Config:
        case_sensitive = True

settings = Settings()