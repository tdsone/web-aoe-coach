import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Application, Container, Graphics, Sprite, Assets } from 'pixi.js'
import type { GaiaItem, BuildingItem, GaiaConfig, BuildingConfig } from '../types/game'
import { getGaiaItemConfig, getBuildingItemConfig, hexToNumber } from '../types/game'

interface GameMapProps {
    gaiaItems: GaiaItem[]
    buildings: BuildingItem[]
    gaiaConfig: GaiaConfig
    buildingConfig: BuildingConfig
    mapSize?: number
    className?: string
}

const TILE_SIZE = 4 // Size of each tile in pixels
const DEFAULT_MAP_SIZE = 120

export function GameMap({ gaiaItems, buildings, gaiaConfig, buildingConfig, mapSize = DEFAULT_MAP_SIZE, className }: GameMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<Application | null>(null)
    const mapContainerRef = useRef<Container | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [loadedIcons, setLoadedIcons] = useState<Record<string, boolean>>({})

    // Compute visible gaia items from config
    const visibleGaiaItems = useMemo(() => {
        return gaiaItems.filter(item => {
            const config = getGaiaItemConfig(gaiaConfig, item.name)
            return config.show
        })
    }, [gaiaItems, gaiaConfig])

    // Compute visible buildings from config
    const visibleBuildings = useMemo(() => {
        return buildings.filter(building => {
            const config = getBuildingItemConfig(buildingConfig, building.name)
            return config.show
        })
    }, [buildings, buildingConfig])

    // Generate legend items from config (only items that are shown)
    const gaiaLegendItems = useMemo(() => {
        const uniqueNames = new Set(visibleGaiaItems.map(item => item.name))
        return gaiaConfig.items
            .filter(item => item.show && uniqueNames.has(item.name))
            .map(item => ({
                name: item.name,
                label: item.name,
                color: item.color,
            }))
    }, [gaiaConfig, visibleGaiaItems])

    const buildingLegendItems = useMemo(() => {
        const uniqueNames = new Set(visibleBuildings.map(b => b.name))
        return buildingConfig.items
            .filter(item => item.show && uniqueNames.has(item.building))
            .map(item => ({
                name: item.building,
                label: item.building,
                icon: item.icon,
            }))
    }, [buildingConfig, visibleBuildings])

    // Preload building icons
    useEffect(() => {
        const loadIcons = async () => {
            const iconPromises: Promise<void>[] = []
            const loaded: Record<string, boolean> = {}

            for (const item of buildingConfig.items) {
                if (item.icon) {
                    const promise = Assets.load(item.icon)
                        .then(() => {
                            loaded[item.building] = true
                        })
                        .catch((err) => {
                            console.warn(`Failed to load icon for ${item.building}:`, err)
                            loaded[item.building] = false
                        })
                    iconPromises.push(promise)
                }
            }

            await Promise.all(iconPromises)
            setLoadedIcons(loaded)
        }

        loadIcons()
    }, [buildingConfig])

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
    const render = useCallback(async () => {
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

        // Draw minor grid lines (every 5 tiles)
        gridGraphics.stroke({ color: 0x345434, width: 0.5, alpha: 0.5 })
        for (let x = 0; x <= mapSize; x += 5) {
            gridGraphics.moveTo(x * TILE_SIZE, 0)
            gridGraphics.lineTo(x * TILE_SIZE, mapHeight)
        }
        for (let y = 0; y <= mapSize; y += 5) {
            gridGraphics.moveTo(0, y * TILE_SIZE)
            gridGraphics.lineTo(mapWidth, y * TILE_SIZE)
        }
        gridGraphics.stroke()

        // Draw major grid lines (every 10 tiles)
        gridGraphics.stroke({ color: 0x2d4a2d, width: 1 })
        for (let x = 0; x <= mapSize; x += 10) {
            gridGraphics.moveTo(x * TILE_SIZE, 0)
            gridGraphics.lineTo(x * TILE_SIZE, mapHeight)
        }
        for (let y = 0; y <= mapSize; y += 10) {
            gridGraphics.moveTo(0, y * TILE_SIZE)
            gridGraphics.lineTo(mapWidth, y * TILE_SIZE)
        }
        gridGraphics.stroke()
        mapContainer.addChild(gridGraphics)

        // Draw gaia items (only visible ones)
        const itemsGraphics = new Graphics()

        for (const item of visibleGaiaItems) {
            const config = getGaiaItemConfig(gaiaConfig, item.name)
            const color = hexToNumber(config.color)

            // Convert game coordinates to screen coordinates
            const screenX = item.x * TILE_SIZE
            const screenY = item.y * TILE_SIZE

            // Size based on item type
            let radius = TILE_SIZE * 0.4
            if (item.name.includes('Tree')) {
                radius = TILE_SIZE * 0.3
            } else if (item.name === 'Gold Mine' || item.name === 'Stone Mine') {
                radius = TILE_SIZE * 0.6
            } else if (item.name === 'Wild Boar' || item.name === 'Javelina') {
                radius = TILE_SIZE * 0.5
            }

            // Draw item as a filled circle
            itemsGraphics.fill({ color: color, alpha: 0.9 })
            itemsGraphics.circle(screenX, screenY, radius)
            itemsGraphics.fill()
        }

        mapContainer.addChild(itemsGraphics)

        // Draw buildings (only visible ones) - using icons
        const buildingsContainer = new Container()
        const iconSize = buildingConfig.defaults.icon_size * mapWidth

        for (const building of visibleBuildings) {
            const config = getBuildingItemConfig(buildingConfig, building.name)

            // Convert game coordinates to screen coordinates
            const screenX = building.x * TILE_SIZE
            const screenY = building.y * TILE_SIZE

            if (config.icon && loadedIcons[building.name]) {
                try {
                    const texture = await Assets.load(config.icon)
                    const sprite = new Sprite(texture)
                    sprite.anchor.set(0.5)
                    sprite.x = screenX
                    sprite.y = screenY
                    sprite.width = iconSize
                    sprite.height = iconSize
                    buildingsContainer.addChild(sprite)
                } catch {
                    // Fallback to square if icon fails
                    const fallbackGraphics = new Graphics()
                    const size = TILE_SIZE * 1.5
                    fallbackGraphics.fill({ color: 0xa04000, alpha: 0.9 })
                    fallbackGraphics.rect(screenX - size / 2, screenY - size / 2, size, size)
                    fallbackGraphics.fill()
                    buildingsContainer.addChild(fallbackGraphics)
                }
            } else {
                // Draw building as a colored square if no icon
                const fallbackGraphics = new Graphics()
                let size = TILE_SIZE * 1.5
                if (building.name === 'Town Center') {
                    size = TILE_SIZE * 2
                } else if (building.name === 'House') {
                    size = TILE_SIZE * 1
                }
                fallbackGraphics.fill({ color: 0xa04000, alpha: 0.9 })
                fallbackGraphics.rect(screenX - size / 2, screenY - size / 2, size, size)
                fallbackGraphics.fill()
                fallbackGraphics.stroke({ color: 0x000000, width: 1, alpha: 0.5 })
                fallbackGraphics.rect(screenX - size / 2, screenY - size / 2, size, size)
                fallbackGraphics.stroke()
                buildingsContainer.addChild(fallbackGraphics)
            }
        }

        mapContainer.addChild(buildingsContainer)

        // Apply scaling
        updateScale()

    }, [visibleGaiaItems, visibleBuildings, gaiaConfig, buildingConfig, mapSize, updateScale, loadedIcons])

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
            <div className="absolute bottom-4 right-4 bg-stone-900/90 backdrop-blur-sm border border-amber-800/40 rounded-lg p-3 shadow-xl max-h-80 overflow-y-auto">
                {gaiaLegendItems.length > 0 && (
                    <>
                        <h3 className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">Resources</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {gaiaLegendItems.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-amber-100/80 text-xs">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                {buildingLegendItems.length > 0 && (
                    <>
                        {gaiaLegendItems.length > 0 && <div className="border-t border-amber-800/30 my-2" />}
                        <h3 className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">Buildings</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {buildingLegendItems.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    {item.icon ? (
                                        <img
                                            src={item.icon}
                                            alt={item.label}
                                            className="w-4 h-4 flex-shrink-0 object-contain"
                                        />
                                    ) : (
                                        <div className="w-3 h-3 flex-shrink-0 bg-amber-700" />
                                    )}
                                    <span className="text-amber-100/80 text-xs">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
