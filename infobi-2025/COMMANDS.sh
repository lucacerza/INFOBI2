#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════
# INFOBI PLATFORM 2.0 - COMANDI ESSENZIALI
# ═══════════════════════════════════════════════════════════════════════

cat << 'EOF'
╔════════════════════════════════════════════════════════════════════╗
║                   INFOBI PLATFORM 2.0                               ║
║              Comandi Essenziali - Guida Rapida                      ║
╚════════════════════════════════════════════════════════════════════╝

📁 DIRECTORY BASE: /workspaces/INFOBI2/infobi-2025

═══════════════════════════════════════════════════════════════════════
🚀 SETUP INIZIALE (Una volta)
═══════════════════════════════════════════════════════════════════════

./setup.sh

O manualmente:

# Backend
cd apps/backend
pip install -r requirements.txt
python init_db.py

# Frontend  
cd apps/web
npm install

═══════════════════════════════════════════════════════════════════════
▶️  AVVIO APPLICAZIONE
═══════════════════════════════════════════════════════════════════════

# Metodo 1: Script automatico (raccomandato)
./start.sh

# Metodo 2: Terminali separati

## Terminal 1 - Backend
cd apps/backend
python main.py

## Terminal 2 - Frontend
cd apps/web
npm run dev

═══════════════════════════════════════════════════════════════════════
🌐 URLS
═══════════════════════════════════════════════════════════════════════

Frontend:    http://localhost:3000
Backend API: http://localhost:8090
API Docs:    http://localhost:8090/docs

═══════════════════════════════════════════════════════════════════════
🔑 CREDENZIALI DEFAULT
═══════════════════════════════════════════════════════════════════════

Username: admin
Password: admin123

═══════════════════════════════════════════════════════════════════════
🛑 STOP SERVIZI
═══════════════════════════════════════════════════════════════════════

# Se avviato con start.sh
./stop.sh

# Altrimenti
Ctrl+C nei rispettivi terminali

═══════════════════════════════════════════════════════════════════════
🧪 TEST
═══════════════════════════════════════════════════════════════════════

# Test API
curl http://localhost:8090/

# Test login
curl -X POST http://localhost:8090/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test integrazione completo
python test_integration.py

═══════════════════════════════════════════════════════════════════════
🔧 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════

# Backend non parte
pip install -r apps/backend/requirements.txt
lsof -i :8090  # Verifica porta occupata

# Frontend non parte  
cd apps/web && npm install
lsof -i :3000  # Verifica porta occupata

# Reinstalla tutto
rm -rf apps/backend/__pycache__ apps/backend/app/__pycache__
rm -rf apps/web/node_modules apps/web/.next
./setup.sh

# Verifica logs
tail -f /tmp/infobi-backend.log
tail -f /tmp/infobi-frontend.log

═══════════════════════════════════════════════════════════════════════
📚 DOCUMENTAZIONE
═══════════════════════════════════════════════════════════════════════

README.md                   - Overview e setup generale
ARCHITECTURE.md             - Architettura dettagliata
QUICKSTART.md              - Guida rapida 5 minuti
IMPORTANT_NOTES.md         - Note importanti e troubleshooting
CHANGELOG.md               - Storia versioni
IMPLEMENTATION_COMPLETE.md - Riepilogo implementazione

apps/backend/README.md     - Documentazione backend
apps/web/README.md         - Documentazione frontend

═══════════════════════════════════════════════════════════════════════
🎯 PRIMI PASSI
═══════════════════════════════════════════════════════════════════════

1. Avvia backend e frontend (./start.sh)
2. Apri http://localhost:3000
3. Login con admin/admin123
4. Vai su "Gestione Server" (tab Admin)
5. Aggiungi un server database
6. Vai su "SQL Editor"
7. Scrivi e esegui query
8. Visualizza risultati in "Data Viewer"
9. Salva come report

═══════════════════════════════════════════════════════════════════════
🚨 PRODUZIONE - CHECKLIST
═══════════════════════════════════════════════════════════════════════

[ ] Cambia JWT_SECRET_KEY in .env
[ ] Cambia DB_ENCRYPTION_KEY in .env  
[ ] Cambia password admin
[ ] Configura HTTPS
[ ] Aggiorna CORS origins in main.py
[ ] Setup backup database SQLite
[ ] Configura monitoring e logs
[ ] Testa performance sotto carico
[ ] Configura firewall
[ ] Setup process manager (gunicorn, PM2)

═══════════════════════════════════════════════════════════════════════
📞 SUPPORTO
═══════════════════════════════════════════════════════════════════════

Per problemi o domande:
- Consulta IMPORTANT_NOTES.md per troubleshooting
- Consulta ARCHITECTURE.md per dettagli tecnici
- API Docs: http://localhost:8090/docs

═══════════════════════════════════════════════════════════════════════

✨ InfoBi Platform 2.0 - Enterprise BI Solution ✨

═══════════════════════════════════════════════════════════════════════
EOF
