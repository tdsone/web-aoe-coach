export interface GaiaItem {
    x: number
    y: number
    name: string
}

export interface BuildingItem {
    x: number
    y: number
    name: string
}

export interface GameState {
    id: string
    mapSize: number
    gaia: GaiaItem[]
    buildings: BuildingItem[]
}

// Gaia config types
export interface GaiaConfigItem {
    name: string
    show: boolean
    color: string
}

export interface GaiaConfig {
    defaults: {
        show: boolean
        color: string
    }
    items: GaiaConfigItem[]
}

// Building config types
export interface BuildingConfigItem {
    building: string
    show: boolean
    icon: string
}

export interface BuildingConfig {
    defaults: {
        show: boolean
        shape: number
        size: number
        icon: string
        icon_size: number
        outline_shape: number
        outline_size: number
        outline_stroke: number
    }
    items: BuildingConfigItem[]
}

// Helper to get gaia config for an item - throws if not found
export function getGaiaItemConfig(config: GaiaConfig, name: string): GaiaConfigItem {
    const item = config.items.find(i => i.name === name)
    if (!item) {
        throw new Error(`No gaia config found for item: "${name}". Please add it to server/config/gaia.json`)
    }
    return item
}

// Helper to get building config for an item - throws if not found
export function getBuildingItemConfig(config: BuildingConfig, name: string): BuildingConfigItem {
    const item = config.items.find(i => i.building === name)
    if (!item) {
        throw new Error(`No building config found for: "${name}". Please add it to server/config/buildings.json`)
    }
    return item
}

// Convert hex color string to number for PixiJS
export function hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16)
}

// Statistics types
export interface PlayerTimeSlice {
    player: number
    player_name: string
    eapm: number
    t_start: number
    t_end: number
    actions_in_window: number
    n_units_moved_in_window: number
    scout_activity_in_window: number
    total_unit_count: number
    total_building_count: number
    current_age: string
    resource_count: number | null
    total_objects_snapshot: number | null
    all_buildings_existing: string
    all_research_existing: string[]
    all_units_existing: number[]
    // Dynamic action type counts
    [key: `actions_in_window_${string}`]: number
}

export type GameStatistics = PlayerTimeSlice[]
