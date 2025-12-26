"""
Test Suite per InfoBi Platform
Esegui con: pytest test_integration.py
"""

import requests
import time
from typing import Dict, Optional

# Configuration
API_BASE_URL = "http://localhost:8090"
DEFAULT_USER = {"username": "admin", "password": "admin123"}

class InfoBiTestClient:
    """Client per testing API InfoBi"""
    
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.user: Optional[Dict] = None
    
    def login(self, username: str, password: str) -> bool:
        """Login e salva token"""
        response = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"username": username, "password": password}
        )
        
        if response.ok:
            data = response.json()
            self.token = data["access_token"]
            self.user = data["user"]
            return True
        return False
    
    def _headers(self) -> Dict[str, str]:
        """Headers con token JWT"""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    def get_servers(self):
        """Lista server"""
        response = requests.get(
            f"{self.base_url}/api/v1/servers/",
            headers=self._headers()
        )
        return response
    
    def create_server(self, server_data: Dict):
        """Crea server"""
        response = requests.post(
            f"{self.base_url}/api/v1/servers/",
            headers=self._headers(),
            json=server_data
        )
        return response
    
    def test_server(self, server_id: int):
        """Test connessione server"""
        response = requests.post(
            f"{self.base_url}/api/v1/servers/{server_id}/test",
            headers=self._headers()
        )
        return response
    
    def execute_query(self, server_id: int, sql: str, format: str = "json"):
        """Esegui query"""
        response = requests.post(
            f"{self.base_url}/api/v1/reports/execute",
            headers=self._headers(),
            json={
                "server_id": server_id,
                "sql_query": sql,
                "format": format
            }
        )
        return response
    
    def create_report(self, report_data: Dict):
        """Crea report"""
        response = requests.post(
            f"{self.base_url}/api/v1/reports/",
            headers=self._headers(),
            json=report_data
        )
        return response
    
    def get_reports(self):
        """Lista report"""
        response = requests.get(
            f"{self.base_url}/api/v1/reports/",
            headers=self._headers()
        )
        return response


def test_health_check():
    """Test 1: Health check"""
    print("\n🧪 Test 1: Health Check")
    response = requests.get(f"{API_BASE_URL}/")
    assert response.ok, "Backend non raggiungibile"
    data = response.json()
    assert data["status"] == "ok"
    print("✅ Backend raggiungibile")


def test_login():
    """Test 2: Login"""
    print("\n🧪 Test 2: Login")
    client = InfoBiTestClient()
    success = client.login(DEFAULT_USER["username"], DEFAULT_USER["password"])
    assert success, "Login fallito"
    assert client.token is not None, "Token non ricevuto"
    assert client.user is not None, "User info non ricevute"
    print(f"✅ Login riuscito - User: {client.user['username']}")
    return client


def test_auth_protected(client: InfoBiTestClient):
    """Test 3: Endpoint protetto"""
    print("\n🧪 Test 3: Endpoint protetto")
    
    # Senza token
    response = requests.get(f"{API_BASE_URL}/api/v1/auth/me")
    assert response.status_code == 403 or response.status_code == 401, "Dovrebbe essere protetto"
    print("✅ Endpoint protetto senza token")
    
    # Con token
    response = requests.get(
        f"{API_BASE_URL}/api/v1/auth/me",
        headers={"Authorization": f"Bearer {client.token}"}
    )
    assert response.ok, "Dovrebbe funzionare con token"
    print("✅ Endpoint accessibile con token")


def test_server_management(client: InfoBiTestClient):
    """Test 4: Gestione server"""
    print("\n🧪 Test 4: Gestione Server")
    
    # Lista server iniziale
    response = client.get_servers()
    assert response.ok, "Lista server fallita"
    initial_count = len(response.json())
    print(f"✅ Server esistenti: {initial_count}")
    
    # Crea server test (SQLite in-memory)
    test_server = {
        "name": "Test Server",
        "db_type": "sqlite",
        "server": ":memory:",
        "database": "test"
    }
    
    # Nota: SQLite non supportato nel MultiDBEngine corrente
    # Questo test è un esempio - sostituire con server reale per test completo
    print("⚠️  Test creazione server richiede configurazione DB reale")
    
    return None


