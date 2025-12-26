# Changelog - InfoBi Platform

## [2.0.0] - 2025-12-26

### 🎉 Rilascio Iniziale Platform 2.0

#### ✨ Nuove Funzionalità

**Backend:**
- ✅ Multi-DB Engine con supporto SQL Server, PostgreSQL, MySQL
- ✅ Trasmissione dati Apache Arrow per performance estreme
- ✅ Autenticazione JWT con ruoli Admin/User
- ✅ Cifratura credenziali database con AES (Fernet)
- ✅ Database interno SQLite per persistenza
- ✅ Export Excel con mantenimento gerarchia pivot
- ✅ API REST completa e documentata (OpenAPI/Swagger)
- ✅ Connection pooling e gestione dinamica driver
- ✅ Sanificazione automatica tipi dati (Decimal→Float, DateTime→ISO)

**Frontend:**
- ✅ UI moderna con TailwindCSS e shadcn/ui
- ✅ SQL Editor con Monaco (syntax highlighting, autocomplete)
- ✅ Data Viewer con Perspective.js (pivot interattive)
- ✅ Gestione Server UI (solo Admin)
- ✅ Sistema autenticazione completo
- ✅ Dashboard con tabs per separazione funzionalità
- ✅ State management con Zustand
- ✅ Supporto Apache Arrow lato client

**Security:**
- ✅ Password hashing con bcrypt
- ✅ JWT con scadenza configurabile (default 8h)
- ✅ Credenziali DB cifrate in database
- ✅ CORS configurato
- ✅ Role-based access control

**DevOps:**
- ✅ Script setup automatico
- ✅ Script start/stop servizi
- ✅ Documentazione completa (README, ARCHITECTURE, QUICKSTART)
- ✅ File .env.example per configurazione
- ✅ Database auto-inizializzazione

#### 📝 Modelli Dati

**User:**
- id, username, email, hashed_password
- full_name, role (admin/user)
- is_active, created_at

**DBServer:**
- id, name, db_type (mssql/postgresql/mysql)
- server, database, port
- username_encrypted, password_encrypted (cifrati)
- driver, is_active, created_at, updated_at

**Report:**
- id, name, description, category
- sql_query, server_id
- perspective_layout (JSON config)
- owner_id, is_public, is_active
- created_at, updated_at

#### 🎯 API Endpoints

**Auth:**
- POST `/api/v1/auth/login` - Login
- POST `/api/v1/auth/register` - Registrazione
- GET `/api/v1/auth/me` - User info

**Servers (Admin only):**
- GET `/api/v1/servers/` - Lista server
- POST `/api/v1/servers/` - Crea server
- PUT `/api/v1/servers/{id}` - Aggiorna server
- DELETE `/api/v1/servers/{id}` - Elimina server
- POST `/api/v1/servers/{id}/test` - Test connessione

**Reports:**
- GET `/api/v1/reports/` - Lista report
- POST `/api/v1/reports/` - Crea report
- PUT `/api/v1/reports/{id}` - Aggiorna report
- DELETE `/api/v1/reports/{id}` - Elimina report
- POST `/api/v1/reports/execute` - Esegue query
- GET `/api/v1/reports/{id}/execute` - Esegue report
- POST `/api/v1/reports/{id}/export/excel` - Export Excel

#### 🛠️ Tech Stack

**Backend:**
- FastAPI 0.109+
- SQLAlchemy 2.0
- PyArrow 14.0
- PyODBC, PyMySQL, Psycopg2
- Python-JOSE (JWT)
- Cryptography (Fernet)
- OpenPyXL

**Frontend:**
- Next.js 16 (App Router)
- React 19
- Perspective.js 3.1
- Monaco Editor 4.6
- Apache Arrow (JS)
- Zustand
- TailwindCSS + shadcn/ui

#### 📋 Credenziali Default

- Username: `admin`
- Password: `admin123`

#### 🔧 Configurazione

**Backend** (.env):
```
JWT_SECRET_KEY=your-secret-key
DB_ENCRYPTION_KEY=your-encryption-key
```

**Frontend** (.env.local):
```
NEXT_PUBLIC_API_URL=http://localhost:8090
```

#### 🐛 Bug Fix

Nessun bug noto al rilascio iniziale.

#### ⚠️ Breaking Changes

N/A - Prima release

#### 📚 Documentazione

- README.md - Overview e setup
- ARCHITECTURE.md - Architettura dettagliata
- QUICKSTART.md - Guida rapida 5 minuti
- apps/backend/README.md - Documentazione backend
- apps/web/README.md - Documentazione frontend

#### 🙏 Credits

Sviluppato con ❤️ usando tecnologie open source di qualità enterprise.

---

## Roadmap Futura

### [2.1.0] - Planned
- [ ] Dashboard KPI personalizzabili
- [ ] Schedulazione report automatica
- [ ] Notifiche email
- [ ] Audit log completo
- [ ] Cache query Redis
- [ ] Supporto MongoDB
- [ ] Dark mode completo
- [ ] Mobile responsive ottimizzato
- [ ] Webhook integration
- [ ] API rate limiting

### [2.2.0] - Planned
- [ ] Collaborative editing
- [ ] Report versioning
- [ ] Data lineage tracking
- [ ] Advanced permissions (row-level security)
- [ ] SSO integration (SAML, OAuth)
- [ ] Multi-tenancy support
- [ ] Custom plugins system
- [ ] AI-powered query suggestions
- [ ] Real-time data streaming
- [ ] Embedded BI (iframe/SDK)

---

**Note**: Versione semantica: MAJOR.MINOR.PATCH
