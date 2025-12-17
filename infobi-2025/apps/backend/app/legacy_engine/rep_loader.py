import json
from pathlib import Path
from app.core.config import settings

class RepLoader:
    @staticmethod
    def load_config(report_name: str) -> dict:
        print(f"\n--- DEBUG REP LOADER ---")
        print(f"1. Richiesto report: {report_name}")
        
        # Pulisce il nome e aggiunge .rep
        clean_path = Path(report_name)
        if not clean_path.name.endswith(".rep"):
            clean_path = clean_path.with_suffix(".rep")
            
        # Percorso 1: Struttura identica alla query (es. reports/vendite/file.rep)
        path_principale = (settings.REPORTS_PATH / clean_path).resolve()
        print(f"2. Cerco in (Principale): {path_principale}")
        
        # Percorso 2: Fallback nella root (es. reports/file.rep)
        path_fallback = (settings.REPORTS_PATH / clean_path.name).resolve()
        print(f"3. Cerco in (Fallback):  {path_fallback}")

        final_path = None
        if path_principale.exists():
            final_path = path_principale
            print("-> TROVATO nel percorso principale!")
        elif path_fallback.exists():
            final_path = path_fallback
            print("-> TROVATO nel percorso fallback!")
        else:
            print("-> NON TROVATO DA NESSUNA PARTE. Restituisco config vuoto.")
            print(f"   (Controlla che il file sia nella cartella: {settings.REPORTS_PATH})")
            return {}

        try:
            with open(final_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Verifica rapida se il JSON è valido per noi
                if "initialConfig" in data:
                     print("-> JSON valido: Trovata chiave 'initialConfig'")
                else:
                     print("-> ATTENZIONE: Il JSON non contiene 'initialConfig'. La griglia non saprà raggruppare.")
                return data
        except Exception as e:
            print(f"-> ERRORE lettura JSON: {e}")
            return {}

rep_loader = RepLoader()