"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Table } from 'apache-arrow'

interface PerspectiveViewerProps {
  data: any[]
  config?: any
  onConfigChange?: (config: any) => void
}

export function PerspectiveViewer({ data, config, onConfigChange }: PerspectiveViewerProps) {
  const viewerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Carica Perspective dinamicamente (client-side only)
    const loadPerspective = async () => {
      try {
        // Import dinamico
        const perspective = await import('@finos/perspective')
        await import('@finos/perspective-viewer')
        await import('@finos/perspective-viewer-datagrid')
        await import('@finos/perspective-viewer-d3fc')
        
        // Import CSS
        await import('@finos/perspective-viewer/dist/css/themes.css')
        
        if (containerRef.current && !viewerRef.current) {
          // Crea viewer
          const viewer = document.createElement('perspective-viewer')
          containerRef.current.appendChild(viewer)
          viewerRef.current = viewer
          
          // Event listener per configurazione
          if (onConfigChange) {
            viewer.addEventListener('perspective-config-update', () => {
              viewer.save().then((config: any) => {
                onConfigChange(config)
              })
            })
          }
          
          setIsLoaded(true)
        }
      } catch (err) {
        console.error('Errore caricamento Perspective:', err)
        setError('Impossibile caricare Perspective.js')
      }
    }

    loadPerspective()

    return () => {
      if (viewerRef.current) {
        viewerRef.current.delete()
        viewerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !viewerRef.current || !data || data.length === 0) return

    const updateData = async () => {
      try {
        // Converti dati in Arrow Table
        const perspective = await import('@finos/perspective')
        
        // Crea tabella perspective
        const table = await perspective.default.table(data)
        
        // Carica dati nel viewer
        await viewerRef.current.load(table)
        
        // Applica configurazione se presente
        if (config) {
          await viewerRef.current.restore(config)
        }
      } catch (err) {
        console.error('Errore aggiornamento dati:', err)
        setError('Errore durante il caricamento dei dati')
      }
    }

    updateData()
  }, [data, isLoaded])

  useEffect(() => {
    if (!isLoaded || !viewerRef.current || !config) return

    // Aggiorna configurazione
    viewerRef.current.restore(config).catch((err: any) => {
      console.error('Errore restore config:', err)
    })
  }, [config, isLoaded])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 text-red-600 p-4">
        {error}
      </div>
    )
  }

  return (
    <div className="w-full h-full perspective-container" ref={containerRef} />
  )
}
