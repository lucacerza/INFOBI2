"""
Multi-DB Engine con SQLAlchemy
Supporta: MSSQL, PostgreSQL, MySQL
"""
from typing import Dict, Any, List, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool
import pyodbc
from decimal import Decimal
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)

class MultiDBEngine:
    """Gestione dinamica connessioni multi-database"""
    
    def __init__(self):
        self._engines: Dict[str, Engine] = {}
    
    def get_connection_string(self, db_type: str, config: Dict[str, Any]) -> str:
        """Costruisce connection string in base al tipo di DB"""
        
        if db_type == "mssql":
            # SQL Server via PyODBC
            driver = config.get("driver", "ODBC Driver 17 for SQL Server")
            server = config["server"]
            database = config["database"]
            username = config.get("username")
            password = config.get("password")
            
            if username and password:
                conn_str = (
                    f"mssql+pyodbc://{username}:{password}@{server}/{database}"
                    f"?driver={driver.replace(' ', '+')}"
                    "&TrustServerCertificate=yes"
                )
            else:
                # Windows Authentication
                conn_str = (
                    f"mssql+pyodbc://{server}/{database}"
                    f"?driver={driver.replace(' ', '+')}"
                    "&trusted_connection=yes"
                    "&TrustServerCertificate=yes"
                )
            return conn_str
            
        elif db_type == "postgresql":
            # PostgreSQL
            server = config["server"]
            database = config["database"]
            username = config["username"]
            password = config["password"]
            port = config.get("port", 5432)
            
            return f"postgresql://{username}:{password}@{server}:{port}/{database}"
            
        elif db_type == "mysql":
            # MySQL
            server = config["server"]
            database = config["database"]
            username = config["username"]
            password = config["password"]
            port = config.get("port", 3306)
            
            return f"mysql+pymysql://{username}:{password}@{server}:{port}/{database}"
            
        else:
            raise ValueError(f"Database type non supportato: {db_type}")
    
    def get_engine(self, server_id: str, db_type: str, config: Dict[str, Any]) -> Engine:
        """Ottiene o crea un engine per il server specificato"""
        
        cache_key = f"{server_id}_{db_type}"
        
        if cache_key not in self._engines:
            conn_str = self.get_connection_string(db_type, config)
            
            # Crea engine con pooling disabilitato per sicurezza
            engine = create_engine(
                conn_str,
                poolclass=NullPool,
                echo=False,
                future=True
            )
            
            self._engines[cache_key] = engine
            logger.info(f"Engine creato per {cache_key}")
        
        return self._engines[cache_key]
    
    def close_engine(self, server_id: str, db_type: str):
        """Chiude e rimuove un engine dalla cache"""
        cache_key = f"{server_id}_{db_type}"
        
        if cache_key in self._engines:
            self._engines[cache_key].dispose()
            del self._engines[cache_key]
            logger.info(f"Engine chiuso per {cache_key}")
    
    def close_all_engines(self):
        """Chiude tutti gli engine"""
        for key, engine in self._engines.items():
            engine.dispose()
            logger.info(f"Engine chiuso: {key}")
        
        self._engines.clear()
    
    async def execute_query(
        self, 
        server_id: str,
        db_type: str, 
        config: Dict[str, Any],
        query: str,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Esegue una query SQL e restituisce i risultati
        con sanificazione automatica dei tipi
        """
        
        engine = self.get_engine(server_id, db_type, config)
        
        try:
            with engine.connect() as connection:
                # Esegui query con parametri
                if params:
                    result = connection.execute(text(query), params)
                else:
                    result = connection.execute(text(query))
                
                # Converti risultati in lista di dizionari
                columns = result.keys()
                rows = []
                
                for row in result:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        value = row[i]
                        # Sanificazione tipi per serializzazione JSON/Arrow
                        row_dict[col] = self._sanitize_value(value)
                    rows.append(row_dict)
                
                return rows
                
        except Exception as e:
            logger.error(f"Errore esecuzione query su {server_id}: {str(e)}")
            raise
    
    def _sanitize_value(self, value: Any) -> Any:
        """
        Sanifica valori per serializzazione JSON/Arrow
        Decimal -> Float
        DateTime -> ISO String
        """
        
        if value is None:
            return None
        
        # Decimal -> Float
        if isinstance(value, Decimal):
            return float(value)
        
        # DateTime -> ISO String
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        
        # Altri tipi passano direttamente
        return value
    
    async def test_connection(
        self, 
        db_type: str, 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Testa la connessione a un database
        Restituisce stato e informazioni
        """
        
        test_id = "test_connection"
        
        try:
            # Crea engine temporaneo
            engine = self.get_engine(test_id, db_type, config)
            
            # Test semplice
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1 as test"))
                row = result.fetchone()
                
                if row and row[0] == 1:
                    return {
                        "status": "success",
                        "message": "Connessione riuscita",
                        "db_type": db_type,
                        "server": config.get("server")
                    }
                else:
                    return {
                        "status": "error",
                        "message": "Risposta inattesa dal server"
                    }
                    
        except Exception as e:
            return {
                "status": "error",
                "message": f"Errore connessione: {str(e)}"
            }
        finally:
            # Pulisci engine test
            self.close_engine(test_id, db_type)

# Istanza globale
db_engine = MultiDBEngine()
