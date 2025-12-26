/** 
 * Script di inizializzazione database
 * Da eseguire al primo avvio del backend
 */

import sys
sys.path.append('/workspaces/INFOBI2/infobi-2025/apps/backend')

from app.core.models import init_db, create_default_admin

if __name__ == "__main__":
    print("🔧 Inizializzazione database InfoBi...")
    init_db()
    create_default_admin()
    print("✅ Inizializzazione completata!")
