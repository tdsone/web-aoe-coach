import { useMemo, useState } from 'react'
import type { GameStatistics } from '../types/game'

interface StatsChartProps {
    statistics: GameStatistics
    currentTime: number
    gameDuration: number
    isLoading: boolean
}

type MetricKey = 'resource_count' | 'total_unit_count' | 'total_building_count' | 'scout_activity_in_window' | 'actions_in_window'

interface MetricConfig {
    key: MetricKey
    label: string
    color: string
    formatter: (v: number) => string
}

const METRICS: MetricConfig[] = [
    { key: 'resource_count', label: 'Total Resources', color: '#fbbf24', formatter: (v) => Math.round(v).toLocaleString() },
    { key: 'total_unit_count', label: 'Units', color: '#22c55e', formatter: (v) => v.toString() },
    { key: 'total_building_count', label: 'Buildings', color: '#3b82f6', formatter: (v) => v.toString() },
    { key: 'scout_activity_in_window', label: 'Scout Activity', color: '#f97316', formatter: (v) => v.toFixed(0) },
    { key: 'actions_in_window', label: 'Actions/Window', color: '#a855f7', formatter: (v) => v.toString() },
]

// Player colors
const PLAYER_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#22C55E', // Green
    '#FBBF24', // Yellow
    '#06B6D4', // Cyan
    '#F472B6', // Pink
]

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

// Compact number formatter for Y-axis labels
function formatCompact(v: number): string {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
    if (Number.isInteger(v)) return v.toString()
    return v.toFixed(1)
}

