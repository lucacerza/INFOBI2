# ╔════════════════════════════════════════════════════════════════════╗
# ║                   INFOBI PLATFORM 2.0                               ║
# ║              Guida Rapida Windows                                   ║
# ╚════════════════════════════════════════════════════════════════════╝

## 🪟 COMANDI PER WINDOWS

### Setup Iniziale (Una volta)

**PowerShell:**
```powershell
.\setup.ps1
```

**Command Prompt:**
```cmd
setup.bat
```

**Manualmente:**
```cmd
# Backend
cd apps\backend
pip install -r requirements.txt
python init_db.py

# Frontend (nuovo terminale)
cd apps\web
npm install
```

### Avvio Applicazione

**Metodo 1 - Script Separati (Raccomandato):**

Apri 2 terminali:
- **Terminal 1**: doppio-click su `start-backend.bat`
- **Terminal 2**: doppio-click su `start-frontend.bat`

**Metodo 2 - Comandi Manuali:**

**Terminal 1 - Backend:**
```cmd
cd apps\backend
python main.py
```

**Terminal 2 - Frontend:**
```cmd
cd apps\web
npm run dev
```

### URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:8090
- API Docs: http://localhost:8090/docs

### Credenziali
- Username: `admin`
- Password: `admin123`

### Stop Servizi
Premi `Ctrl+C` in entrambi i terminali

## 📋 Prerequisiti Windows

### Python
```powershell
python --version
# Deve essere >= 3.11
```

Se non installato: https://www.python.org/downloads/

### Node.js
```powershell
node --version
npm --version
# Node >= 20
```

Se non installato: https://nodejs.org/

### ODBC Driver (per SQL Server)
```powershell
# Verifica driver installati
odbcinst -q -d
```

Download driver:
https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server

## 🔧 Troubleshooting Windows

### Errore "python non riconosciuto"
1. Installa Python da https://www.python.org/
2. Durante installazione: spunta "Add Python to PATH"
3. Riavvia terminale

### Errore "npm non riconosciuto"
1. Installa Node.js da https://nodejs.org/
2. Riavvia terminale

### Errore PowerShell Execution Policy
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Porte occupate

**Backend (8090):**
```cmd
netstat -ano | findstr :8090
taskkill /PID <numero> /F
```

**Frontend (3000):**
```cmd
netstat -ano | findstr :3000
taskkill /PID <numero> /F
```

### Errore ODBC Driver
Se usi SQL Server, installa driver:
1. Download: https://go.microsoft.com/fwlink/?linkid=2249004
2. Esegui installer
3. Riavvia computer

## 🚀 Test Rapido

```cmd
# Test backend (dopo avvio)
curl http://localhost:8090/

# Test login
curl -X POST http://localhost:8090/api/v1/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

## 📝 Struttura Directory Windows

```
C:\Lavoro\prova\INFOBI2\infobi-2025\
├── setup.bat              ⬅️ Usa questo per setup
├── setup.ps1              ⬅️ O questo (PowerShell)
├── start-backend.bat      ⬅️ Avvia backend
├── start-frontend.bat     ⬅️ Avvia frontend
├── apps\
│   ├── backend\
│   │   ├── main.py
│   │   └── requirements.txt
│   └── web\
│       ├── package.json
│       └── ...
└── README.md
```

## 🎯 Primi Passi

1. Apri PowerShell o Command Prompt come Amministratore
2. Vai nella directory del progetto:
   ```cmd
   cd C:\Lavoro\prova\INFOBI2\infobi-2025
   ```
3. Esegui setup:
   ```cmd
   setup.bat
   ```
4. Avvia backend (Terminal 1):
   ```cmd
   start-backend.bat
   ```
5. Avvia frontend (Terminal 2):
   ```cmd
   start-frontend.bat
   ```
6. Apri browser: http://localhost:3000
7. Login: admin / admin123

## 📚 Documentazione

Consulta i file README nella root del progetto per informazioni complete.

---

**InfoBi Platform 2.0** - Compatibile Windows 10/11
