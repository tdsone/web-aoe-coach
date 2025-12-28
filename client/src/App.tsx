import { useState, useCallback, useRef } from 'react'

function App() {
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.aoe2record')) {
      setError('Please upload a valid .aoe2record file')
      return
    }

    setIsLoading(true)
    setError(null)
    setParsedData(null)
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

      setParsedData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

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
    setParsedData(null)
    setFileName(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
        {!parsedData && (
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
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 px-6 py-4 bg-red-900/30 border border-red-700/50 rounded-lg max-w-xl w-full">
            <p className="text-red-300 text-center">{error}</p>
          </div>
        )}

        {/* Parsed Data Display */}
        {parsedData && (
          <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-amber-200 font-medium">{fileName}</span>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-amber-300 hover:text-amber-100 border border-amber-700/50 hover:border-amber-500 rounded-lg transition-colors bg-stone-900/50 hover:bg-stone-800/50"
              >
                Parse Another
              </button>
            </div>

            <div className="bg-stone-900/70 backdrop-blur-sm border border-amber-900/50 rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-amber-900/40 to-stone-900/40 border-b border-amber-900/30">
                <h2 className="text-lg font-semibold text-amber-200">Parsed Game Data</h2>
              </div>
              <pre className="p-6 overflow-auto max-h-[60vh] text-sm text-amber-100/90 font-mono leading-relaxed">
                {JSON.stringify(parsedData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Footer hint */}
        <p className="mt-12 text-amber-600/50 text-sm">
          Powered by mgz parser
        </p>
      </div>
    </div>
  )
}

export default App
