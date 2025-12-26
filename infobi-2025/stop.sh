#!/bin/bash

# Script per fermare i servizi

if [ -f /tmp/infobi-pids.txt ]; then
    PIDS=$(cat /tmp/infobi-pids.txt)
    echo "🛑 Fermando servizi InfoBi..."
    kill $PIDS 2>/dev/null
    rm /tmp/infobi-pids.txt
    echo "✅ Servizi fermati"
else
    echo "⚠️  Nessun servizio in esecuzione"
fi
