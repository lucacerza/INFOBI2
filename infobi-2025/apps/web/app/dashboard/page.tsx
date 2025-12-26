"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut, Database, FileText, Code } from 'lucide-react'

import { ServerManager } from '@/components/admin/ServerManager'
import { SQLEditor } from '@/components/sql-editor/SQLEditor'
import { PerspectiveViewer } from '@/components/perspective/PerspectiveViewer'
import { useAuthStore } from '@/lib/auth-store'
import { apiClient } from '@/lib/api-client'

export default function DashboardPage() {
  const router = useRouter()
  const { token, user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState('reports')
  const [servers, setServers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [currentData, setCurrentData] = useState<any[]>([])
  const [perspectiveConfig, setPerspectiveConfig] = useState<any>(null)

  useEffect(() => {
    // Verifica autenticazione
    console.log('Dashboard - Token:', token ? 'Present' : 'Missing')
    console.log('Dashboard - User:', user)
    
    if (!token) {
      router.push('/login')
      return
    }

    loadInitialData()
  }, [token])

  const loadInitialData = async () => {
    if (!token) return

    try {
      const [serversData, reportsData] = await Promise.all([
        apiClient.getServers(token),
        apiClient.getReports(token)
      ])

      setServers(serversData)
      setReports(reportsData)
    } catch (error) {
      console.error('Errore caricamento dati:', error)
    }
  }

  const handleExecuteQuery = async (sql: string, serverId: number) => {
    if (!token) return

    try {
      const result = await apiClient.executeQuery(token, serverId, sql, 'json')
      setCurrentData(result.data || [])
      setActiveTab('viewer')
    } catch (error) {
      console.error('Errore esecuzione query:', error)
      alert('Errore durante l\'esecuzione della query')
    }
  }

  const handleSaveReport = async (sql: string, name: string) => {
    if (!token || !servers.length) return

    try {
      await apiClient.createReport(token, {
        name,
        sql_query: sql,
        server_id: servers[0].id,
        is_public: false
      })

      await loadInitialData()
      alert('Report salvato con successo')
    } catch (error) {
      console.error('Errore salvataggio report:', error)
      alert('Errore durante il salvataggio')
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (!token) {
    return <div className="flex items-center justify-center min-h-screen">Caricamento...</div>
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-blue-600">InfoBi Platform</h1>
          <span className="text-sm text-gray-500">v2.0</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium">{user?.full_name || user?.username}</div>
            <div className="text-xs text-gray-500">{user?.role === 'admin' ? 'Amministratore' : 'Utente'}</div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Esci
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="reports">
              <FileText className="w-4 h-4 mr-2" />
              Report
            </TabsTrigger>
            <TabsTrigger value="editor">
              <Code className="w-4 h-4 mr-2" />
              SQL Editor
            </TabsTrigger>
            <TabsTrigger value="viewer">
              <Database className="w-4 h-4 mr-2" />
              Data Viewer
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="admin">
                <Database className="w-4 h-4 mr-2" />
                Gestione Server
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="reports" className="h-full m-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>I Miei Report</CardTitle>
                  <CardDescription>Gestisci e visualizza i report salvati</CardDescription>
                </CardHeader>
                <CardContent>
                  {reports.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nessun report disponibile. Crea il tuo primo report dall'SQL Editor.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {reports.map(report => (
                        <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle className="text-lg">{report.name}</CardTitle>
                            {report.description && (
                              <CardDescription>{report.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <Button 
                              size="sm" 
                              onClick={async () => {
                                const result = await apiClient.executeReport(token!, report.id)
                                setCurrentData(result.data || [])
                                setActiveTab('viewer')
                              }}
                            >
                              Visualizza
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="editor" className="h-full m-0">
              <SQLEditor
                servers={servers}
                onExecute={handleExecuteQuery}
                onSave={handleSaveReport}
              />
            </TabsContent>

            <TabsContent value="viewer" className="h-full m-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Data Viewer (Perspective.js)</CardTitle>
                  <CardDescription>
                    Analizza i dati con pivot table interattive
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[calc(100%-80px)]">
                  {currentData.length > 0 ? (
                    <PerspectiveViewer
                      data={currentData}
                      config={perspectiveConfig}
                      onConfigChange={setPerspectiveConfig}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Esegui una query per visualizzare i dati
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {user?.role === 'admin' && (
              <TabsContent value="admin" className="h-full m-0 overflow-auto">
                <ServerManager 
                  token={token || undefined} 
                  apiUrl="http://localhost:8090/api/v1"
                />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  )
}
