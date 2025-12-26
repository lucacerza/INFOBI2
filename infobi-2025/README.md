# INFOBI PLATFORM 2.0

Piattaforma BI Agnostica multi-database con architettura disaccoppiata.

## 🚀 Architettura

- **Backend**: FastAPI + SQLAlchemy + Apache Arrow
- **Frontend**: Next.js + React + Perspective.js
- **Database Supportati**: SQL Server, PostgreSQL, MySQL

## 📦 Struttura Progetto

```
infobi-2025/
├── apps/
│   ├── backend/          # FastAPI Backend
│   │   ├── app/
│   │   │   ├── core/     # Database, Security, Config
│   │   │   ├── routers/  # API Endpoints
│   │   │   └── utils/    # Utility functions
│   │   ├── data/         # SQLite DB interno
│   │   └── main.py
│   │
│   └── web/              # Next.js Frontend
│       ├── app/          # Pages (App Router)
│       ├── components/   # React Components
│       └── lib/          # Utilities
│
└── data/                 # Database files
```

## ✨ Funzionalità Implementate

### Backend
- ✅ Multi-DB Engine (MSSQL, PostgreSQL, MySQL)
- ✅ Apache Arrow data transmission
- ✅ Autenticazione JWT (Admin/User)
- ✅ Cifratura credenziali DB (AES/Fernet)
- ✅ Database interno SQLite per persistenza
- ✅ Export Excel con gerarchia pivot
- ✅ API REST completa

### Frontend
- ✅ UI Design con TailwindCSS
- ✅ SQL Editor con Monaco
- ✅ Perspective.js per analisi dati
- ✅ Gestione Server UI (Admin)
- ✅ Sistema autenticazione
- ✅ Dashboard interattiva

## 🛠️ Setup Completo

### 1. Backend

```bash
cd apps/backend

# Installa dipendenze
pip install -r requirements.txt

# Inizializza database
python init_db.py

# Avvia server
python main.py
```

Server: http://localhost:8090
API Docs: http://localhost:8090/docs

**Credenziali default:**
- Username: `admin`
- Password: `admin123`

### 2. Frontend

```bash
cd apps/web

# Installa dipendenze
npm install

# Avvia sviluppo
npm run dev
```

App: http://localhost:3000

### 3. Configurazione Ambiente

**Backend** - Opzionale `.env`:
```env
JWT_SECRET_KEY=your-secret-key
DB_ENCRYPTION_KEY=your-encryption-key
```

**Frontend** - `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8090
```

## 📖 Utilizzo

### 1. Login
Accedi con le credenziali admin (admin/admin123)

### 2. Configura Server Database (Admin)
- Vai su "Gestione Server"
- Aggiungi nuovo server database
- Le credenziali vengono cifrate automaticamente
- Testa la connessione

### 3. Crea Report
- Vai su "SQL Editor"
- Seleziona server
- Scrivi query SQL
- Esegui per vedere risultati
- Salva come report

### 4. Analizza Dati
- I risultati appaiono in "Data Viewer"
- Usa Perspective.js per pivot tables
- Drag & drop per raggruppamenti
- Export in Excel

## 🔐 Security

- **JWT**: Token con scadenza 8 ore
- **Fernet (AES)**: Cifratura credenziali DB
- **HTTPS**: Raccomandato in produzione
- **CORS**: Configurato per localhost

## 🎯 API Principali

### Autenticazione
```
POST /api/v1/auth/login
POST /api/v1/auth/register
GET  /api/v1/auth/me
```

### Server (Admin only)
```
GET    /api/v1/servers/
POST   /api/v1/servers/
PUT    /api/v1/servers/{id}
DELETE /api/v1/servers/{id}
POST   /api/v1/servers/{id}/test
```

### Report
```
GET  /api/v1/reports/
POST /api/v1/reports/
POST /api/v1/reports/execute
GET  /api/v1/reports/{id}/execute
POST /api/v1/reports/{id}/export/excel
```

## 🔧 Tecnologie

### Backend
- FastAPI 0.109+
- SQLAlchemy 2.0
- PyArrow 14.0
- PyODBC / PyMySQL / Psycopg2
- Python-JOSE (JWT)
- Cryptography (Fernet)
- OpenPyXL (Excel)

### Frontend
- Next.js 16
- React 19
- Perspective.js 3.1
- Monaco Editor 4.6
- Apache Arrow (JS)
- Zustand (State)
- TailwindCSS + shadcn/ui

## 📝 Note

- Le credenziali DB sono SEMPRE cifrate nel database
- Il database interno è in `apps/backend/data/infobi.db`
- I report salvati includono query SQL e layout Perspective
- Export Excel mantiene la gerarchia dei raggruppamenti

## 🚀 Deploy Produzione

### Backend
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

### Frontend
```bash
npm run build
npm start
```

## 📚 Documentazione

- Backend API: http://localhost:8090/docs
- README Backend: `apps/backend/README.md`
- README Frontend: `apps/web/README.md`

---

**InfoBi Platform 2.0** - Agnostic Database BI System
