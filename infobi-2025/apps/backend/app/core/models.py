"""
Database interno SQLite per persistenza
Modelli: Server, Report, User
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from pathlib import Path
import os

# Base directory per il DB
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "data" / "infobi.db"

# Crea directory se non esiste
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# SQLAlchemy setup
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --- MODELLI ---

class User(Base):
    """Utenti della piattaforma"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="user")  # admin / user
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    reports = relationship("Report", back_populates="owner")


class DBServer(Base):
    """Server Database configurati"""
    __tablename__ = "db_servers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    db_type = Column(String(20), nullable=False)  # mssql, postgresql, mysql
    server = Column(String(255), nullable=False)
    database = Column(String(100), nullable=False)
    port = Column(Integer, nullable=True)
    
    # Credenziali CIFRATE
    username_encrypted = Column(Text, nullable=True)
    password_encrypted = Column(Text, nullable=True)
    
    # Driver/Config aggiuntivi (JSON)
    driver = Column(String(100), nullable=True)
    additional_config = Column(Text, nullable=True)  # JSON per parametri extra
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relazioni
    reports = relationship("Report", back_populates="server")


class Report(Base):
    """Report salvati (Query + Layout Perspective)"""
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    
    # SQL Query
    sql_query = Column(Text, nullable=False)
    
    # Server di riferimento
    server_id = Column(Integer, ForeignKey("db_servers.id"), nullable=False)
    
    # Layout Perspective.js (JSON stringificato)
    perspective_layout = Column(Text, nullable=True)
    
    # Configurazione aggiuntiva (filtri, parametri, ecc.)
    config_json = Column(Text, nullable=True)
    
    # Owner
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relazioni
    server = relationship("DBServer", back_populates="reports")
    owner = relationship("User", back_populates="reports")


# --- Funzioni Helper ---

def init_db():
    """Inizializza il database creando tutte le tabelle"""
    Base.metadata.create_all(bind=engine)
    print(f"✅ Database inizializzato: {DB_PATH}")


def get_db():
    """Dependency per ottenere una sessione DB"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_default_admin():
    """Crea utente admin di default se non esiste"""
    from app.core.security import PasswordHandler
    
    db = SessionLocal()
    
    try:
        # Verifica se esiste già un admin
        existing_admin = db.query(User).filter(User.username == "admin").first()
        
        if not existing_admin:
            admin_user = User(
                username="admin",
                email="admin@infobi.local",
                hashed_password=PasswordHandler.hash_password("admin123"),
                full_name="Amministratore",
                role="admin",
                is_active=True
            )
            
            db.add(admin_user)
            db.commit()
            
            print("✅ Utente admin creato (username: admin, password: admin123)")
        else:
            print("ℹ️ Utente admin già esistente")
            
    except Exception as e:
        print(f"❌ Errore creazione admin: {e}")
        db.rollback()
    finally:
        db.close()


# Inizializza al caricamento del modulo
if __name__ == "__main__":
    init_db()
    create_default_admin()
