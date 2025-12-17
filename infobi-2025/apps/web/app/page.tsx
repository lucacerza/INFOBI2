"use client"

import { useState, useEffect } from 'react'
import { BiGrid } from '@/components/pivot-table/BiGrid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Folder, FileText, Play, Filter } from 'lucide-react'

// Tipi
type ReportGroup = Record<string, { name: string, path: string }[]>

interface RunQueryResponse {
  query: string
  count: number
  config: Record<string, unknown> | null 
  data: Record<string, unknown>[]
}

interface QueryParams {
  codazi: string
  AZIENDA: string
  _COSTO_: string
  year1?: number
  year2?: number
  date_from?: string
  date_to?: string
}

export default function DashboardPage() {
  const [reports, setReports] = useState<ReportGroup>({})
  const [selectedReport, setSelectedReport] = useState<string>("")
  
  const [mode, setMode] = useState<'YEARS' | 'DATES'>('YEARS')
  const [year1, setYear1] = useState("2023")
  const [year2, setYear2] = useState("2024")
  const [dateFrom, setDateFrom] = useState("2024-01-01")
  const [dateTo, setDateTo] = useState("2024-12-31")
  const [codAzi, setCodAzi] = useState("DITTA1.")
  
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v1/reports-list')
      .then(res => res.json())
      .then((data: ReportGroup) => setReports(data))
      .catch(err => console.error("Errore lista report:", err))
  }, [])

  const handleRunReport = async () => {
    if (!selectedReport) return
    setLoading(true)
    setError("")
    setData([])
    setConfig(null)

    try {
      const params: QueryParams = { 
        codazi: codAzi,
        AZIENDA: codAzi,
        _COSTO_: "MVTOTCOS"
      }

      if (mode === 'YEARS') {
        params.year1 = parseInt(year1)
        params.year2 = parseInt(year2)
      } else {
        params.date_from = dateFrom
        params.date_to = dateTo
      }

      const res = await fetch('/api/v1/run-legacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_name: selectedReport,
          params: params
        })
      })

      const json = await res.json() as RunQueryResponse
      
      if (!res.ok) {
        const errorMsg = (json as unknown as { detail: string }).detail || "Errore sconosciuto"
        throw new Error(errorMsg)
      }
      
      if (Array.isArray(json.data)) {
          setData(json.data)
          setConfig(json.config)
      } else {
          console.error("Formato risposta imprevisto:", json)
          setError("Il backend non ha restituito un array di dati.")
      }

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Si è verificato un errore imprevisto")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      
      <div className="w-64 bg-white border-r flex flex-col shrink-0">
        <div className="p-4 border-b font-bold text-lg flex items-center gap-2 text-slate-800">
           <Folder className="text-blue-600"/> InfoBi 2025
        </div>
        <ScrollArea className="flex-1 p-4">
          {Object.keys(reports).length === 0 && <p className="text-sm text-gray-400">Caricamento report...</p>}
          {Object.entries(reports).map(([category, items]) => (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{category}</h3>
              <div className="space-y-1">
                {items.map((rep) => (
                  <button
                    key={rep.path}
                    onClick={() => setSelectedReport(rep.path)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${
                      selectedReport === rep.path 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FileText size={14} />
                    {rep.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        <div className="bg-white border-b p-4 shadow-sm z-10 shrink-0">
          <div className="flex flex-wrap items-end gap-4">
            
            <div className="w-32">
                <Label className="text-xs mb-1 block">Codice Azienda</Label>
                <Input value={codAzi} onChange={e => setCodAzi(e.target.value)} className="h-8" />
            </div>

            <div className="h-8 w-px bg-gray-300 mx-2 hidden md:block"></div>

            <div className="w-32">
                <Label className="text-xs mb-1 block">Modalità</Label>
                <Select value={mode} onValueChange={(v: 'YEARS' | 'DATES') => setMode(v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="YEARS">Confronto Anni</SelectItem>
                        <SelectItem value="DATES">Range Date</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {mode === 'YEARS' ? (
                <>
                  <div className="w-24">
                      <Label className="text-xs mb-1 block">Anno 1</Label>
                      <Input type="number" value={year1} onChange={e => setYear1(e.target.value)} className="h-8" />
                  </div>
                  <div className="w-24">
                      <Label className="text-xs mb-1 block">Anno 2</Label>
                      <Input type="number" value={year2} onChange={e => setYear2(e.target.value)} className="h-8" />
                  </div>
                </>
            ) : (
                <>
                  <div className="w-36">
                      <Label className="text-xs mb-1 block">Dal</Label>
                      <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8" />
                  </div>
                  <div className="w-36">
                      <Label className="text-xs mb-1 block">Al</Label>
                      <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8" />
                  </div>
                </>
            )}

            <Button 
                onClick={handleRunReport} 
                disabled={!selectedReport || loading} 
                className="ml-auto bg-blue-600 hover:bg-blue-700 h-8"
            >
                {loading ? "Elaborazione..." : (
                    <>
                        <Play size={16} className="mr-2" /> Esegui Report
                    </>
                )}
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-hidden bg-gray-50 flex flex-col min-h-0">
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 border border-red-200 shrink-0">
                    <strong>Errore:</strong> {error}
                </div>
            )}

            {data.length > 0 ? (
                <div className="flex-1 min-h-0">
                    {/* Qui passiamo anche la funzione per salvare le metriche */}
                    <BiGrid 
                        data={data} 
                        config={config}
                        onConfigChange={setConfig} 
                    />
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg m-4">
                    <Filter size={48} className="mb-4 opacity-20" />
                    <p>Seleziona un report dalla sidebar e clicca Esegui.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}