import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics } from 'pixi.js'
import type { GaiaItem } from '../types/game'
import { getGaiaColor } from '../types/game'

interface GameMapProps {
    gaiaItems: GaiaItem[]
    mapSize?: number
    className?: string
}

const TILE_SIZE = 4 // Size of each tile in pixels
const DEFAULT_MAP_SIZE = 120

// Legend items with their display names and colors
const LEGEND_ITEMS = [
    { name: 'Gold Mine', label: 'Gold', color: '#ffd700' },
    { name: 'Stone Mine', label: 'Stone', color: '#9aa0a6' },
    { name: 'Trees', label: 'Trees', color: '#2e7d32' },
    { name: 'Forage Bush', label: 'Berries', color: '#4caf50' },
    { name: 'Sheep', label: 'Sheep', color: '#ffffff' },
    { name: 'Deer', label: 'Deer', color: '#8b5a2b' },
    { name: 'Wild Boar', label: 'Boar', color: '#7a1f1f' },
    { name: 'Relic', label: 'Relic', color: '#00e5ff' },
]

export function GameMap({ gaiaItems, mapSize = DEFAULT_MAP_SIZE, className }: GameMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<Application | null>(null)
    const mapContainerRef = useRef<Container | null>(null)
    const [isReady, setIsReady] = useState(false)

    // Calculate scale and position to fit map in container
    const updateScale = useCallback(() => {
        const app = appRef.current
        const mapContainer = mapContainerRef.current
        if (!app || !mapContainer) return

        const mapWidth = mapSize * TILE_SIZE
        const mapHeight = mapSize * TILE_SIZE

        const screenWidth = app.screen.width
        const screenHeight = app.screen.height

        // Calculate scale to fit (use the smaller ratio to maintain aspect ratio)
        const scaleX = screenWidth / mapWidth
        const scaleY = screenHeight / mapHeight
        const scale = Math.min(scaleX, scaleY)

        mapContainer.scale.set(scale)

        // Center the map
        const scaledWidth = mapWidth * scale
        const scaledHeight = mapHeight * scale
        mapContainer.x = (screenWidth - scaledWidth) / 2
        mapContainer.y = (screenHeight - scaledHeight) / 2
    }, [mapSize])

    // Render the grid and items
    const render = useCallback(() => {
        const app = appRef.current
        if (!app) return

        // Clear previous graphics
        app.stage.removeChildren()

        // Create a container for the map that we can scale
        const mapContainer = new Container()
        mapContainerRef.current = mapContainer
        app.stage.addChild(mapContainer)

        const mapWidth = mapSize * TILE_SIZE
        const mapHeight = mapSize * TILE_SIZE

        // Draw grid
        const gridGraphics = new Graphics()

        // Fill background
        gridGraphics.fill({ color: 0x3d5a3d })
        gridGraphics.rect(0, 0, mapWidth, mapHeight)
        gridGraphics.fill()

        // Draw grid lines
        gridGraphics.stroke({ color: 0x2d4a2d, width: 1 })

        // Vertical lines
        for (let x = 0; x <= mapSize; x += 10) {
            gridGraphics.moveTo(x * TILE_SIZE, 0)
            gridGraphics.lineTo(x * TILE_SIZE, mapHeight)
        }

        // Horizontal lines
        for (let y = 0; y <= mapSize; y += 10) {
            gridGraphics.moveTo(0, y * TILE_SIZE)
            gridGraphics.lineTo(mapWidth, y * TILE_SIZE)
        }

        gridGraphics.stroke()
        mapContainer.addChild(gridGraphics)

        // Draw gaia items
        const itemsGraphics = new Graphics()

        for (const item of gaiaItems) {
            const color = getGaiaColor(item.name)

            // Convert game coordinates to screen coordinates
            const screenX = item.x * TILE_SIZE
            const screenY = item.y * TILE_SIZE

            // Size based on item type
            let radius = TILE_SIZE * 0.4
            if (item.name.includes('Tree')) {
                radius = TILE_SIZE * 0.3
            } else if (item.name === 'Gold Mine' || item.name === 'Stone Mine') {
                radius = TILE_SIZE * 0.6
            } else if (item.name === 'Wild Boar') {
                radius = TILE_SIZE * 0.5
            }

            // Draw item as a filled circle
            itemsGraphics.fill({ color: color, alpha: 0.9 })
            itemsGraphics.circle(screenX, screenY, radius)
            itemsGraphics.fill()
        }

        mapContainer.addChild(itemsGraphics)

        // Apply scaling
        updateScale()

    }, [gaiaItems, mapSize, updateScale])

    // Initialize PixiJS application
    useEffect(() => {
        if (!containerRef.current) return

        // Prevent double initialization in React StrictMode
        if (appRef.current) return

        const container = containerRef.current

        const initApp = async () => {
            const app = new Application()

            await app.init({
                background: 0x1a1a2e,
                resizeTo: container,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            })

            // Double-check we haven't initialized while awaiting
            if (appRef.current) {
                app.destroy(true)
                return
            }

            container.appendChild(app.canvas)
            appRef.current = app

            // Handle resize
            const handleResize = () => {
                updateScale()
            }
            window.addEventListener('resize', handleResize)

            setIsReady(true)
        }

        initApp()

        return () => {
            window.removeEventListener('resize', updateScale)
            if (appRef.current) {
                appRef.current.destroy(true, { children: true })
                appRef.current = null
            }
        }
    }, [updateScale])

    // Re-render when data changes or app becomes ready
    useEffect(() => {
        if (isReady) {
            render()
        }
    }, [isReady, render])

    return (
        <>
            <div
                ref={containerRef}
                className={`absolute inset-0 ${className ?? ''}`}
            />
            {/* Legend overlay */}
            <div className="absolute bottom-4 right-4 bg-stone-900/90 backdrop-blur-sm border border-amber-800/40 rounded-lg p-3 shadow-xl">
                <h3 className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">Resources</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {LEGEND_ITEMS.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-amber-100/80 text-xs">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
