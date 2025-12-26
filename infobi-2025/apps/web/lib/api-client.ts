/**
 * API Client per InfoBi Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

interface RequestConfig extends RequestInit {
  token?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { token, ...fetchConfig } = config

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...config.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchConfig,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Errore sconosciuto' }))
      throw new Error(error.detail || `HTTP Error ${response.status}`)
    }

    return response.json()
  }

  // Auth
  async login(username: string, password: string) {
    return this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  async register(username: string, email: string, password: string, full_name?: string) {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, full_name }),
    })
  }

  async getCurrentUser(token: string) {
    return this.request('/api/v1/auth/me', { token })
  }

  // Servers
  async getServers(token: string) {
    return this.request('/api/v1/servers/', { token })
  }

  async createServer(token: string, serverData: any) {
    return this.request('/api/v1/servers/', {
      method: 'POST',
      token,
      body: JSON.stringify(serverData),
    })
  }

  async updateServer(token: string, serverId: number, serverData: any) {
    return this.request(`/api/v1/servers/${serverId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(serverData),
    })
  }

  async deleteServer(token: string, serverId: number) {
    return this.request(`/api/v1/servers/${serverId}`, {
      method: 'DELETE',
      token,
    })
  }

  async testServer(token: string, serverId: number) {
    return this.request(`/api/v1/servers/${serverId}/test`, {
      method: 'POST',
      token,
    })
  }

  // Reports
  async getReports(token: string) {
    return this.request('/api/v1/reports/', { token })
  }

  async createReport(token: string, reportData: any) {
    return this.request('/api/v1/reports/', {
      method: 'POST',
      token,
      body: JSON.stringify(reportData),
    })
  }

  async updateReport(token: string, reportId: number, reportData: any) {
    return this.request(`/api/v1/reports/${reportId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(reportData),
    })
  }

  async deleteReport(token: string, reportId: number) {
    return this.request(`/api/v1/reports/${reportId}`, {
      method: 'DELETE',
      token,
    })
  }

  async executeQuery(token: string, serverId: number, sql: string, format: 'arrow' | 'json' = 'json') {
    return this.request('/api/v1/reports/execute', {
      method: 'POST',
      token,
      body: JSON.stringify({ server_id: serverId, sql_query: sql, format }),
    })
  }

  async executeReport(token: string, reportId: number, format: 'arrow' | 'json' = 'json') {
    return this.request(`/api/v1/reports/${reportId}/execute?format=${format}`, {
      token,
    })
  }

  // Arrow data (restituisce bytes)
  async executeQueryArrow(token: string, serverId: number, sql: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/api/v1/reports/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        server_id: serverId, 
        sql_query: sql, 
        format: 'arrow' 
      }),
    })

    if (!response.ok) {
      throw new Error('Errore esecuzione query')
    }

    return response.arrayBuffer()
  }

  async downloadReportExcel(token: string, reportId: number, pivotConfig?: any) {
    const response = await fetch(`${this.baseUrl}/api/v1/reports/${reportId}/export/excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(pivotConfig || {}),
    })

    if (!response.ok) {
      throw new Error('Errore export Excel')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${reportId}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  }
}

export const apiClient = new ApiClient()
