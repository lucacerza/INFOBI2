"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Form data per il backend FastAPI
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        
        // Salva token e user info
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify({
          username: username,
          role: 'admin' // TODO: get from response
        }))
        
        // Redirect alla dashboard
        router.push('/dashboard')
      } else {
        const errorData = await res.json()
        
        // Gestisci errori Pydantic (array di oggetti con type, loc, msg)
        if (Array.isArray(errorData.detail)) {
          setError(errorData.detail.map((e: any) => e.msg).join(', '))
        } else if (typeof errorData.detail === 'string') {
          setError(errorData.detail)
        } else {
          setError('Credenziali non valide')
        }
      }
    } catch (err) {
      setError('Errore di connessione al backend')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">InfoBi Platform</CardTitle>
          <CardDescription>Accedi alla piattaforma BI</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>

            <div className="text-sm text-gray-600 text-center mt-4">
              Default: admin / admin123
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
