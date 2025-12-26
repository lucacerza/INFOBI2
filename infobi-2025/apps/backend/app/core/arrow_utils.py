"""
Modulo Apache Arrow per data transmission
Conversione dati -> Arrow Table -> Bytes
"""
import pyarrow as pa
from typing import List, Dict, Any
from decimal import Decimal
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)


class ArrowConverter:
    """Conversione dati Python -> Apache Arrow"""
    
    @staticmethod
    def sanitize_for_arrow(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sanifica i dati per Arrow:
        - Decimal -> float
        - DateTime -> timestamp/string
        - None gestito correttamente
        """
        sanitized_data = []
        
        for row in data:
            sanitized_row = {}
            for key, value in row.items():
                sanitized_row[key] = ArrowConverter._sanitize_value(value)
            sanitized_data.append(sanitized_row)
        
        return sanitized_data
    
    @staticmethod
    def _sanitize_value(value: Any) -> Any:
        """Sanifica un singolo valore"""
        if value is None:
            return None
        
        if isinstance(value, Decimal):
            return float(value)
        
        if isinstance(value, datetime):
            return value.isoformat()
        
        if isinstance(value, date):
            return value.isoformat()
        
        return value
    
    @staticmethod
    def to_arrow_table(data: List[Dict[str, Any]]) -> pa.Table:
        """
        Converte una lista di dizionari in una PyArrow Table
        """
        if not data:
            # Tabella vuota
            return pa.table({})
        
        # Sanifica i dati
        sanitized_data = ArrowConverter.sanitize_for_arrow(data)
        
        # Crea tabella Arrow
        try:
            table = pa.Table.from_pylist(sanitized_data)
            return table
        except Exception as e:
            logger.error(f"Errore conversione Arrow: {e}")
            raise
    
    @staticmethod
    def to_arrow_bytes(data: List[Dict[str, Any]]) -> bytes:
        """
        Converte dati in formato Arrow IPC (bytes)
        Formato ottimale per trasmissione network
        """
        table = ArrowConverter.to_arrow_table(data)
        
        # Serializza in IPC Stream format
        sink = pa.BufferOutputStream()
        with pa.ipc.new_stream(sink, table.schema) as writer:
            writer.write_table(table)
        
        buf = sink.getvalue()
        return buf.to_pybytes()
    
    @staticmethod
    def from_arrow_bytes(arrow_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Decodifica bytes Arrow in lista di dizionari
        (Utile per testing o processing server-side)
        """
        reader = pa.ipc.open_stream(arrow_bytes)
        table = reader.read_all()
        
        # Converte in lista di dizionari
        return table.to_pylist()
    
    @staticmethod
    def get_arrow_schema(data: List[Dict[str, Any]]) -> pa.Schema:
        """Ottiene lo schema Arrow dei dati"""
        if not data:
            return pa.schema([])
        
        table = ArrowConverter.to_arrow_table(data)
        return table.schema


# --- Helper per FastAPI Response ---
def create_arrow_response_headers() -> Dict[str, str]:
    """
    Headers HTTP per risposta Arrow
    """
    return {
        "Content-Type": "application/vnd.apache.arrow.stream",
        "Access-Control-Expose-Headers": "Content-Type"
    }
