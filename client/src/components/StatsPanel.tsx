import type { PlayerTimeSlice } from '../types/game'

interface StatsPanelProps {
    currentStats: PlayerTimeSlice[]
}

// Player colors matching StatsChart
const PLAYER_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#22C55E', // Green
    '#FBBF24', // Yellow
    '#06B6D4', // Cyan
    '#F472B6', // Pink
]

const AGE_COLORS: Record<string, string> = {
    'DARK_AGE': '#78716c',
    'FEUDAL_AGE': '#22c55e',
    'CASTLE_AGE': '#3b82f6',
    'IMPERIAL_AGE': '#eab308',
}

const AGE_LABELS: Record<string, string> = {
    'DARK_AGE': 'Dark Age',
    'FEUDAL_AGE': 'Feudal Age',
    'CASTLE_AGE': 'Castle Age',
    'IMPERIAL_AGE': 'Imperial Age',
}

export function StatsPanel({ currentStats }: StatsPanelProps) {
    if (!currentStats.length) {
        return (
            <div className="h-full bg-stone-900/95 flex items-center justify-center">
                <div className="text-center text-stone-500">
                    <p className="text-sm">No statistics available</p>
                    <p className="text-xs mt-1">Upload a replay to see stats</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full bg-stone-900/95 overflow-auto">
            <div className="p-4">
                {/* Players grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {currentStats.map((stat, idx) => (
                        <div
                            key={stat.player}
                            className="bg-stone-800/50 rounded-lg border border-stone-700/50 p-4"
                        >
                            {/* Player header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                                    />
                                    <span className="font-semibold text-stone-100">
                                        {stat.player_name || `Player ${stat.player}`}
                                    </span>
                                </div>
                                <span
                                    className="text-xs font-medium px-2 py-0.5 rounded"
                                    style={{
                                        backgroundColor: `${AGE_COLORS[stat.current_age]}20`,
                                        color: AGE_COLORS[stat.current_age]
                                    }}
                                >
                                    {AGE_LABELS[stat.current_age] || stat.current_age}
                                </span>
                            </div>

                            {/* Quick stats */}
                            <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                                <div className="bg-stone-900/50 rounded p-2">
                                    <div className="text-xs text-stone-400">Units</div>
                                    <div className="text-sm font-bold text-amber-300">{stat.total_unit_count}</div>
                                </div>
                                <div className="bg-stone-900/50 rounded p-2">
                                    <div className="text-xs text-stone-400">Buildings</div>
                                    <div className="text-sm font-bold text-blue-300">{stat.total_building_count}</div>
                                </div>
                                <div className="bg-stone-900/50 rounded p-2">
                                    <div className="text-xs text-stone-400">Resources</div>
                                    <div className="text-sm font-bold text-yellow-300">
                                        {stat.resource_count !== null ? Math.round(stat.resource_count) : '—'}
                                    </div>
                                </div>
                                <div className="bg-stone-900/50 rounded p-2">
                                    <div className="text-xs text-stone-400">eAPM</div>
                                    <div className="text-sm font-bold text-green-300">{stat.eapm}</div>
                                </div>
                            </div>

                            {/* Research */}
                            <div className="mb-3">
                                <div className="text-xs text-stone-400 mb-1.5">Research Completed</div>
                                <div className="flex flex-wrap gap-1">
                                    {stat.all_research_existing.length > 0 ? (
                                        stat.all_research_existing.map((research, i) => (
                                            <span
                                                key={i}
                                                className="text-xs px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded border border-purple-700/30"
                                            >
                                                {research}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-stone-500 italic">None yet</span>
                                    )}
                                </div>
                            </div>

                            {/* Buildings */}
                            <div>
                                <div className="text-xs text-stone-400 mb-1.5">Buildings</div>
                                <div className="flex flex-wrap gap-1">
                                    {stat.all_buildings_existing.split('; ')
                                        .filter(b => b && !b.includes('UNKNOWN'))
                                        .map((building, i) => {
                                            const [name, count] = building.split('=')
                                            return (
                                                <span
                                                    key={i}
                                                    className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded border border-blue-700/30"
                                                >
                                                    {name} <span className="text-blue-400">×{count}</span>
                                                </span>
                                            )
                                        })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

