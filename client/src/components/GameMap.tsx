import { useCallback, useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'

interface GameMapProps {
    mapSize?: number
    className?: string
}

const TILE_SIZE = 4 // Size of each tile in pixels
const DEFAULT_MAP_SIZE = 200

export function GameMap({ mapSize = DEFAULT_MAP_SIZE, className }: GameMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<Application | null>(null)

    // Render the grid
    const renderGrid = useCallback(() => {
        const app = appRef.current
        if (!app) return

        // Clear previous graphics
        app.stage.removeChildren()

        const graphics = new Graphics()

        const mapWidth = mapSize * TILE_SIZE
        const mapHeight = mapSize * TILE_SIZE

        // Fill background
        graphics.fill({ color: 0x3d5a3d })
        graphics.rect(0, 0, mapWidth, mapHeight)
        graphics.fill()

        // Draw grid lines
        graphics.stroke({ color: 0x2d4a2d, width: 1 })

        // Vertical lines
        for (let x = 0; x <= mapSize; x += 10) {
            graphics.moveTo(x * TILE_SIZE, 0)
            graphics.lineTo(x * TILE_SIZE, mapHeight)
        }

        // Horizontal lines
        for (let y = 0; y <= mapSize; y += 10) {
            graphics.moveTo(0, y * TILE_SIZE)
            graphics.lineTo(mapWidth, y * TILE_SIZE)
        }

        graphics.stroke()

        app.stage.addChild(graphics)

    }, [mapSize])

    // Initialize PixiJS application
    useEffect(() => {
        if (!containerRef.current) return

        const initApp = async () => {
            const app = new Application()

            await app.init({
                background: 0x1a1a2e,
                resizeTo: containerRef.current!,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            })

            containerRef.current!.appendChild(app.canvas)
            appRef.current = app

            // Initial render
            renderGrid()
        }

        initApp()

        return () => {
            if (appRef.current) {
                appRef.current.destroy(true, { children: true })
                appRef.current = null
            }
        }
    }, [])

    // Re-render when data changes
    useEffect(() => {
        renderGrid()
    }, [renderGrid])

    return (
        <div className={`${className ?? ''}`}>
            <div
                ref={containerRef}
                className="w-full h-full"
            />
        </div>
    )
}
