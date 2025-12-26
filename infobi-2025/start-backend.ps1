# ========================================================================
# INFOBI PLATFORM 2.0 - Avvio Backend PowerShell
# ========================================================================

Write-Host ""
Write-Host "Avvio Backend InfoBi su http://localhost:8090..." -ForegroundColor Cyan
Write-Host ""

Set-Location apps\backend

# Attiva virtual environment se esiste
if (Test-Path "venv\Scripts\Activate.ps1") {
    & .\venv\Scripts\Activate.ps1
    Write-Host "Virtual environment attivato" -ForegroundColor Green
} else {
    Write-Host "ATTENZIONE: Virtual environment non trovato" -ForegroundColor Yellow
    Write-Host "Esegui prima setup.ps1" -ForegroundColor Yellow
}

Write-Host ""
python main.py

Read-Host "Premi Invio per uscire"
