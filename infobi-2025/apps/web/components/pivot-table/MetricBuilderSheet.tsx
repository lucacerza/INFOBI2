"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Calculator, Plus, ArrowDown } from 'lucide-react' // Importato ArrowDown per design verticale

export interface CalculatedMetric {
  name: string
  label: string
  operation: string
  field1: string
  field2: string
  decimals: number
}

interface ColumnOption {
  id: string
  label: string
}

interface MetricBuilderSheetProps {
  columns: ColumnOption[]
  onSave: (metric: CalculatedMetric) => void
}

export function MetricBuilderSheet({ columns, onSave }: MetricBuilderSheetProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [field1, setField1] = useState('')
  const [field2, setField2] = useState('')
  const [operation, setOperation] = useState('subtract')

  const handleSave = () => {
    if (!label || !field1 || !field2) return;

    const newMetric: CalculatedMetric = {
      name: `calc_${Date.now()}`,
      label: label,
      operation: operation,
      field1: field1,
      field2: field2,
      decimals: 2
    }

    onSave(newMetric)
    setOpen(false)
    setLabel('')
    setField1('')
    setField2('')
  }

  const getLabel = (id: string) => columns.find(c => c.id === id)?.label || id;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-2 border-dashed text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors font-medium">
          <Calculator size={14} /> Nuova Metrica
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <SheetTitle className="flex items-center gap-2 text-xl text-slate-800">
            <div className="bg-blue-100 p-1.5 rounded-md">
                <Calculator size={18} className="text-blue-600"/> 
            </div>
            Nuova Metrica
          </SheetTitle>
          <SheetDescription className="text-slate-500">
            Combina due colonne esistenti per crearne una nuova.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          
          {/* 1. NOME COLONNA */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Nome Colonna</Label>
            <Input 
              placeholder="Es. Utile Lordo" 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-10 font-medium border-slate-300 focus-visible:ring-blue-500"
            />
          </div>

          {/* 2. FORMULA - LAYOUT VERTICALE ROBUSTO */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Componi Formula</Label>
            
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col gap-4">
                
                {/* COLONNA A */}
                <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Valore A</span>
                    <Select value={field1} onValueChange={setField1}>
                        <SelectTrigger className="w-full bg-white h-10 text-sm shadow-sm border-slate-200">
                            <SelectValue placeholder="Seleziona la prima colonna..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* OPERATORE */}
                <div className="flex items-center gap-4">
                     <div className="h-px bg-slate-200 flex-1"></div>
                     <Select value={operation} onValueChange={setOperation}>
                        <SelectTrigger className="w-[160px] bg-white h-9 text-sm font-bold justify-center text-center border-blue-200 text-blue-700 shadow-sm ring-2 ring-blue-50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="subtract">Sottrazione (-)</SelectItem>
                            <SelectItem value="add">Addizione (+)</SelectItem>
                            <SelectItem value="multiply">Moltiplicazione (×)</SelectItem>
                            <SelectItem value="divide">Divisione (÷)</SelectItem>
                            <SelectItem value="percentage_margin_on_field1">Margine %</SelectItem>
                        </SelectContent>
                    </Select>
                     <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                {/* COLONNA B */}
                <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Valore B</span>
                    <Select value={field2} onValueChange={setField2}>
                        <SelectTrigger className="w-full bg-white h-10 text-sm shadow-sm border-slate-200">
                            <SelectValue placeholder="Seleziona la seconda colonna..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

            </div>
          </div>

          {/* PREVIEW RISULTATO */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-center">
             <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Anteprima Logica</p>
             <div className="text-sm text-slate-800 font-medium flex flex-col gap-1 items-center justify-center">
                 
                 <span className={field1 ? "text-blue-700" : "text-slate-300 italic"}>
                    {field1 ? getLabel(field1) : "(Seleziona A)"}
                 </span>
                 
                 <ArrowDown size={14} className="text-slate-300" />

                 <span className="font-bold text-slate-500 bg-white px-2 py-0.5 rounded border text-xs">
                    {operation === 'subtract' && 'MENO'}
                    {operation === 'add' && 'PIÙ'}
                    {operation === 'multiply' && 'PER'}
                    {operation === 'divide' && 'DIVISO'}
                    {operation === 'percentage_margin_on_field1' && '% MARGINE SU'}
                 </span>

                 <ArrowDown size={14} className="text-slate-300" />

                 <span className={field2 ? "text-blue-700" : "text-slate-300 italic"}>
                    {field2 ? getLabel(field2) : "(Seleziona B)"}
                 </span>
                 
                 <div className="w-full h-px bg-slate-200 my-2"></div>
                 
                 <span className={label ? "font-bold text-lg text-slate-900" : "text-slate-300 italic"}>
                    = {label || "(Nome Colonna)"}
                 </span>
             </div>
          </div>

        </div>

        <SheetFooter className="p-6 border-t border-slate-100 bg-white mt-auto">
          <div className="flex w-full gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Annulla</Button>
              <Button onClick={handleSave} disabled={!label || !field1 || !field2} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                <Plus size={16} className="mr-2"/> Crea Metrica
              </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}