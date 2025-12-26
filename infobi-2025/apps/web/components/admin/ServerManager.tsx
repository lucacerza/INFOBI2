"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Database, TestTube, CheckCircle, XCircle } from 'lucide-react'

interface DBServer {
  id: number
  name: string
  db_type: string
  server: string
  database: string
  port?: number
  is_active: boolean
}

interface ServerManagerProps {
  apiUrl?: string
  token?: string
}

export function ServerManager({ apiUrl = '/api/v1', token }: ServerManagerProps) {
  const [servers, setServers] = useState<DBServer[]>([])
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<DBServer | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    db_type: 'mssql',
    server: '',
    database: '',
    port: '',
    username: '',
    password: '',
    driver: 'ODBC Driver 17 for SQL Server'
  })

  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    loadServers()
  }, [])

  const loadServers = async () => {
    setLoading(true)
    try {
      const headers: any = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${apiUrl}/servers/`, { headers })
      if (res.ok) {
        const data = await res.json()
        setServers(data)
      }
    } catch (error) {
      console.error('Errore caricamento server:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const headers: any = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const payload = {
      ...formData,
      port: formData.port ? parseInt(formData.port) : null
    }

    try {
      let res
      if (editingServer) {
        // Update
        res = await fetch(`${apiUrl}/servers/${editingServer.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        })
      } else {
        // Create
        res = await fetch(`${apiUrl}/servers/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })
      }

      if (res.ok) {
        await loadServers()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await res.json()
        alert(`Errore: ${error.detail}`)
      }
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore durante il salvataggio')
    }
  }

  const handleTest = async (serverId: number) => {
    const headers: any = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const res = await fetch(`${apiUrl}/servers/${serverId}/test`, {
        method: 'POST',
        headers
      })
      
      const result = await res.json()
      setTestResult(result)
      
      setTimeout(() => setTestResult(null), 5000)
    } catch (error) {
      console.error('Errore test:', error)
    }
  }

  const handleDelete = async (serverId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo server?')) return

    const headers: any = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const res = await fetch(`${apiUrl}/servers/${serverId}`, {
        method: 'DELETE',
        headers
      })

      if (res.ok) {
        await loadServers()
      }
    } catch (error) {
      console.error('Errore eliminazione:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      db_type: 'mssql',
      server: '',
      database: '',
      port: '',
      username: '',
      password: '',
      driver: 'ODBC Driver 17 for SQL Server'
    })
    setEditingServer(null)
  }

  const openEditDialog = (server: DBServer) => {
    setEditingServer(server)
    setFormData({
      name: server.name,
      db_type: server.db_type,
      server: server.server,
      database: server.database,
      port: server.port?.toString() || '',
      username: '',
      password: '',
      driver: 'ODBC Driver 17 for SQL Server'
    })
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestione Server Database</h2>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Server
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingServer ? 'Modifica Server' : 'Nuovo Server'}
              </DialogTitle>
              <DialogDescription>
                Configura la connessione al database
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="db_type">Tipo Database</Label>
                  <Select value={formData.db_type} onValueChange={(v) => setFormData({ ...formData, db_type: v })}>
                    <SelectTrigger id="db_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mssql">SQL Server</SelectItem>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="server">Server</Label>
                  <Input
                    id="server"
                    value={formData.server}
                    onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                    placeholder="localhost o IP"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="database">Database</Label>
                  <Input
                    id="database"
                    value={formData.database}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">Porta (opzionale)</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                {formData.db_type === 'mssql' && (
                  <div className="space-y-2">
                    <Label htmlFor="driver">Driver ODBC</Label>
                    <Input
                      id="driver"
                      value={formData.driver}
                      onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit">
                  Salva
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {testResult && (
        <Card className={testResult.status === 'success' ? 'border-green-500' : 'border-red-500'}>
          <CardContent className="pt-4 flex items-center gap-2">
            {testResult.status === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span>{testResult.message}</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map(server => (
          <Card key={server.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                {server.name}
              </CardTitle>
              <CardDescription>
                {server.db_type.toUpperCase()} - {server.database}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Server:</strong> {server.server}</div>
                {server.port && <div><strong>Porta:</strong> {server.port}</div>}
              </div>

              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => handleTest(server.id)}>
                  <TestTube className="w-4 h-4 mr-1" />
                  Test
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEditDialog(server)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(server.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && <div className="text-center py-8">Caricamento...</div>}
      {!loading && servers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nessun server configurato. Clicca su "Nuovo Server" per iniziare.
        </div>
      )}
    </div>
  )
}
