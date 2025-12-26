@echo off
REM ========================================================================
REM INFOBI PLATFORM 2.0 - Setup Windows
REM ========================================================================

echo.
echo ========================================================================
echo   INFOBI PLATFORM 2.0 - Setup Completo
echo ========================================================================
echo.

echo [1/5] Creazione Virtual Environment Backend...
cd apps\backend

REM Crea virtual environment se non esiste
if not exist "venv" (
    echo Creazione venv...
    python -m venv venv
)

echo.
echo [2/5] Attivazione Virtual Environment...
call venv\Scripts\activate.bat

echo.
echo [3/5] Installazione dipendenze Backend...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERRORE: Installazione backend fallita
    echo.
    echo Prova:
    echo 1. Esegui come Amministratore
    echo 2. Oppure usa: pip install --user -r requirements.txt
    pause
    exit /b 1
)

echo.
echo [4/5] Inizializzazione Database...
python init_db.py
if %errorlevel% neq 0 (
    echo ERRORE: Inizializzazione database fallita
    pause
    exit /b 1
)

call venv\Scripts\deactivate.bat

cd ..\..

echo.
echo [5/5] Setup Frontend...
cd apps\web
call npm install
if %errorlevel% neq 0 (
    echo ERRORE: Installazione frontend fallita
    pause
    exit /b 1
)

cd ..\..

echo.
echo ========================================================================
echo   Setup completato con successo!
echo ========================================================================
echo.
echo Comandi disponibili:
echo.
echo   Backend:  start-backend.bat
echo   Frontend: start-frontend.bat
echo.
echo   O manualmente:
echo   Backend:  cd apps\backend ^&^& venv\Scripts\activate ^&^& python main.py
echo   Frontend: cd apps\web ^&^& npm run dev
echo.
echo Credenziali default:
echo   Username: admin
echo   Password: admin123
echo.
pause
