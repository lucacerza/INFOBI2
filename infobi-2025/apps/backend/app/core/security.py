"""
Modulo Security: JWT + Cifratura Credenziali
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# --- Configurazione JWT ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 ore

# --- Configurazione Cifratura Credenziali DB ---
# IMPORTANTE: In produzione salvare questa chiave in modo sicuro (env var, vault)
ENCRYPTION_KEY = os.getenv("DB_ENCRYPTION_KEY", Fernet.generate_key())
if isinstance(ENCRYPTION_KEY, str):
    ENCRYPTION_KEY = ENCRYPTION_KEY.encode()

cipher_suite = Fernet(ENCRYPTION_KEY)

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Bearer Token Security ---
security = HTTPBearer()


class JWTHandler:
    """Gestione Token JWT"""
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Crea un token JWT"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """Decodifica e valida un token JWT"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token non valido o scaduto",
                headers={"WWW-Authenticate": "Bearer"},
            )


class PasswordHandler:
    """Gestione Password Utenti"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash di una password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifica password con hash"""
        return pwd_context.verify(plain_password, hashed_password)


class CredentialEncryption:
    """Cifratura/Decifratura credenziali DB con Fernet (AES)"""
    
    @staticmethod
    def encrypt(plain_text: str) -> str:
        """Cifra testo in chiaro"""
        if not plain_text:
            return ""
        
        encrypted = cipher_suite.encrypt(plain_text.encode())
        return encrypted.decode()
    
    @staticmethod
    def decrypt(encrypted_text: str) -> str:
        """Decifra testo cifrato"""
        if not encrypted_text:
            return ""
        
        decrypted = cipher_suite.decrypt(encrypted_text.encode())
        return decrypted.decode()
    
    @staticmethod
    def encrypt_db_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """Cifra i campi sensibili della configurazione DB"""
        encrypted_config = config.copy()
        
        sensitive_fields = ["password", "username"]
        
        for field in sensitive_fields:
            if field in encrypted_config and encrypted_config[field]:
                encrypted_config[field] = CredentialEncryption.encrypt(
                    str(encrypted_config[field])
                )
        
        return encrypted_config
    
    @staticmethod
    def decrypt_db_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """Decifra i campi sensibili della configurazione DB"""
        decrypted_config = config.copy()
        
        sensitive_fields = ["password", "username"]
        
        for field in sensitive_fields:
            if field in decrypted_config and decrypted_config[field]:
                decrypted_config[field] = CredentialEncryption.decrypt(
                    decrypted_config[field]
                )
        
        return decrypted_config


# --- Dependency per protezione endpoint ---
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Dependency per estrarre e validare l'utente dal token JWT
    """
    token = credentials.credentials
    payload = JWTHandler.decode_token(token)
    
    username = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non valido"
        )
    
    return payload


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Dependency per richiedere ruolo ADMIN
    """
    role = current_user.get("role", "user")
    
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso riservato agli amministratori"
        )
    
    return current_user
