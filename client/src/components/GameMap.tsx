import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Graphics } from 'pixi.js'
import type { GaiaItem } from '../types/game'
import { getGaiaColor } from '../types/game'

interface GameMapProps {
    gaiaItems: GaiaItem[]
    mapSize?: number
    className?: string
}

const TILE_SIZE = 4 // Size of each tile in pixels
const DEFAULT_MAP_SIZE = 120

export function GameMap({ gaiaItems, mapSize = DEFAULT_MAP_SIZE, className }: GameMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<Application | null>(null)
    const [isReady, setIsReady] = useState(false)

    // Render the grid and items
    const render = useCallback(() => {
        const app = appRef.current
        if (!app) return

        // Clear previous graphics
        app.stage.removeChildren()

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
        app.stage.addChild(gridGraphics)

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

        app.stage.addChild(itemsGraphics)

    }, [gaiaItems, mapSize])

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
            setIsReady(true)
        }

        initApp()

        return () => {
            if (appRef.current) {
                appRef.current.destroy(true, { children: true })
                appRef.current = null
            }
        }
    }, [])

    // Re-render when data changes or app becomes ready
    useEffect(() => {
        if (isReady) {
            render()
        }
    }, [isReady, render])

    return (
        <div className={`${className ?? ''}`}>
            <div
                ref={containerRef}
                className="w-full h-full"
            />
        </div>
    )
}
