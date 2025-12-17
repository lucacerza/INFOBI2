import aioodbc
import os
import re
import datetime
from decimal import Decimal
from typing import List, Dict, Any
from fastapi import HTTPException
from app.core.config import settings
from pathlib import Path

class LegacyQueryEngine:
    
    @staticmethod
    def _read_query_file(query_path_str: str) -> str:
        clean_path = Path(query_path_str)
        if not clean_path.name.endswith(".qry"):
            clean_path = clean_path.with_suffix(".qry")
            
        full_path = (settings.QUERIES_PATH / clean_path).resolve()
        
        if not full_path.is_relative_to(settings.QUERIES_PATH.resolve()):
            raise HTTPException(status_code=403, detail="Accesso negato.")
            
        if not full_path.exists():
            raise HTTPException(status_code=404, detail=f"Query '{clean_path}' non trovata")
            
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Errore lettura file: {str(e)}")

    @staticmethod
    async def execute(query_name: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        if params is None:
            params = {}

        # 1. Caricamento Query Base
        raw_sql = LegacyQueryEngine._read_query_file(query_name)
        final_query = raw_sql
        sql_parameters = []

        # 2. Gestione Codice Azienda (Sostituzione {{AZIENDA}})
        codazi = params.get('codazi', '')
        # Sanitizzazione base per evitare injection brutali sul nome tabella
        codazi_clean = re.sub(r'[^a-zA-Z0-9_]', '', codazi)
        final_query = final_query.replace('{{AZIENDA}}', codazi_clean)

        # --- LOGICA DI FILTRO (PORTING DA DB_UTILS) ---
        where_conditions = []
        costo_to_replace_with = None
        
        # Variabili per la manipolazione SQL dell'Esercizio
        add_esercizio_to_query = False
        esercizio_select_sql = ""
        esercizio_group_by_expression = ""

        year1 = params.get('year1')
        year2 = params.get('year2')
        date_from = params.get('date_from')
        date_to = params.get('date_to')

        # SCENARIO A: Filtro per Anni (Confronto)
        if year1 is not None and year2 is not None:
            try:
                where_conditions.append("year(mvdatdoc) IN (?, ?)")
                sql_parameters.extend([int(year1), int(year2)])
                
                # Logica costo complessa per confronto anni
                costo_to_replace_with = 'case when year(MVDATDOC)=year(getdate()) then costo else costoe end'
                
                # Preparazione iniezione colonna Esercizio
                esercizio_select_sql = "rtrim(str(year(MVDATDOC),4,0)) as Esercizio"
                esercizio_group_by_expression = "rtrim(str(year(MVDATDOC),4,0))"
                add_esercizio_to_query = True
            except ValueError:
                print(f"Errore conversione anni: {year1}, {year2}")

        # SCENARIO B: Filtro per Date (Range)
        elif date_from and date_to:
            # SQL Server vuole date in formato 'YYYY-MM-DD' o parametri datetime
            where_conditions.append("MVdatdoc >= CONVERT(DATETIME2, ?, 121) AND MVdatdoc <= CONVERT(DATETIME2, ?, 121)")
            sql_parameters.extend([date_from, date_to])
            costo_to_replace_with = 'COSTO' # Usa il campo costo standard

        # 3. Gestione {{_COSTO_}}
        if costo_to_replace_with:
            if '{{_COSTO_}}' in final_query:
                final_query = final_query.replace('{{_COSTO_}}', costo_to_replace_with)
        else:
            # Fallback se non ci sono filtri (evita crash SQL)
            if '{{_COSTO_}}' in final_query:
                final_query = final_query.replace('{{_COSTO_}}', '0')

        # 4. CHIRURGIA SQL: Iniezione colonna Esercizio nella SELECT
        if add_esercizio_to_query and esercizio_select_sql:
            from_pos = final_query.upper().find("FROM")
            if from_pos != -1:
                select_part = final_query[:from_pos].rstrip()
                rest_part = final_query[from_pos:]
                
                # Aggiunge la virgola se serve
                separator = " " if select_part.endswith(",") else ", "
                final_query = select_part + separator + esercizio_select_sql + " " + rest_part

        # 5. CHIRURGIA SQL: Costruzione WHERE dinamica
        if where_conditions:
            # Cerca dove inserire il WHERE (prima di GROUP BY o ORDER BY)
            group_by_pos = final_query.upper().find("GROUP BY")
            target_pos = group_by_pos if group_by_pos != -1 else final_query.upper().find("ORDER BY")
            
            condition_str = " AND ".join(where_conditions)
            
            if target_pos != -1:
                # Inserisci prima di GROUP/ORDER BY
                before = final_query[:target_pos]
                after = final_query[target_pos:]
                keyword = " AND " if "WHERE" in before.upper() else " WHERE "
                final_query = before.rstrip() + keyword + condition_str + " " + after
            else:
                # Alla fine della query
                keyword = " AND " if "WHERE" in final_query.upper() else " WHERE "
                final_query = final_query.rstrip() + keyword + condition_str

        # 6. CHIRURGIA SQL: Aggiornamento GROUP BY per Esercizio
        if add_esercizio_to_query and esercizio_group_by_expression:
            group_by_pos = final_query.upper().find("GROUP BY")
            if group_by_pos != -1:
                # Trova la fine del blocco GROUP BY (prima di ORDER BY o HAVING o fine stringa)
                order_pos = final_query.upper().find("ORDER BY", group_by_pos)
                having_pos = final_query.upper().find("HAVING", group_by_pos)
                
                end_pos = len(final_query)
                if order_pos != -1: end_pos = order_pos
                if having_pos != -1 and having_pos < end_pos: end_pos = having_pos
                
                group_block = final_query[group_by_pos:end_pos]
                # Aggiunge Esercizio al raggruppamento
                separator = "" if group_block.rstrip().endswith(",") else ", "
                
                final_query = (final_query[:end_pos].rstrip() + 
                               separator + esercizio_group_by_expression + " " + 
                               final_query[end_pos:])
            else:
                # Se non c'era GROUP BY, lo crea (raro nelle pivot ma possibile)
                # Qui bisognerebbe fare attenzione se c'è ORDER BY, lo accodiamo prima
                order_pos = final_query.upper().find("ORDER BY")
                if order_pos != -1:
                     final_query = final_query[:order_pos] + f" GROUP BY {esercizio_group_by_expression} " + final_query[order_pos:]
                else:
                     final_query += f" GROUP BY {esercizio_group_by_expression}"

        # DEBUG: Fondamentale per vedere cosa abbiamo combinato
        print(f"DEBUG SQL Eseguita:\n{final_query}")
        print(f"DEBUG Parametri: {sql_parameters}")

        # 7. ESECUZIONE
        dsn = settings.SQL_CONNECTION_STRING
        try:
            pool = await aioodbc.create_pool(dsn=dsn)
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(final_query, tuple(sql_parameters))
                    rows = await cur.fetchall()
                    
                    if cur.description:
                        columns = [col[0] for col in cur.description]
                        # Conversione Decimal -> Float per JSON serialization
                        results = []
                        for row in rows:
                            record = {}
                            for col_name, val in zip(columns, row):
                                if isinstance(val, Decimal):
                                    record[col_name] = float(val)
                                elif isinstance(val, (datetime.date, datetime.datetime)):
                                    record[col_name] = val.isoformat()
                                else:
                                    record[col_name] = val
                            results.append(record)
                    else:
                        results = []
            
            pool.close()
            await pool.wait_closed()
            return results
            
        except Exception as e:
            print(f"Errore SQL: {e}")
            raise HTTPException(status_code=500, detail=f"Errore SQL Server: {str(e)}")

legacy_engine = LegacyQueryEngine()