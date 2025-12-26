# 📝 NOTE IMPORTANTI - InfoBi Platform 2.0

## ⚠️ Prima dell'Uso

### 1. Installare Dipendenze

**Backend:**
```bash
cd apps/backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd apps/web
npm install
```

**Gli errori TypeScript attuali sono normali** - scompariranno dopo `npm install`.

### 2. Inizializzare Database

```bash
cd apps/backend
python init_db.py
```

Questo crea:
- Database SQLite in `apps/backend/data/infobi.db`
- Utente admin (username: admin, password: admin123)

### 3. Configurare Environment (Opzionale)

**Backend - `.env`:**
```bash
cp apps/backend/.env.example apps/backend/.env
# Modifica le chiavi per produzione!
```

**Frontend - `.env.local`:**
```bash
cp apps/web/.env.local.example apps/web/.env.local
```

## 🔐 Security - IMPORTANTE

### In Produzione DEVI Cambiare:

1. **JWT Secret Key**
```bash
# Genera una chiave sicura
python -c "import secrets; print(secrets.token_hex(32))"
```

2. **DB Encryption Key**
```bash
# Genera chiave Fernet
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

3. **Admin Password**
```python
# Cambia password admin dopo primo login
# Via API o direttamente nel database
```

## 🗄️ Database Supportati

### SQL Server
- Driver: `ODBC Driver 17 for SQL Server` (o `ODBC Driver 18`)
- Verifica installazione: `odbcinst -q -d`
- Install su Linux: 
  ```bash
  curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
  curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list > /etc/apt/sources.list.d/mssql-release.list
  apt-get update
  ACCEPT_EULA=Y apt-get install -y msodbcsql17
  ```

### PostgreSQL
- Driver: `psycopg2-binary` (già in requirements.txt)
- Porta default: 5432

### MySQL
- Driver: `pymysql` (già in requirements.txt)
- Porta default: 3306

## 🚀 Performance Tips

### 1. Apache Arrow
- Usa formato `arrow` per dataset grandi (>10k righe)
- Frontend: Perspective carica Arrow nativamente
- Risparmio banda: ~60% vs JSON

### 2. Connection Pooling
- SQLAlchemy usa NullPool per sicurezza
- Per produzione considera pool persistente
- Config in `database.py`

### 3. Perspective.js
- Client-side processing = zero carico server
- Supporta milioni di righe
- Lazy loading automatico

## 🐛 Troubleshooting Comuni

### Backend non parte

**Problema: ModuleNotFoundError**
```bash
# Soluzione: installa dipendenze
pip install -r requirements.txt
```

**Problema: Porta 8090 occupata**
```bash
# Trova processo
lsof -i :8090
# Killa processo
kill <PID>
```

### Frontend non parte

**Problema: Module not found**
```bash
# Soluzione: installa dipendenze
npm install
```

**Problema: Porta 3000 occupata**
```bash
# Usa porta alternativa
npm run dev -- -p 3001
```

### Errore connessione DB

**SQL Server:**
- Verifica driver ODBC installato
- Controlla TrustServerCertificate=yes in config
- Testa: `sqlcmd -S server -U user -P pass`

**PostgreSQL:**
- Verifica pg_hba.conf permetta connessioni
- Controlla firewall porta 5432

**MySQL:**
- Verifica user ha permessi da host remoto
- Controlla bind-address in my.cnf

### Perspective non carica

**Problema: Black screen**
```
Soluzione: 
1. Apri DevTools (F12)
2. Controlla console per errori
3. Verifica formato dati (array di oggetti)
4. Ricarica pagina (Ctrl+R)
```

**Problema: Memory error**
```
Soluzione: Dataset troppo grande
- Limita risultati query (LIMIT/TOP)
- Usa aggregazioni lato DB
- Filtra dati prima di caricare
```

## 📊 Limitazioni Note

### Dimensione Dati
- **Raccomandato**: < 100k righe in Perspective
- **Max teorico**: 10M righe (dipende da RAM client)
- **Soluzione**: Pre-aggregazione lato DB

### Concurrent Users
- **SQLite interno**: Single-writer
- **Soluzione produzione**: Migra a PostgreSQL per metadata

### Browser Support
- **Perspective.js**: Richiede browser moderni
- **Supportati**: Chrome, Firefox, Edge, Safari (recent)
- **Non supportato**: IE11

## 🔄 Aggiornamenti

### Aggiornare Backend
```bash
cd apps/backend
pip install -r requirements.txt --upgrade
```

### Aggiornare Frontend
```bash
cd apps/web
npm update
```

### Backup Database
```bash
# SQLite interno
cp apps/backend/data/infobi.db apps/backend/data/infobi.db.backup

# Con timestamp
cp apps/backend/data/infobi.db apps/backend/data/infobi.$(date +%Y%m%d_%H%M%S).db
```

## 🌐 CORS in Produzione

Nel file `main.py`, aggiorna gli origins:

```python
origins = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
```

## 📈 Monitoraggio

### Logs Backend
```bash
# Redirect output
python main.py > logs/backend.log 2>&1

# Con rotazione
python main.py | tee -a logs/backend_$(date +%Y%m%d).log
```

### Logs Frontend
```bash
# Next.js logs automatici in .next/
tail -f .next/trace
```

### Metrics
```python
# Aggiungi prometheus-client in requirements.txt
# Instrumenta endpoints con decoratori
```

## 🔒 Hardening Produzione

### 1. Firewall
```bash
# Permetti solo porte necessarie
ufw allow 8090/tcp  # Backend
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 2. Rate Limiting
```python
# Aggiungi slowapi in requirements.txt
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

### 3. HTTPS
```nginx
# nginx reverse proxy
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
    
    location /api/ {
        proxy_pass http://localhost:8090;
    }
}
```

### 4. Process Manager
```bash
# Usa gunicorn per backend
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app

# Usa PM2 per frontend
npm install -g pm2
pm2 start npm --name "infobi-web" -- start
```

## 📞 Support

### Risorse
- GitHub Issues: (configura repo)
- Documentazione: Consulta file *.md
- API Docs: http://localhost:8090/docs

### Debug Mode
```bash
# Backend verbose
PYTHONPATH=. python -m pdb main.py

# Frontend debug
npm run dev -- --debug
```

## ✅ Checklist Pre-Produzione

- [ ] Cambia JWT_SECRET_KEY
- [ ] Cambia DB_ENCRYPTION_KEY  
- [ ] Cambia password admin
- [ ] Configura HTTPS
- [ ] Aggiorna CORS origins
- [ ] Setup backup automatici
- [ ] Configura monitoring
- [ ] Test carico performance
- [ ] Documenta configurazione server
- [ ] Setup log rotation
- [ ] Configura firewall
- [ ] Rate limiting attivo
- [ ] Health checks configurati
- [ ] Disaster recovery plan

---

**Per supporto tecnico, consulta:**
- `ARCHITECTURE.md` - Architettura dettagliata
- `QUICKSTART.md` - Guide rapide
- `README.md` - Overview generale
