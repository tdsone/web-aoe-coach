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

// Color mapping for buildings
export const BUILDING_COLORS: Record<string, number> = {
    'Town Center': 0xe67e22,
    'House': 0xcd853f,
    'Barracks': 0xc0392b,
    'Archery Range': 0x8e44ad,
    'Stable': 0x27ae60,
    'Blacksmith': 0x7f8c8d,
    'Market': 0xf39c12,
    'Monastery': 0x9b59b6,
    'Castle': 0x34495e,
    'University': 0x2980b9,
    'Siege Workshop': 0x6c3483,
    'Mill': 0xf4d03f,
    'Lumber Camp': 0x784212,
    'Mining Camp': 0x5d6d7e,
    'Farm': 0x82e0aa,
    'Dock': 0x5dade2,
    'Watch Tower': 0x99a3a4,
    'Guard Tower': 0x7b7d7d,
    'Keep': 0x566573,
    'Bombard Tower': 0x2c3e50,
    'default': 0xa04000,
}

export const getBuildingColor = (name: string): number => {
    return BUILDING_COLORS[name] ?? BUILDING_COLORS['default']
}

// Color mapping for gaia items
export const GAIA_COLORS: Record<string, number> = {
    'Gold Mine': 0xffd700,
    'Stone Mine': 0x9aa0a6,
    'Tree (Oak Forest)': 0x2e7d32,
    'Tree (Oak Autumn)': 0x8b4513,
    'Tree (Bamboo Forest)': 0x228b22,
    'Sheep': 0xffffff,
    'Deer': 0x8b5a2b,
    'Wild Boar': 0x7a1f1f,
    'Relic': 0x00e5ff,
    'Forage Bush': 0x4caf50,
    'default': 0x666666,
}

export const getGaiaColor = (name: string): number => {
    // Check for tree types
    if (name.toLowerCase().includes('tree')) {
        return 0x2e7d32
    }
    return GAIA_COLORS[name] ?? GAIA_COLORS['default']
}

