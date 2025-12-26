# InfoBi Platform 2.0 - Backend

Piattaforma BI Agnostica con supporto multi-database.

## Funzionalità

- ✅ Multi-DB Engine (SQL Server, PostgreSQL, MySQL)
- ✅ Apache Arrow data transmission
- ✅ Autenticazione JWT
- ✅ Cifratura credenziali database (AES/Fernet)
- ✅ Database interno SQLite per persistenza
- ✅ Export Excel con gerarchia pivot
- ✅ API REST completa

## Setup

### 1. Installazione dipendenze

```bash
cd /workspaces/INFOBI2/infobi-2025/apps/backend
pip install -r requirements.txt
```

### 2. Inizializzazione database

```bash
python init_db.py
```

### 3. Avvio server

```bash
python main.py
```

Server disponibile su: http://localhost:8090

## Credenziali Default

- Username: `admin`
- Password: `admin123`

## API Endpoints

### Autenticazione
- POST `/api/v1/auth/login` - Login
- POST `/api/v1/auth/register` - Registrazione
- GET `/api/v1/auth/me` - Info utente corrente

### Server Database (Admin)
- GET `/api/v1/servers/` - Lista server
- POST `/api/v1/servers/` - Crea server
- PUT `/api/v1/servers/{id}` - Aggiorna server
- DELETE `/api/v1/servers/{id}` - Elimina server
- POST `/api/v1/servers/{id}/test` - Test connessione

### Report
- GET `/api/v1/reports/` - Lista report
- POST `/api/v1/reports/` - Crea report
- PUT `/api/v1/reports/{id}` - Aggiorna report
- DELETE `/api/v1/reports/{id}` - Elimina report
- POST `/api/v1/reports/execute` - Esegue query SQL
- GET `/api/v1/reports/{id}/execute` - Esegue report salvato
- POST `/api/v1/reports/{id}/export/excel` - Export Excel

## Variabili Ambiente

```env
JWT_SECRET_KEY=your-secret-key
DB_ENCRYPTION_KEY=your-encryption-key
```

## Documentazione API

Swagger UI: http://localhost:8090/docs
