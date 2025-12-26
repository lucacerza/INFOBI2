# ARCHITETTURA INFOBI PLATFORM 2.0

## 📐 Overview Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Login/     │  │  Dashboard   │  │   Admin      │      │
│  │     Auth     │  │   + Viewer   │  │  Panel       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SQL Editor   │  │ Perspective  │  │   Server     │      │
│  │  (Monaco)    │  │  Viewer      │  │  Manager     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST + Apache Arrow
                            │ JWT Authentication
                            │
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API ROUTERS                              │   │
│  │  • Auth Router (Login, Register, JWT)                │   │
│  │  • Servers Router (CRUD, Test Connection)            │   │
│  │  • Reports Router (CRUD, Execute, Export)            │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              CORE MODULES                             │   │
│  │  • Security (JWT, Fernet Encryption)                 │   │
│  │  • Database (Multi-DB Engine)                        │   │
│  │  • Arrow Utils (Data Serialization)                  │   │
│  │  • Models (SQLAlchemy ORM)                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           INTERNAL DATABASE (SQLite)                  │   │
│  │  • Users (username, password_hash, role)             │   │
│  │  • DBServers (config, encrypted credentials)         │   │
│  │  • Reports (SQL, layout, owner)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ SQLAlchemy + PyODBC/PyMySQL
                            │
┌─────────────────────────────────────────────────────────────┐
│                   TARGET DATABASES                           │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  SQL Server  │  │  PostgreSQL  │  │    MySQL     │      │
│  │  (PyODBC)    │  │ (Psycopg2)   │  │  (PyMySQL)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Security Layer

### 1. Autenticazione JWT
```
User Login → Backend validates → JWT Token (8h expiry)
↓
Token includes: { user_id, username, role, email }
↓
Every API call: Authorization: Bearer <token>
```

### 2. Cifratura Credenziali DB
```
Admin adds DB Server
↓
Username/Password → Fernet.encrypt (AES-256)
↓
Stored in SQLite (encrypted)
↓
On query execution → Fernet.decrypt → Connect to DB
```

### 3. Role-Based Access Control
- **Admin**: Full access (server management, all reports)
- **User**: Limited access (own reports, public reports)

## 🔄 Data Flow - Query Execution

```
1. User selects server + writes SQL in Monaco Editor
                    ↓
2. Frontend → POST /api/v1/reports/execute
                    ↓
3. Backend verifies JWT token
                    ↓
4. Retrieves server config from SQLite
                    ↓
5. Decrypts credentials (Fernet)
                    ↓
6. MultiDBEngine creates connection (SQLAlchemy)
                    ↓
7. Executes SQL query
                    ↓
8. Sanitizes data types (Decimal→Float, DateTime→ISO)
                    ↓
9. Converts to Apache Arrow format
                    ↓
10. Streams back to frontend (bytes)
                    ↓
11. Frontend decodes Arrow → Perspective.js
                    ↓
12. User interacts with pivot table
```

## 📊 Apache Arrow Integration

### Backend (Python)
```python
# Converti dati in Arrow Table
table = pa.Table.from_pylist(data)

# Serializza in IPC Stream
sink = pa.BufferOutputStream()
with pa.ipc.new_stream(sink, table.schema) as writer:
    writer.write_table(table)

# Invia bytes via HTTP
return Response(content=bytes, media_type="application/vnd.apache.arrow.stream")
```

### Frontend (TypeScript)
```typescript
// Ricevi Arrow bytes
const arrayBuffer = await response.arrayBuffer()

// Carica in Perspective
const perspective = await import('@finos/perspective')
const table = await perspective.table(arrayBuffer)
viewer.load(table)
```

## 💾 Database Schema

### Users
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',  -- 'admin' | 'user'
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME
);
```

### DBServers
```sql
CREATE TABLE db_servers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    db_type VARCHAR(20) NOT NULL,  -- 'mssql' | 'postgresql' | 'mysql'
    server VARCHAR(255) NOT NULL,
    database VARCHAR(100) NOT NULL,
    port INTEGER,
    username_encrypted TEXT,  -- CIFRATO con Fernet
    password_encrypted TEXT,  -- CIFRATO con Fernet
    driver VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME,
    updated_at DATETIME
);
```

### Reports
```sql
CREATE TABLE reports (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    sql_query TEXT NOT NULL,
    server_id INTEGER REFERENCES db_servers(id),
    perspective_layout TEXT,  -- JSON config Perspective
    config_json TEXT,  -- Extra config
    owner_id INTEGER REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME,
    updated_at DATETIME
);
```

## 🎨 Frontend Architecture

### Component Tree
```
App (Next.js App Router)
├── page.tsx (Home/Redirect)
├── login/
│   └── page.tsx (LoginForm)
└── dashboard/
    └── page.tsx (Main Dashboard)
        ├── <Tabs>
        │   ├── Reports List
        │   ├── SQL Editor (Monaco)
        │   ├── Data Viewer (Perspective)
        │   └── Server Manager (Admin only)
        └── Header (User info, Logout)
```

### State Management
```typescript
// Zustand store
useAuthStore: {
  token: string | null
  user: User | null
  setAuth(), logout(), isAdmin()
}

// Local state per componenti
- SQLEditor: sql, selectedServer, isExecuting
- PerspectiveViewer: data, config, isLoaded
- ServerManager: servers, formData, testResult
```

## 🚀 Performance Optimizations

1. **Apache Arrow**: Trasmissione dati binaria ultra-veloce
2. **Connection Pooling**: SQLAlchemy con NullPool per sicurezza
3. **Client-side Processing**: Perspective.js elabora dati nel browser
4. **JWT Caching**: Token salvato in localStorage (8h expiry)
5. **Lazy Loading**: Monaco e Perspective caricati dinamicamente

## 🔧 Configuration Files

### Backend
- `requirements.txt` - Python dependencies
- `.env` - Environment variables (JWT, encryption keys)
- `main.py` - FastAPI app entry point
- `app/core/config.py` - Settings class

### Frontend
- `package.json` - Node dependencies
- `.env.local` - API URL
- `next.config.ts` - Next.js config
- `tailwind.config.ts` - TailwindCSS config

## 📝 API Response Formats

### JSON (Default)
```json
{
  "count": 1234,
  "data": [
    { "id": 1, "name": "Item 1", "value": 100.50 },
    { "id": 2, "name": "Item 2", "value": 200.75 }
  ]
}
```

### Apache Arrow (Binary)
```
Content-Type: application/vnd.apache.arrow.stream
[Binary IPC Stream Format]
```

## 🛡️ Security Best Practices

1. ✅ Password hashing con bcrypt
2. ✅ JWT con scadenza configurabile
3. ✅ Credenziali DB cifrate (AES-256)
4. ✅ SQL injection protection (parametrized queries)
5. ✅ CORS configurato
6. ✅ HTTPS raccomandato in produzione
7. ✅ Role-based access control

## 📚 Tech Stack Summary

### Backend
- **Framework**: FastAPI 0.109+
- **ORM**: SQLAlchemy 2.0
- **Auth**: python-jose (JWT), passlib (bcrypt)
- **Encryption**: cryptography (Fernet)
- **DB Drivers**: pyodbc, pymysql, psycopg2
- **Data**: pyarrow 14.0
- **Export**: openpyxl

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **State**: Zustand
- **Styling**: TailwindCSS + shadcn/ui
- **Data Viz**: Perspective.js 3.1
- **Code Editor**: Monaco Editor 4.6
- **Data Format**: apache-arrow (JS)

---

**InfoBi Platform 2.0** - Enterprise-grade BI solution with multi-database support
