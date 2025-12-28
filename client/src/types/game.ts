export interface GaiaItem {
    x: number
    y: number
    name: string
}

export interface GameState {
    id: string
    mapSize: number
    gaia: GaiaItem[]
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

