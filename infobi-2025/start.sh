#!/bin/bash

# Script per avviare Backend e Frontend in parallelo

echo "🚀 Avvio InfoBi Platform..."

BASE_DIR="/workspaces/INFOBI2/infobi-2025"

# Avvia backend in background
echo "▶️  Avvio Backend (porta 8090)..."
cd "$BASE_DIR/apps/backend"
python main.py > /tmp/infobi-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Attendi che il backend sia pronto
sleep 3

# Avvia frontend in background
echo "▶️  Avvio Frontend (porta 3000)..."
cd "$BASE_DIR/apps/web"
npm run dev > /tmp/infobi-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Servizi avviati!"
echo ""
echo "📍 URLs:"
echo "   Backend API: http://localhost:8090"
echo "   API Docs:    http://localhost:8090/docs"
echo "   Frontend:    http://localhost:3000"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f /tmp/infobi-backend.log"
echo "   Frontend: tail -f /tmp/infobi-frontend.log"
echo ""
echo "🛑 Per fermare i servizi:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Salva PID per stop script
echo "$BACKEND_PID $FRONTEND_PID" > /tmp/infobi-pids.txt

# Wait per entrambi i processi
wait
