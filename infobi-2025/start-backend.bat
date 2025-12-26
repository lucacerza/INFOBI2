@echo off
REM ========================================================================
REM INFOBI PLATFORM 2.0 - Avvio Backend
REM ========================================================================

echo.
echo Avvio Backend InfoBi su http://localhost:8090...
echo.

cd apps\backend

REM Attiva virtual environment se esiste
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo Virtual environment attivato
) else (
    echo ATTENZIONE: Virtual environment non trovato
    echo Esegui prima setup.bat
)

echo.
python main.py

pause
