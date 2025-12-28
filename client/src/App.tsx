import { useState, useCallback, useRef, useEffect } from 'react'
import { GameMap } from './components/GameMap'
import type { GaiaItem } from './types/game'

type ViewMode = 'upload' | 'map'

function App() {
  const [gameId, setGameId] = useState<string | null>(null)
  const [gaiaItems, setGaiaItems] = useState<GaiaItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchGaiaLayer = useCallback(async (id: string, t: number = 0) => {
    try {
      const response = await fetch(`http://localhost:8000/layers/gaia?id=${id}&t=${t}`)
      if (!response.ok) throw new Error('Failed to fetch gaia layer')
      const data = await response.json()
      setGaiaItems(data)
    } catch (err) {
      console.error('Error fetching gaia layer:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch gaia layer')
    }
  }, [])

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.aoe2record')) {
      setError('Please upload a valid .aoe2record file')
      return
    }

    setIsLoading(true)
    setError(null)
    setFileName(file.name)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse replay')
      }

      // The parse endpoint now returns game state, get the game ID from the response
      // For now, we need to extract it - let's update the server to return it
      // Assuming the response contains the game id
      if (data.id) {
        setGameId(data.id)
        await fetchGaiaLayer(data.id, 0)
        setViewMode('map')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [fetchGaiaLayer])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleReset = () => {
    setGameId(null)
    setGaiaItems([])
    setFileName(null)
    setError(null)
    setViewMode('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Load demo data for development (optional - remove in production)
  useEffect(() => {
    // Generate some demo gaia items for testing if no data loaded
    if (viewMode === 'map' && gaiaItems.length === 0 && !gameId) {
      const demoItems: GaiaItem[] = []

      // Generate trees in clusters
      for (let cluster = 0; cluster < 8; cluster++) {
        const cx = Math.random() * 180 + 10
        const cy = Math.random() * 180 + 10
        for (let i = 0; i < 15; i++) {
          demoItems.push({
            x: cx + (Math.random() - 0.5) * 20,
            y: cy + (Math.random() - 0.5) * 20,
            name: 'Tree (Oak Forest)',
          })
        }
      }

      // Add gold mines
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * 180 + 10
        const y = Math.random() * 180 + 10
        for (let j = 0; j < 4; j++) {
          demoItems.push({
            x: x + (Math.random() - 0.5) * 4,
            y: y + (Math.random() - 0.5) * 4,
            name: 'Gold Mine',
          })
        }
      }

      // Add stone mines
      for (let i = 0; i < 6; i++) {
        const x = Math.random() * 180 + 10
        const y = Math.random() * 180 + 10
        for (let j = 0; j < 4; j++) {
          demoItems.push({
            x: x + (Math.random() - 0.5) * 4,
            y: y + (Math.random() - 0.5) * 4,
            name: 'Stone Mine',
          })
        }
      }

      // Add sheep
      for (let i = 0; i < 8; i++) {
        demoItems.push({
          x: Math.random() * 180 + 10,
          y: Math.random() * 180 + 10,
          name: 'Sheep',
        })
      }

      // Add deer
      for (let i = 0; i < 4; i++) {
        const x = Math.random() * 160 + 20
        const y = Math.random() * 160 + 20
        for (let j = 0; j < 4; j++) {
          demoItems.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 8,
            name: 'Deer',
          })
        }
      }

      // Add boars
      for (let i = 0; i < 4; i++) {
        demoItems.push({
          x: Math.random() * 180 + 10,
          y: Math.random() * 180 + 10,
          name: 'Wild Boar',
        })
      }

      // Add berries
      for (let i = 0; i < 4; i++) {
        const x = Math.random() * 180 + 10
        const y = Math.random() * 180 + 10
        for (let j = 0; j < 6; j++) {
          demoItems.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            name: 'Forage Bush',
          })
        }
      }

      // Add relics
      for (let i = 0; i < 5; i++) {
        demoItems.push({
          x: Math.random() * 180 + 10,
          y: Math.random() * 180 + 10,
          name: 'Relic',
        })
      }

      setGaiaItems(demoItems)
    }
  }, [viewMode, gaiaItems.length, gameId])

  if (viewMode === 'map') {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-stone-950 via-stone-900 to-slate-950 flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-stone-900/80 border-b border-amber-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              Age of Empires II
            </h1>
            {fileName && (
              <>
                <div className="w-px h-6 bg-amber-700/30" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-amber-200/80 text-sm">{fileName}</span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-1.5 text-sm text-amber-300 hover:text-amber-100 border border-amber-700/50 hover:border-amber-500 rounded-lg transition-colors bg-stone-800/50 hover:bg-stone-700/50"
          >
            ← Back
          </button>
        </div>

        {/* Map container */}
        <div className="flex-1 relative">
          <GameMap
            mapSize={200}
            className="w-full h-full"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-slate-950 text-amber-50">
      {/* Decorative background pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4a574' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 drop-shadow-lg tracking-tight">
            Age of Empires II
          </h1>
          <p className="mt-3 text-xl text-amber-200/80 font-light tracking-wide">
            Replay Parser
          </p>
        </div>

        {/* Upload Area */}
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative w-full max-w-xl cursor-pointer
            border-2 border-dashed rounded-xl p-12
            transition-all duration-300 ease-out
            ${isDragging
              ? 'border-amber-400 bg-amber-400/10 scale-[1.02]'
              : 'border-amber-700/50 bg-stone-900/50 hover:border-amber-500/70 hover:bg-stone-800/50'
            }
            backdrop-blur-sm
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".aoe2record"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            {/* Upload Icon */}
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isDragging ? 'bg-amber-500/30' : 'bg-amber-900/40'}
            `}>
              <svg
                className={`w-10 h-10 transition-colors ${isDragging ? 'text-amber-300' : 'text-amber-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <div className="text-center">
              <p className="text-lg text-amber-100 font-medium">
                {isLoading ? 'Parsing replay...' : 'Drop your replay file here'}
              </p>
              <p className="mt-1 text-sm text-amber-300/60">
                or click to browse • .aoe2record files only
              </p>
            </div>

            {isLoading && (
              <div className="flex items-center gap-3 mt-2">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-amber-300 text-sm">{fileName}</span>
              </div>
            )}
          </div>

          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-amber-600/40 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-amber-600/40 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-amber-600/40 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-amber-600/40 rounded-br-lg" />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 px-6 py-4 bg-red-900/30 border border-red-700/50 rounded-lg max-w-xl w-full">
            <p className="text-red-300 text-center">{error}</p>
          </div>
        )}

        {/* Demo button for testing */}
        <button
          onClick={() => setViewMode('map')}
          className="mt-8 px-6 py-3 text-amber-300/70 hover:text-amber-200 text-sm border border-amber-800/30 hover:border-amber-700/50 rounded-lg transition-colors"
        >
          View Demo Map →
        </button>

        {/* Footer hint */}
        <p className="mt-12 text-amber-600/50 text-sm">
          Powered by mgz parser
        </p>
      </div>
    </div>
  )
}

export default App