export function StatsChart({ statistics, currentTime, gameDuration, isLoading }: StatsChartProps) {
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('resource_count')
    const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; time: number; value: number; player: string } | null>(null)

    const metricConfig = METRICS.find(m => m.key === selectedMetric)!

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!statistics.length) return { players: [], minY: 0, maxY: 100, timePoints: [] }

        const playerIds = [...new Set(statistics.map(s => s.player))].sort()
        const timePoints = [...new Set(statistics.map(s => s.t_start))].sort((a, b) => a - b)

        // Get data for each player
        const players = playerIds.map((pid, idx) => {
            const playerStats = statistics.filter(s => s.player === pid)
            const name = playerStats[0]?.player_name || `Player ${pid}`

            const points = timePoints.map(t => {
                const slice = playerStats.find(s => s.t_start === t)
                if (!slice) return null

                let value = slice[selectedMetric]
                if (value === null || value === undefined) return null
                return { time: t, value: value as number }
            }).filter((p): p is { time: number; value: number } => p !== null)

            return {
                id: pid,
                name,
                color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
                points
            }
        })

        // Calculate Y axis bounds
        const allValues = players.flatMap(p => p.points.map(pt => pt.value))
        const minY = Math.min(0, ...allValues)
        const maxY = Math.max(100, ...allValues) * 1.1 // 10% padding

        return { players, minY, maxY, timePoints }
    }, [statistics, selectedMetric])

    // Chart dimensions
    const padding = { top: 20, right: 20, bottom: 40, left: 70 }
    const svgWidth = 800
    const svgHeight = 250

    // Convert data point to SVG coordinates
    const toSvgX = (time: number, svgWidth: number) => {
        const chartWidth = svgWidth - padding.left - padding.right
        return padding.left + (time / gameDuration) * chartWidth
    }

    const toSvgY = (value: number, svgHeight: number) => {
        const chartHeight = svgHeight - padding.top - padding.bottom
        const range = chartData.maxY - chartData.minY
        return padding.top + chartHeight - ((value - chartData.minY) / range) * chartHeight
    }

    // Generate Y axis ticks
    const yTicks = useMemo(() => {
        const range = chartData.maxY - chartData.minY
        const tickCount = 5
        const step = range / tickCount
        return Array.from({ length: tickCount + 1 }, (_, i) => chartData.minY + step * i)
    }, [chartData.minY, chartData.maxY])

    // Generate X axis ticks - dynamically spaced based on game duration
    const xTicks = useMemo(() => {
        const ticks = []
        // Aim for roughly 6-8 ticks max
        let interval = 300 // 5 minutes default
        if (gameDuration > 3600) interval = 600 // 10 min for games > 1 hour
        if (gameDuration > 5400) interval = 900 // 15 min for games > 1.5 hours
        if (gameDuration < 900) interval = 120 // 2 min for short games < 15 min

        for (let t = 0; t <= gameDuration; t += interval) {
            ticks.push(t)
        }
        return ticks
    }, [gameDuration])

    if (isLoading) {
        return (
            <div className="h-full bg-stone-900/95 border-b border-stone-700/50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-stone-400">Loading statistics...</span>
                </div>
            </div>
        )
    }

    if (!statistics.length) {
        return (
            <div className="h-full bg-stone-900/95 border-b border-stone-700/50 flex items-center justify-center">
                <div className="text-center text-stone-500">
                    <p className="text-sm">No statistics available</p>
                    <p className="text-xs mt-1">Upload a replay to see charts</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full bg-stone-900/95 border-b border-stone-700/50 flex flex-col">
            {/* Header with metric selector */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700/50">
                <h2 className="font-serif text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
                    {metricConfig.label}
                </h2>
                <div className="flex gap-2">
                    {METRICS.map(m => (
                        <button
                            key={m.key}
                            onClick={() => setSelectedMetric(m.key)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${selectedMetric === m.key
                                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                                : 'text-stone-400 hover:text-stone-200 border border-stone-700/50 hover:border-stone-600'
                                }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart area */}
            <div className="flex-1 relative p-4">
                <svg
                    className="w-full h-full"
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    onMouseMove={(e) => {
                        const svg = e.currentTarget
                        const rect = svg.getBoundingClientRect()
                        const x = ((e.clientX - rect.left) / rect.width) * svgWidth
                        const time = ((x - padding.left) / (svgWidth - padding.left - padding.right)) * gameDuration

                        // Find closest point
                        let closest: typeof hoveredPoint = null
                        let minDist = Infinity

                        chartData.players.forEach(player => {
                            player.points.forEach(pt => {
                                const dist = Math.abs(pt.time - time)
                                if (dist < minDist && dist < gameDuration * 0.05) {
                                    minDist = dist
                                    closest = {
                                        x: toSvgX(pt.time, svgWidth),
                                        y: toSvgY(pt.value, svgHeight),
                                        time: pt.time,
                                        value: pt.value,
                                        player: player.name
                                    }
                                }
                            })
                        })
                        setHoveredPoint(closest)
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                >
                    {/* Grid lines */}
                    <g className="text-stone-700">
                        {yTicks.map((tick, i) => (
                            <line
                                key={`y-${i}`}
                                x1={padding.left}
                                y1={toSvgY(tick, svgHeight)}
                                x2={svgWidth - padding.right}
                                y2={toSvgY(tick, svgHeight)}
                                stroke="currentColor"
                                strokeOpacity={0.3}
                                strokeDasharray="4,4"
                            />
                        ))}
                        {xTicks.map((tick, i) => (
                            <line
                                key={`x-${i}`}
                                x1={toSvgX(tick, svgWidth)}
                                y1={padding.top}
                                x2={toSvgX(tick, svgWidth)}
                                y2={svgHeight - padding.bottom}
                                stroke="currentColor"
                                strokeOpacity={0.2}
                                strokeDasharray="4,4"
                            />
                        ))}
                    </g>

                    {/* Y axis labels */}
                    <g className="text-stone-400 text-xs">
                        {yTicks.map((tick, i) => (
                            <text
                                key={`y-label-${i}`}
                                x={padding.left - 8}
                                y={toSvgY(tick, svgHeight) + 4}
                                textAnchor="end"
                                fill="currentColor"
                                fontSize="11"
                            >
                                {formatCompact(tick)}
                            </text>
                        ))}
                    </g>

                    {/* X axis labels */}
                    <g className="text-stone-400">
                        {xTicks.map((tick, i) => (
                            <text
                                key={`x-label-${i}`}
                                x={toSvgX(tick, svgWidth)}
                                y={svgHeight - padding.bottom + 20}
                                textAnchor="middle"
                                fill="currentColor"
                                fontSize="11"
                                fontFamily="monospace"
                            >
                                {formatTime(tick)}
                            </text>
                        ))}
                    </g>

                    {/* Current time indicator */}
                    <line
                        x1={toSvgX(currentTime, svgWidth)}
                        y1={padding.top}
                        x2={toSvgX(currentTime, svgWidth)}
                        y2={svgHeight - padding.bottom}
                        stroke="#fbbf24"
                        strokeWidth={2}
                        strokeOpacity={0.8}
                    />

                    {/* Data lines - Step chart style */}
                    {chartData.players.map(player => {
                        if (player.points.length < 2) return null

                        // Build step chart path: horizontal line then vertical step
                        const pathParts: string[] = []
                        player.points.forEach((pt, i) => {
                            const x = toSvgX(pt.time, svgWidth)
                            const y = toSvgY(pt.value, svgHeight)

                            if (i === 0) {
                                pathParts.push(`M ${x} ${y}`)
                            } else {
                                // First draw horizontal line to new x at previous y level
                                const prevY = toSvgY(player.points[i - 1].value, svgHeight)
                                pathParts.push(`L ${x} ${prevY}`)
                                // Then draw vertical line to new y
                                pathParts.push(`L ${x} ${y}`)
                            }
                        })
                        const pathD = pathParts.join(' ')

                        // Build area fill path for step chart
                        const areaPathParts: string[] = [...pathParts]
                        const lastPoint = player.points[player.points.length - 1]
                        const firstPoint = player.points[0]
                        areaPathParts.push(`L ${toSvgX(lastPoint.time, svgWidth)} ${svgHeight - padding.bottom}`)
                        areaPathParts.push(`L ${toSvgX(firstPoint.time, svgWidth)} ${svgHeight - padding.bottom}`)
                        areaPathParts.push('Z')
                        const areaPathD = areaPathParts.join(' ')

                        return (
                            <g key={player.id}>
                                {/* Line */}
                                <path
                                    d={pathD}
                                    fill="none"
                                    stroke={player.color}
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {/* Area fill */}
                                <path
                                    d={areaPathD}
                                    fill={player.color}
                                    fillOpacity={0.1}
                                />
                            </g>
                        )
                    })}

                    {/* Hover point */}
                    {hoveredPoint && (
                        <g>
                            <circle
                                cx={hoveredPoint.x}
                                cy={hoveredPoint.y}
                                r={6}
                                fill="#fbbf24"
                                stroke="#1c1917"
                                strokeWidth={2}
                            />
                        </g>
                    )}
                </svg>

                {/* Hover tooltip */}
                {hoveredPoint && (
                    <div
                        className="absolute bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 pointer-events-none shadow-xl z-10"
                        style={{
                            left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                            top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                            transform: 'translate(-50%, -120%)'
                        }}
                    >
                        <div className="text-xs text-stone-400">{formatTime(hoveredPoint.time)}</div>
                        <div className="text-sm font-semibold text-amber-300">{metricConfig.formatter(hoveredPoint.value)}</div>
                        <div className="text-xs text-stone-300">{hoveredPoint.player}</div>
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-2 left-16 flex gap-4">
                    {chartData.players.map(player => (
                        <div key={player.id} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: player.color }}
                            />
                            <span className="text-xs text-stone-300">{player.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

