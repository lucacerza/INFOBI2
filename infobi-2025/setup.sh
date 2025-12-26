#!/bin/bash

echo "🚀 InfoBi Platform 2.0 - Setup Completo"
echo "========================================"
echo ""

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directory base
BASE_DIR="/workspaces/INFOBI2/infobi-2025"

echo -e "${BLUE}📦 Step 1: Setup Backend${NC}"
cd "$BASE_DIR/apps/backend"

# Installa dipendenze Python
echo "Installazione dipendenze Python..."
pip install -q -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dipendenze backend installate${NC}"
else
    echo -e "${YELLOW}⚠️  Errore installazione backend${NC}"
    exit 1
fi

# Inizializza database
echo "Inizializzazione database..."
python init_db.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database inizializzato${NC}"
else
    echo -e "${YELLOW}⚠️  Errore inizializzazione database${NC}"
fi

echo ""
echo -e "${BLUE}📦 Step 2: Setup Frontend${NC}"
cd "$BASE_DIR/apps/web"

# Installa dipendenze Node
echo "Installazione dipendenze Node..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dipendenze frontend installate${NC}"
else
    echo -e "${YELLOW}⚠️  Errore installazione frontend${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Setup completato!${NC}"
echo ""
echo "📋 Comandi disponibili:"
echo ""
echo "Backend (porta 8090):"
echo "  cd apps/backend && python main.py"
echo ""
echo "Frontend (porta 3000):"
echo "  cd apps/web && npm run dev"
echo ""
echo "🔑 Credenziali default:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "📚 Documentazione:"
echo "  API: http://localhost:8090/docs"
echo "  App: http://localhost:3000"
echo ""
