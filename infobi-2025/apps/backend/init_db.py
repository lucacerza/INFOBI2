#!/usr/bin/env python3
"""
INFOBI PLATFORM 2.0 - Database Initialization Script
Crea il database SQLite e l'utente admin di default
"""

import sys
from pathlib import Path

# Aggiungi il path corrente al PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent))

from app.core.models import init_db, create_default_admin
from app.core.config import settings

def main():
    """Inizializza il database e crea l'utente admin"""
    print("=" * 60)
    print("  INFOBI PLATFORM - Inizializzazione Database")
    print("=" * 60)
    print()
    
    # Crea le tabelle
    print(f"📁 Database SQLite: {settings.DATABASE_PATH}")
    print("🔧 Creazione tabelle...")
    init_db()
    print("✅ Tabelle create con successo!")
    print()
    
    # Crea utente admin di default
    print("👤 Creazione utente admin di default...")
    admin_created = create_default_admin()
    
    if admin_created:
        print("✅ Utente admin creato!")
        print()
        print("🔑 Credenziali di default:")
        print("   Username: admin")
        print("   Password: admin123")
        print()
        print("⚠️  IMPORTANTE: Cambia la password dopo il primo login!")
    else:
        print("ℹ️  Utente admin già esistente")
    
    print()
    print("=" * 60)
    print("  ✅ Inizializzazione completata!")
    print("=" * 60)
    print()
    print("🚀 Puoi ora avviare il backend con:")
    print("   python main.py")
    print()

if __name__ == "__main__":
    main()
