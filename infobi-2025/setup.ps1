# ========================================================================
# INFOBI PLATFORM 2.0 - Setup Windows PowerShell
# ========================================================================

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  INFOBI PLATFORM 2.0 - Setup Completo" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Backend
Write-Host "[1/4] Creazione Virtual Environment Backend..." -ForegroundColor Yellow
Set-Location apps\backend

# Crea virtual environment se non esiste
if (-not (Test-Path "venv")) {
    Write-Host "Creazione venv..." -ForegroundColor Gray
    python -m venv venv
}

Write-Host ""
Write-Host "[2/4] Attivazione Virtual Environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

Write-Host ""
Write-Host "[3/4] Installazione dipendenze Backend..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRORE: Installazione backend fallita" -ForegroundColor Red
    Write-Host ""
    Write-Host "Prova:" -ForegroundColor Yellow
    Write-Host "1. Esegui PowerShell come Amministratore" -ForegroundColor White
    Write-Host "2. Oppure usa: pip install --user -r requirements.txt" -ForegroundColor White
    Read-Host "Premi Invio per uscire"
    exit 1
}

Write-Host ""
Write-Host "[4/4] Inizializzazione Database..." -ForegroundColor Yellow
python init_db.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRORE: Inizializzazione database fallita" -ForegroundColor Red
    Read-Host "Premi Invio per uscire"
    exit 1
}

deactivate

Set-Location ..\..

# Frontend
Write-Host ""
Write-Host "[5/5] Setup Frontend..." -ForegroundColor Yellow
Set-Location apps\web
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRORE: Installazione frontend fallita" -ForegroundColor Red
    Read-Host "Premi Invio per uscire"
    exit 1
}

Set-Location ..\..

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "  Setup completato con successo!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Comandi disponibili:" -ForegroundColor White
Write-Host ""
Write-Host "  Backend (Terminal 1):" -ForegroundColor Yellow
Write-Host "    .\start-backend.bat" -ForegroundColor White
Write-Host "  O manualmente:" -ForegroundColor Gray
Write-Host "    cd apps\backend" -ForegroundColor White
Write-Host "    .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "    python main.py" -ForegroundColor White
Write-Host ""
Write-Host "  Frontend (Terminal 2):" -ForegroundColor Yellow
Write-Host "    cd apps\web" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "URLs:" -ForegroundColor Yellow
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8090" -ForegroundColor White
Write-Host "  API Docs:    http://localhost:8090/docs" -ForegroundColor White
Write-Host ""
Write-Host "Credenziali default:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""

Read-Host "Premi Invio per uscire"
