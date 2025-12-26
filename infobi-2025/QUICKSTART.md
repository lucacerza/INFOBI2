# 🚀 GUIDA RAPIDA - InfoBi Platform 2.0

## Setup Iniziale (5 minuti)

### Metodo 1: Script Automatico
```bash
cd /workspaces/INFOBI2/infobi-2025
./setup.sh
```

### Metodo 2: Manuale

**Backend:**
```bash
cd apps/backend
pip install -r requirements.txt
python init_db.py
```

**Frontend:**
```bash
cd apps/web
npm install
```

## Avvio Applicazione

### Opzione A: Avvio Separato

**Terminal 1 - Backend:**
```bash
cd apps/backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```

### Opzione B: Script Unificato
```bash
./start.sh
```

## 🎯 Test Funzionalità

### 1. Login (30 secondi)
1. Apri http://localhost:3000
2. Login con:
   - Username: `admin`
   - Password: `admin123`

### 2. Configura Server Database (2 minuti)

**Per SQL Server:**
1. Tab "Gestione Server"
2. Click "Nuovo Server"
3. Compila:
   - Nome: `SQL Server Production`
   - Tipo: `SQL Server`
   - Server: `localhost` o `192.168.x.x`
   - Database: `nome_database`
   - Username: `sa`
   - Password: `***`
   - Driver: `ODBC Driver 17 for SQL Server`
4. Click "Salva"
5. Click "Test" per verificare connessione

**Per PostgreSQL:**
1. Tipo: `PostgreSQL`
2. Server: `localhost`
3. Database: `mydb`
4. Porta: `5432`
5. Username/Password

**Per MySQL:**
1. Tipo: `MySQL`
2. Server: `localhost`
3. Database: `mydb`
4. Porta: `3306`
5. Username/Password

### 3. Crea Report SQL (3 minuti)

1. Tab "SQL Editor"
2. Seleziona server dal dropdown
3. Scrivi query SQL:
```sql
SELECT 
    ProductName,
    Category,
    SUM(Quantity) as TotalQty,
    SUM(Amount) as TotalAmount
FROM Sales
WHERE Year = 2024
GROUP BY ProductName, Category
```
4. Click "Esegui"
5. Vedi risultati in "Data Viewer"
6. Click "Salva" per salvare come report

### 4. Analizza con Perspective (2 minuti)

1. Tab "Data Viewer"
2. Drag & Drop colonne:
   - **Row Pivot**: Category, ProductName
   - **Columns**: (vuoto per flat table)
   - **Values**: TotalQty (sum), TotalAmount (sum)
3. Cambia visualizzazione:
   - Tabella (default)
   - Bar Chart
   - Line Chart
   - Heatmap
4. Export Excel con gerarchia

### 5. Gestione Report (1 minuto)

1. Tab "Report"
2. Vedi lista report salvati
3. Click su un report per visualizzarlo
4. Export in Excel con pivot

## 🔧 Test API (con curl)

### Login
```bash
curl -X POST http://localhost:8090/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Risposta:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {...}
}
```

### Lista Server (Admin)
```bash
TOKEN="your-jwt-token"

curl -X GET http://localhost:8090/api/v1/servers/ \
  -H "Authorization: Bearer $TOKEN"
```

### Esegui Query
```bash
curl -X POST http://localhost:8090/api/v1/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": 1,
    "sql_query": "SELECT * FROM Products LIMIT 10",
    "format": "json"
  }'
```

### Esegui Query con Arrow
```bash
curl -X POST http://localhost:8090/api/v1/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": 1,
    "sql_query": "SELECT * FROM Products",
    "format": "arrow"
  }' \
  --output data.arrow
```

## 📊 Test Perspective.js

### Test con dati demo:
```javascript
// Nel browser console
const demoData = [
  { region: 'North', product: 'A', sales: 1000, quantity: 50 },
  { region: 'North', product: 'B', sales: 1500, quantity: 75 },
  { region: 'South', product: 'A', sales: 800, quantity: 40 },
  { region: 'South', product: 'B', sales: 1200, quantity: 60 }
]

// Perspective carica automaticamente i dati
```

## 🐛 Troubleshooting

### Backend non si avvia
```bash
# Verifica dipendenze
pip list | grep -E "fastapi|sqlalchemy|pyarrow"

# Verifica porta
lsof -i :8090

# Controlla log
tail -f /tmp/infobi-backend.log
```

### Frontend non si avvia
```bash
# Reinstalla dipendenze
rm -rf node_modules package-lock.json
npm install

# Verifica porta
lsof -i :3000

# Controlla log
tail -f /tmp/infobi-frontend.log
```

### Errore connessione DB
1. Verifica driver ODBC installato:
   ```bash
   odbcinst -q -d
   ```
2. Test connessione diretta:
   ```bash
   sqlcmd -S server -U user -P password -Q "SELECT 1"
   ```
3. Controlla firewall/network

### Perspective non carica
1. Apri DevTools (F12)
2. Controlla errori console
3. Verifica formato dati (deve essere array di oggetti)
4. Reload pagina (Ctrl+R)

## 📝 Query SQL di Test

### SQL Server
```sql
-- Test connessione
SELECT @@VERSION as ServerVersion, DB_NAME() as DatabaseName

-- Dati sample
SELECT TOP 10 * FROM sys.tables
```

### PostgreSQL
```sql
-- Test connessione
SELECT version(), current_database()

-- Dati sample
SELECT * FROM information_schema.tables LIMIT 10
```

### MySQL
```sql
-- Test connessione
SELECT VERSION(), DATABASE()

-- Dati sample
SELECT * FROM information_schema.tables LIMIT 10
```

## 🎨 Personalizzazione UI

### Cambia tema Perspective
```typescript
// In PerspectiveViewer.tsx
viewer.restore({
  theme: 'Pro Dark' // o 'Pro Light'
})
```

### Cambia colori TailwindCSS
```javascript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: {...}
    }
  }
}
```

## 📚 Risorse Aggiuntive

- **API Docs**: http://localhost:8090/docs
- **Perspective Docs**: https://perspective.finos.org
- **Monaco Editor**: https://microsoft.github.io/monaco-editor/
- **FastAPI**: https://fastapi.tiangolo.com
- **Next.js**: https://nextjs.org/docs

## 🚀 Deploy Produzione

### Backend
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8090
```

### Frontend
```bash
npm run build
npm start
```

### Docker (opzionale)
```dockerfile
# Dockerfile backend
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]

# Dockerfile frontend
FROM node:20
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## ✅ Checklist Produzione

- [ ] Cambia JWT_SECRET_KEY
- [ ] Cambia DB_ENCRYPTION_KEY
- [ ] Configura HTTPS
- [ ] Backup database SQLite
- [ ] Configura CORS production URLs
- [ ] Setup reverse proxy (nginx)
- [ ] Monitoring e logging
- [ ] Backup automatici
- [ ] Rate limiting

---

**Hai bisogno di aiuto?** Consulta `ARCHITECTURE.md` per dettagli tecnici completi.
