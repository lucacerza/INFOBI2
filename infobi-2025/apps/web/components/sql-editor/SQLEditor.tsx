"use client"

import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Play, Save, Database } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface SQLEditorProps {
  onExecute?: (sql: string, serverId: number) => void
  onSave?: (sql: string, name: string) => void
  initialValue?: string
  servers?: Array<{ id: number, name: string }>
}

export function SQLEditor({ onExecute, onSave, initialValue = '', servers = [] }: SQLEditorProps) {
  const [sql, setSql] = useState(initialValue)
  const [selectedServer, setSelectedServer] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState(false)

  const handleExecute = async () => {
    if (!selectedServer) {
      alert('Seleziona un server')
      return
    }

    if (!sql.trim()) {
      alert('Inserisci una query SQL')
      return
    }

    setIsExecuting(true)
    
    try {
      if (onExecute) {
        await onExecute(sql, parseInt(selectedServer))
      }
    } catch (error) {
      console.error('Errore esecuzione:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleSave = () => {
    const name = prompt('Nome del report:')
    if (name && onSave) {
      onSave(sql, name)
    }
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 border-b">
        <Database className="w-4 h-4 text-gray-600" />
        
        <div className="flex items-center gap-2 flex-1">
          <Label htmlFor="server-select" className="text-sm">Server:</Label>
          <Select value={selectedServer} onValueChange={setSelectedServer}>
            <SelectTrigger id="server-select" className="w-48">
              <SelectValue placeholder="Seleziona server..." />
            </SelectTrigger>
            <SelectContent>
              {servers.map(server => (
                <SelectItem key={server.id} value={server.id.toString()}>
                  {server.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleExecute} 
            disabled={isExecuting || !selectedServer}
            size="sm"
          >
            <Play className="w-4 h-4 mr-1" />
            Esegui
          </Button>
          
          {onSave && (
            <Button onClick={handleSave} variant="outline" size="sm">
              <Save className="w-4 h-4 mr-1" />
              Salva
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={sql}
          onChange={(value) => setSql(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  )
}