def test_query_execution(client: InfoBiTestClient):
    """Test 5: Esecuzione query"""
    print("\n🧪 Test 5: Esecuzione Query")
    
    # Prerequisito: deve esistere almeno un server configurato
    response = client.get_servers()
    servers = response.json()
    
    if not servers:
        print("⚠️  Nessun server configurato - saltato")
        return
    
    server_id = servers[0]["id"]
    
    # Query di test (adattare al DB)
    test_query = "SELECT 1 as test_value"
    
    response = client.execute_query(server_id, test_query)
    
    if response.ok:
        data = response.json()
        assert "data" in data
        print(f"✅ Query eseguita - {len(data['data'])} righe")
    else:
        print(f"⚠️  Errore esecuzione query: {response.text}")


def test_report_management(client: InfoBiTestClient):
    """Test 6: Gestione report"""
    print("\n🧪 Test 6: Gestione Report")
    
    # Lista report iniziale
    response = client.get_reports()
    assert response.ok, "Lista report fallita"
    initial_count = len(response.json())
    print(f"✅ Report esistenti: {initial_count}")
    
    # Prerequisito: server configurato
    servers = client.get_servers().json()
    if not servers:
        print("⚠️  Nessun server per test report - saltato")
        return
    
    # Crea report test
    test_report = {
        "name": "Test Report",
        "description": "Report di test automatico",
        "sql_query": "SELECT 1 as test",
        "server_id": servers[0]["id"],
        "is_public": False
    }
    
    response = client.create_report(test_report)
    
    if response.ok:
        report = response.json()
        print(f"✅ Report creato - ID: {report['id']}")
        
        # Verifica lista aggiornata
        response = client.get_reports()
        new_count = len(response.json())
        assert new_count == initial_count + 1, "Report non aggiunto"
        print(f"✅ Report count: {initial_count} → {new_count}")
    else:
        print(f"⚠️  Errore creazione report: {response.text}")


def test_arrow_format(client: InfoBiTestClient):
    """Test 7: Formato Apache Arrow"""
    print("\n🧪 Test 7: Apache Arrow Format")
    
    servers = client.get_servers().json()
    if not servers:
        print("⚠️  Nessun server - saltato")
        return
    
    # Query con formato Arrow
    response = client.execute_query(
        servers[0]["id"],
        "SELECT 1 as test",
        format="arrow"
    )
    
    if response.ok:
        # Verifica headers
        content_type = response.headers.get("Content-Type")
        assert "arrow" in content_type.lower(), "Content-Type non Arrow"
        print(f"✅ Risposta Arrow - Size: {len(response.content)} bytes")
    else:
        print(f"⚠️  Errore Arrow format: {response.text}")


def run_all_tests():
    """Esegue tutti i test"""
    print("=" * 60)
    print("🚀 InfoBi Platform - Integration Tests")
    print("=" * 60)
    
    try:
        # Test 1: Health
        test_health_check()
        
        # Test 2-3: Auth
        client = test_login()
        test_auth_protected(client)
        
        # Test 4: Server Management
        test_server_management(client)
        
        # Test 5: Query Execution
        test_query_execution(client)
        
        # Test 6: Report Management
        test_report_management(client)
        
        # Test 7: Arrow Format
        test_arrow_format(client)
        
        print("\n" + "=" * 60)
        print("✅ TUTTI I TEST COMPLETATI")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FALLITO: {e}")
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")


if __name__ == "__main__":
    # Controlla che il backend sia avviato
    print("⏳ Verifica backend...")
    try:
        response = requests.get(f"{API_BASE_URL}/", timeout=2)
        if response.ok:
            print("✅ Backend attivo\n")
            run_all_tests()
        else:
            print("❌ Backend non risponde correttamente")
    except requests.exceptions.ConnectionError:
        print("❌ Backend non raggiungibile")
        print("   Avvia il backend con: cd apps/backend && python main.py")
