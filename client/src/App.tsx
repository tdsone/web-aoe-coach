import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { GameMap } from './components/GameMap'
import { StatsChart } from './components/StatsChart'
import { StatsPanel } from './components/StatsPanel'
import type { GaiaItem, BuildingItem, GaiaConfig, BuildingConfig, GameStatistics, PlayerTimeSlice } from './types/game'
import JSZip from 'jszip'

type ViewMode = 'upload' | 'map'
type InputMode = 'upload' | 'matches'

interface User {
  name: string
  profileId: number
}

interface Match {
  matchId: string
  dateTime: string
  mapType: string
  civilization: string
  civilizationID: number
  winLoss: string
  matchLength: number
}

// Civilization ID to name mapping
const CIVILIZATION_MAP: Record<number, string> = {
  5: "Britons",
  15: "Franks",
  17: "Goths",
  41: "Teutons",
  23: "Japanese",
  11: "Chinese",
  9: "Byzantines",
  32: "Persians",
  36: "Saracens",
  42: "Turks",
  44: "Vikings",
  31: "Mongols",
  10: "Celts",
  39: "Spanish",
  1: "Aztecs",
  30: "Maya",
  19: "Huns",
  25: "Koreans",
  22: "Italians",
  21: "Hindustanis",
  20: "Incas",
  27: "Magyars",
  38: "Slavs",
  34: "Portuguese",
  14: "Ethiopians",
  29: "Malians",
  3: "Berbers",
  24: "Khmer",
  28: "Malay",
  8: "Burmese",
  43: "Vietnamese",
  6: "Bulgarians",
  40: "Tatars",
  12: "Cumans",
  26: "Lithuanians",
  7: "Burgundians",
  37: "Sicilians",
  33: "Poles",
  4: "Bohemians",
  13: "Dravidians",
  2: "Bengalis",
  18: "Gurjaras",
  35: "Romans",
  0: "Armenians",
  16: "Georgians",
  45: "Achaemenids",
  46: "Athenians",
  47: "Spartans",
  48: "Shu",
  49: "Wu",
  50: "Wei",
  51: "Jurchens",
  52: "Khitans",
  53: "Macedonians",
  54: "Thracians",
  55: "Puru",
}

// Map ID to name mapping
const MAP_ID_MAP: Record<string, string> = {
  "9": "Arabia",
  "10": "Archipelago",
  "11": "Baltic",
  "12": "Black Forest",
  "13": "Coastal",
  "14": "Continental",
  "15": "Crater Lake",
  "16": "Fortress",
  "17": "Gold Rush",
  "18": "Highland",
  "19": "Islands",
  "20": "Mediterranean",
  "21": "Migration",
  "22": "Rivers",
  "23": "Team Islands",
  "24": "Full Random",
  "25": "Scandinavia",
  "26": "Mongolia",
  "27": "Yucatan",
  "28": "Salt Marsh",
  "29": "Arena",
  "30": "King of the Hill",
  "31": "Oasis",
  "32": "Ghost Lake",
  "33": "Nomad",
  "34": "Canals",
  "35": "Capricious",
  "36": "Dingos",
  "37": "Graveyards",
  "38": "Metropolis",
  "40": "Paradise Island",
  "41": "Pilgrims",
  "42": "Prairie",
  "43": "Seasons",
  "44": "Sherwood Forest",
  "45": "Sherwood Heroes",
  "46": "Shipwreck",
  "47": "Team Glaciers",
  "48": "The Unknown",
  "49": "Spain",
  "50": "England",
  "51": "Mideast",
  "52": "Texas",
  "53": "Italy",
  "54": "Caribbean",
  "55": "France",
  "56": "Jutland",
  "57": "Nippon",
  "58": "Byzantium",
  "67": "Acropolis",
  "68": "Budapest",
  "69": "Cenotes",
  "70": "City of Lakes",
  "71": "Golden Pit",
  "72": "Hideout",
  "73": "Hill Fort",
  "74": "Lombardia",
  "75": "Steppe",
  "76": "Valley",
  "77": "MegaRandom",
  "78": "Hamburger",
  "79": "CtR Random",
  "80": "CtR Monsoon",
  "81": "CtR Pyramid Descent",
  "82": "CtR Spiral",
  "83": "Kilimanjaro",
  "84": "Mountain Pass",
  "85": "Nile Delta",
  "86": "Serengeti",
  "87": "Socotra",
  "88": "Amazon",
  "89": "China",
  "90": "Horn of Africa",
  "91": "India",
  "92": "Madagascar",
  "93": "West Africa",
  "94": "Bohemia",
  "95": "Earth",
  "96": "Canyons",
  "97": "Enemy Archipelago",
  "98": "Enemy Islands",
  "99": "Far Out",
  "100": "Front Line",
  "101": "Inner Circle",
  "102": "Motherland",
  "103": "Open Plains",
  "104": "Ring of Water",
  "105": "Snakepit",
  "106": "The Eye",
  "107": "Australia",
  "108": "Indochina",
  "109": "Indonesia",
  "110": "Strait of Malacca",
  "111": "Philippines",
  "112": "Bog Islands",
  "113": "Mangrove Jungle",
  "114": "Pacific Islands",
  "115": "Sandbank",
  "116": "Water Nomad",
  "117": "Jungle Islands",
  "118": "Holy Line",
  "119": "Border Stones",
  "120": "Yin Yang",
  "121": "Jungle Lanes",
  "122": "Alpine Lakes",
  "123": "Bogland",
  "125": "Ravines",
  "124": "Mountain Ridge",
  "126": "Wolf Hill",
  "127": "Swirling River",
  "128": "Twin Forests",
  "129": "Journey South",
  "130": "Snake Forest",
  "131": "Sprawling Streams",
  "132": "Antarctica",
  "133": "Aral Sea",
  "134": "Black Sea",
  "135": "Caucasus",
  "136": "Siberia",
  "139": "Golden Swamp",
  "140": "Four Lakes",
  "141": "Land Nomad",
  "142": "Battle On Ice",
  "143": "El Dorado",
  "144": "Fall of Axum",
  "145": "Fall of Rome",
  "146": "Majapahit Empire",
  "147": "Amazon Tunnel",
  "148": "Coastal Forest",
  "149": "African Clearing",
  "150": "Atacama",
  "151": "Seize the Mountain",
  "152": "Crater",
  "153": "Crossroads",
  "154": "Michi",
  "155": "Team Moats",
  "156": "Volcanic Island",
  "157": "Acclivity",
  "158": "Eruption",
  "159": "Frigid Lake",
  "160": "Greenland",
  "161": "Lowland",
  "162": "Marketplace",
  "163": "Meadow",
  "164": "Mountain Range",
  "165": "Northern Isles",
  "166": "Ring Fortress",
  "167": "Runestones",
  "168": "Aftermath",
  "169": "Enclosed",
  "170": "Haboob",
  "171": "Kawasan",
  "172": "Land Madness",
  "173": "Sacred Springs",
  "174": "Wade",
  "175": "Morass",
  "176": "Shoals",
  "177": "Cliffbound",
  "178": "Isthmus",
  "179": "Dunesprings",
  "180": "Golden Stream",
  "181": "Mountain Dunes",
  "182": "River Divide",
  "183": "Sandrift",
  "184": "Shrubland",
  "185": "Passage",
  "186": "Hollow Woodlands",
  "187": "Karsts",
  "188": "Glade",
  "189": "Fortified Clearing",
  "190": "QS Arabia",
  "191": "QS Fortified Clearing",
  "193": "QS Nomad",
  "195": "QS Arena",
  "199": "Graupel",
  "200": "Stranded",
  "201": "Forest Breach",
  "202": "Border Dispute",
  "203": "Graupel",
  "204": "Chaos Pit",
  "205": "Mired",
  "206": "Murkwood",
  "214": "QS Runestones",
  "215": "QS Arena",
  "216": "QS Black Forest",
  "217": "Great Wall",
  "10875": "Arabia",
  "10876": "Archipelago",
  "10877": "Baltic",
  "10878": "Black Forest",
  "10879": "Coastal",
  "10880": "Continental",
  "10881": "CraterLake",
  "10882": "Fortress",
  "10883": "Gold Rush",
  "10884": "Highland",
  "10885": "Islands",
  "10886": "Mediterranean",
  "10887": "Migration",
  "10888": "Rivers",
  "10889": "Team Islands",
  "10891": "Scandinavia",
  "10892": "Mongolia",
  "10894": "Yucatan",
  "10893": "SaltMarsh",
  "10895": "Arena",
  "10897": "Oasis",
  "10898": "Ghost Lake",
  "10901": "Nomad",
  "10985": "Canals",
  "10986": "Capricious",
  "10987": "Dingos",
  "10988": "Graveyards",
  "10989": "Metropolis",
  "10946": "Moats",
  "10991": "Paradise Island",
  "10992": "Pilgrims",
  "10993": "Prairie",
  "10994": "Seasons",
  "10995": "Sherwood Forest",
  "10996": "Sherwood Heroes",
  "10997": "Shipwreck",
  "10998": "Team Glaciers",
  "10999": "The Unknown",
  "13544": "Spain",
  "13545": "England",
  "13546": "Mideast",
  "13547": "Texas",
  "13548": "Italy",
  "13549": "Caribbean",
  "13550": "France",
  "13551": "Jutland",
  "13552": "Nippon",
  "13553": "Byzantium",
  "10914": "Acropolis",
  "10915": "Budapest",
  "10916": "Cenotes",
  "10917": "City of Lakes",
  "10918": "Goldenpit",
  "10919": "Hideout",
  "10920": "Hill Fort",
  "10921": "Lombardia",
  "10922": "Steppe",
  "10923": "Valley",
  "10924": "Megarandom",
  "10925": "Hamburger",
  "10926": "CtrRandom",
  "10927": "CtrMonsoon",
  "10928": "CtrPyramidDescent",
  "10929": "CtrSpiral",
  "10930": "Golden Swamp",
  "10931": "Four Lakes",
  "10932": "Land Nomad",
  "10933": "Battle On The Ice",
  "10934": "El Dorado",
  "10935": "Fall Of Axum",
  "10936": "Fall Of Rome",
  "10937": "The Majapahit Empire",
  "10938": "AmazonTunnel",
  "10939": "CoastalForest",
  "10940": "African Clearing",
  "10941": "Atacama",
  "10942": "Seize The Mountain",
  "10943": "Crater",
  "10944": "Crossroads",
  "10945": "Michi",
  "10947": "Volcanic Island",
  "10948": "Acclivity",
  "10949": "Eruption",
  "10950": "FrigidLake",
  "10951": "Greenland",
  "10952": "Lowland",
  "10953": "Marketplace",
  "10954": "Meadow",
  "10955": "Mountain Range",
  "10956": "Northern Isles",
  "10957": "Ring Fortress",
  "10958": "Runestones",
  "10959": "Aftermath",
  "10960": "Enclosed",
  "10961": "Haboob",
  "10962": "Kawasan",
  "10963": "Land Madness",
  "10964": "Sacred Springs",
  "10965": "Wade",
  "10966": "Morass",
  "10967": "Shoals",
  "10968": "Cliffbound",
  "10969": "Isthmus",
  "10970": "Dunesprings",
  "10971": "Golden Stream",
  "10972": "Mountain Dunes",
  "10973": "River Divide",
  "10974": "Sandrift",
  "10975": "Shrubland",
  "10976": "Passage",
  "10977": "Hollow Woodlands",
  "10978": "Karsts",
  "10979": "Glade",
  "10980": "Fortified Clearing",
  "10981": "QP Arabia",
  "10982": "QP Fortified Clearing",
  "10984": "QP Nomad",
  "11000": "Stranded",
  "11005": "QP Runestones",
  "11006": "QP Arena",
  "11007": "QP Black Forest",
  "11008": "Manchuria",
  "11009": "Sardis",
  "11010": "Aquarena",
  "11011": "Forest Breach",
  "11012": "Border Dispute",
  "11013": "Graupel",
  "11014": "Chaos Pit",
  "11015": "Mired",
  "11016": "Murkwood",
  "301001": "Citadel",
  "301011": "Inside Out",
  "301012": "Land Nomad",
  "301015": "MegaRandom",
  "301019": "Oasis",
  "301100": "Kilimanjaro",
  "301101": "Mountain Pass",
  "301102": "Nile Delta",
  "301103": "Serengeti",
  "301104": "Socotra",
  "301105": "Amazon",
  "301106": "China",
  "301107": "Horn of Africa",
  "301108": "India",
  "301109": "Madagascar",
  "301110": "West Africa",
  "301111": "Bohemia",
  "301112": "Earth",
  "301113": "Canyons",
  "301114": "Archipelago",
  "301115": "Enemy Islands",
  "301116": "Far Out",
  "301117": "Front Line",
  "301118": "Inner Circle",
  "301119": "Motherland",
  "301120": "Open Plains",
  "301121": "Ring Of Water",
  "301122": "Snake Pit",
  "301123": "The Eye",
  "301124": "Australia",
  "301125": "Indochina",
  "301126": "Indonesia",
  "301127": "Malacca",
  "301128": "Philippines",
  "301129": "Bog Islands",
  "301130": "Mangrove Jungle",
  "301131": "Pacific Islands",
  "301132": "Sandbank",
  "301133": "Water Nomad",
  "301134": "Jungle Islands",
  "301135": "Holy Line",
  "301136": "Border Stones",
  "301137": "Yin Yang",
  "301138": "Jungle Lanes",
  "301139": "Alpine Lakes",
  "301141": "Bogland",
  "301142": "Mountain Range",
  "301143": "Ravines",
  "301144": "Wolf Hill",
  "301150": "Swirling River",
  "301151": "Twin Forests",
  "301152": "Journey South",
  "301153": "Snake Forest",
  "301154": "Sprawling Streams",
  "301145": "Antarctica",
  "301146": "Aral Sea",
  "301147": "Black Sea",
  "301148": "Caucasus",
  "301149": "Siberia"
}

// Helper function to get civilization name from ID
const getCivilizationName = (civilizationID: number): string => {
  return CIVILIZATION_MAP[civilizationID] || `Unknown (${civilizationID})`
}

// Helper function to get map name from map ID
const getMapName = (mapType: string): string => {
  return MAP_ID_MAP[mapType] || mapType
}

function App() {
  const [gameId, setGameId] = useState<string | null>(null)
  const [gaiaItems, setGaiaItems] = useState<GaiaItem[]>([])
  const [buildings, setBuildings] = useState<BuildingItem[]>([])
  const [mapSize, setMapSize] = useState<number>(120)
  const [gameDuration, setGameDuration] = useState<number>(0)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isTimeLoading, setIsTimeLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('upload')
  const [gaiaConfig, setGaiaConfig] = useState<GaiaConfig | null>(null)
  const [buildingConfig, setBuildingConfig] = useState<BuildingConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [statistics, setStatistics] = useState<GameStatistics>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // User and match selection state
  const users: User[] = [
    { name: 'GwentMeiserich', profileId: 4397207 },
    { name: 'florianxolf', profileId: 21145379 },
    { name: 'timon', profileId: 21295635 },
  ]
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [isLoadingReplay, setIsLoadingReplay] = useState(false)

  // Compute age uptimes for each player
  const ageUptimes = useMemo(() => {
    if (!statistics.length) return {}

    const playerIds = [...new Set(statistics.map(s => s.player))].sort()
    const uptimes: Record<number, { age: string; time: number }[]> = {}

    playerIds.forEach(pid => {
      const playerStats = statistics
        .filter(s => s.player === pid)
        .sort((a, b) => a.t_start - b.t_start)

      const ages: { age: string; time: number }[] = []
      let lastAge = ''

      playerStats.forEach(stat => {
        if (stat.current_age !== lastAge) {
          ages.push({ age: stat.current_age, time: stat.t_start })
          lastAge = stat.current_age
        }
      })

      uptimes[pid] = ages
    })

    return uptimes
  }, [statistics])

  // Get current stats slice for each player at current time
  const currentStats = useMemo(() => {
    if (!statistics.length) return []

    const playerIds = [...new Set(statistics.map(s => s.player))].sort()
    return playerIds.map(pid => {
      const playerStats = statistics
        .filter(s => s.player === pid)
        .sort((a, b) => a.t_start - b.t_start)

      // Find the slice containing the current time
      const slice = playerStats.find(s => s.t_start <= currentTime && s.t_end >= currentTime)
        || playerStats[playerStats.length - 1] // Fallback to last slice

      return slice
    }).filter((s): s is PlayerTimeSlice => s !== undefined)
  }, [statistics, currentTime])

  // Fetch configs on mount
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [gaiaRes, buildingRes] = await Promise.all([
          fetch('http://localhost:8000/config/gaia'),
          fetch('http://localhost:8000/config/buildings'),
        ])

        if (!gaiaRes.ok) throw new Error('Failed to fetch gaia config')
        if (!buildingRes.ok) throw new Error('Failed to fetch buildings config')

        const [gaiaData, buildingData] = await Promise.all([
          gaiaRes.json(),
          buildingRes.json(),
        ])

        setGaiaConfig(gaiaData)
        setBuildingConfig(buildingData)
      } catch (err) {
        console.error('Error fetching configs:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch configs')
      } finally {
        setConfigLoading(false)
      }
    }

    fetchConfigs()
  }, [])

  const fetchGaiaLayer = useCallback(async (id: string, t: number = 0) => {
    try {
      const response = await fetch(`http://localhost:8000/layers/gaia?id=${id}&t=${t}`)
      if (!response.ok) throw new Error('Failed to fetch gaia layer')
      const data = await response.json()
      setGaiaItems(data)
    } catch (err) {
      console.error('Error fetching gaia layer:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch gaia layer')
    }
  }, [])

  const fetchBuildingsLayer = useCallback(async (id: string, t: number = 0) => {
    try {
      const response = await fetch(`http://localhost:8000/layers/buildings?id=${id}&t=${t}`)
      if (!response.ok) throw new Error('Failed to fetch buildings layer')
      const data = await response.json()
      setBuildings(data)
    } catch (err) {
      console.error('Error fetching buildings layer:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch buildings layer')
    }
  }, [])

  const fetchStatistics = useCallback(async (id: string) => {
    setStatsLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/game/${id}/statistics`)
      if (!response.ok) {
        // Statistics might not be ready yet (computed in background)
        console.log('Statistics not ready yet')
        return
      }
      const data = await response.json()
      setStatistics(data)
    } catch (err) {
      console.error('Error fetching statistics:', err)
      // Don't show error for statistics - they're optional
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Handle time change - refetch layers at new time
  const handleTimeChange = useCallback(async (newTime: number) => {
    if (!gameId) return

    setCurrentTime(newTime)
    setIsTimeLoading(true)

    try {
      await Promise.all([
        fetchGaiaLayer(gameId, newTime),
        fetchBuildingsLayer(gameId, newTime),
      ])
    } finally {
      setIsTimeLoading(false)
    }
  }, [gameId, fetchGaiaLayer, fetchBuildingsLayer])

  // Format seconds to mm:ss or h:mm:ss
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Fetch matches for selected user
  const fetchMatches = useCallback(async (user: User) => {
    setIsLoadingMatches(true)
    setError(null)
    
    try {
      const response = await fetch('https://api.ageofempires.com/api/GameStats/AgeII/GetMatchList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gamertag: 'unknown user',
          playerNumber: 0,
          undefined: null,
          game: 'age2',
          profileId: user.profileId,
          sortColumn: 'dateTime',
          sortDirection: 'DESC',
          page: 1,
          recordCount: 10,
          matchType: '4',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch matches')
      }

      const data = await response.json()
      setMatches(data.matchList || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matches')
      setMatches([])
    } finally {
      setIsLoadingMatches(false)
    }
  }, [])

  // Handle user selection
  const handleUserSelect = useCallback((user: User) => {
    setSelectedUser(user)
    setSelectedMatch(null)
    fetchMatches(user)
  }, [fetchMatches])

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.aoe2record')) {
      setError('Please upload a valid .aoe2record file')
      return
    }

    setIsLoading(true)
    setError(null)
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

      // The parse endpoint returns game id, map size, and duration
      if (data.id) {
        setGameId(data.id)
        if (data.mapSize) {
          setMapSize(data.mapSize)
        }
        if (data.duration) {
          setGameDuration(data.duration)
        }
        setCurrentTime(0)
        await Promise.all([
          fetchGaiaLayer(data.id, 0),
          fetchBuildingsLayer(data.id, 0),
        ])
        setViewMode('map')

        // Fetch statistics after a short delay (computed in background)
        setTimeout(() => fetchStatistics(data.id), 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [fetchGaiaLayer, fetchBuildingsLayer])

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

  // Download and parse replay
  const handleMatchSelect = useCallback(async (match: Match) => {
    if (!selectedUser) return

    setIsLoadingReplay(true)
    setError(null)
    setSelectedMatch(match)
    setFileName(`Match_${match.matchId}.aoe2record`)

    try {
      // Download the ZIP file from the API
      const replayUrl = `https://api.ageofempires.com/api/GameStats/AgeII/GetMatchReplay/?matchId=${match.matchId}&profileId=${selectedUser.profileId}`
      const replayResponse = await fetch(replayUrl)

      if (!replayResponse.ok) {
        throw new Error('Failed to download replay')
      }

      // Get the ZIP file as an array buffer
      const zipArrayBuffer = await replayResponse.arrayBuffer()
      
      // Extract the ZIP file
      const zip = await JSZip.loadAsync(zipArrayBuffer)
      
      // Find the .aoe2record file inside the ZIP
      const recordFile = Object.keys(zip.files).find(name => name.endsWith('.aoe2record'))
      
      if (!recordFile) {
        throw new Error('No .aoe2record file found in the downloaded ZIP')
      }

      // Extract the .aoe2record file content
      const recordBlob = await zip.files[recordFile].async('blob')
      const file = new File([recordBlob], recordFile, { type: 'application/octet-stream' })

      // Upload to server for parsing
      const formData = new FormData()
      formData.append('file', file)

      const parseResponse = await fetch('http://localhost:8000/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await parseResponse.json()

      if (!parseResponse.ok) {
        throw new Error(data.error || 'Failed to parse replay')
      }

      // The parse endpoint returns game id, map size, and duration
      if (data.id) {
        setGameId(data.id)
        if (data.mapSize) {
          setMapSize(data.mapSize)
        }
        if (data.duration) {
          setGameDuration(data.duration)
        }
        setCurrentTime(0)
        await Promise.all([
          fetchGaiaLayer(data.id, 0),
          fetchBuildingsLayer(data.id, 0),
        ])
        setViewMode('map')

        // Fetch statistics after a short delay (computed in background)
        setTimeout(() => fetchStatistics(data.id), 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoadingReplay(false)
    }
  }, [selectedUser, fetchGaiaLayer, fetchBuildingsLayer, fetchStatistics])

  const handleReset = () => {
    setGameId(null)
    setGaiaItems([])
    setBuildings([])
    setMapSize(120)
    setGameDuration(0)
    setCurrentTime(0)
    setStatistics([])
    setFileName(null)
    setError(null)
    setViewMode('upload')
    setSelectedUser(null)
    setSelectedMatch(null)
    setMatches([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Load demo data for development (optional - remove in production)
  useEffect(() => {
    // Generate some demo gaia items for testing if no data loaded
    if (viewMode === 'map' && gaiaItems.length === 0 && !gameId && false) {
      const demoItems: GaiaItem[] = []

      // Generate trees in clusters
      for (let cluster = 0; cluster < 8; cluster++) {
        const cx = Math.random() * 110 + 5
        const cy = Math.random() * 110 + 5
        for (let i = 0; i < 15; i++) {
          demoItems.push({
            x: cx + (Math.random() - 0.5) * 10,
            y: cy + (Math.random() - 0.5) * 10,
            name: 'Tree (Oak Forest)',
          })
        }
      }

      // Add gold mines
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * 110 + 5
        const y = Math.random() * 110 + 5
        for (let j = 0; j < 4; j++) {
          demoItems.push({
            x: x + (Math.random() - 0.5) * 4,
            y: y + (Math.random() - 0.5) * 4,
            name: 'Gold Mine',
          })
        }
      }

      // Add stone mines
      for (let i = 0; i < 6; i++) {
        const x = Math.random() * 110 + 5
        const y = Math.random() * 110 + 5
        for (let j = 0; j < 4; j++) {
          demoItems.push({
            x: x + (Math.random() - 0.5) * 4,
            y: y + (Math.random() - 0.5) * 4,
            name: 'Stone Mine',
          })
        }
      }

      // Add sheep
      for (let i = 0; i < 8; i++) {
        demoItems.push({
          x: Math.random() * 110 + 5,
          y: Math.random() * 110 + 5,
          name: 'Sheep',
        })
      }

      // Add deer
      for (let i = 0; i < 4; i++) {
        const x = Math.random() * 100 + 10
        const y = Math.random() * 100 + 10
        for (let j = 0; j < 4; j++) {
          demoItems.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 8,
            name: 'Deer',
          })
        }
      }

      // Add boars
      for (let i = 0; i < 4; i++) {
        demoItems.push({
          x: Math.random() * 110 + 5,
          y: Math.random() * 110 + 5,
          name: 'Wild Boar',
        })
      }

      // Add berries
      for (let i = 0; i < 4; i++) {
        const x = Math.random() * 110 + 5
        const y = Math.random() * 110 + 5
        for (let j = 0; j < 6; j++) {
          demoItems.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            name: 'Forage Bush',
          })
        }
      }

      // Add relics
      for (let i = 0; i < 5; i++) {
        demoItems.push({
          x: Math.random() * 110 + 5,
          y: Math.random() * 110 + 5,
          name: 'Relic',
        })
      }

      setGaiaItems(demoItems)
    }
  }, [viewMode, gaiaItems.length, gameId])

  // Show loading state while configs are loading
  if (configLoading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-stone-950 via-stone-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-amber-200">Loading configuration...</p>
        </div>
      </div>
    )
  }

  // Configs must be loaded before proceeding
  if (!gaiaConfig || !buildingConfig) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-stone-950 via-stone-900 to-slate-950 flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-6 max-w-md">
          <p className="text-red-300 text-center">Failed to load configuration. Please refresh the page.</p>
          {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
        </div>
      </div>
    )
  }

  if (viewMode === 'map') {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-stone-950 via-stone-900 to-slate-950 flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-stone-900/80 border-b border-amber-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              Age of Empires II
            </h1>
            {fileName && (
              <>
                <div className="w-px h-6 bg-amber-700/30" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-amber-200/80 text-sm">{fileName}</span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-1.5 text-sm text-amber-300 hover:text-amber-100 border border-amber-700/50 hover:border-amber-500 rounded-lg transition-colors bg-stone-800/50 hover:bg-stone-700/50"
          >
            ← Back
          </button>
        </div>

        {/* Main content area - split layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left half - Time slider and chart */}
          <div className="w-1/2 flex flex-col border-r border-stone-700/50">
            {/* Time slider section */}
            <div className="p-6 bg-stone-900/50 border-b border-stone-700/50">
              <h2 className="font-serif text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 mb-4">
                Timeline
              </h2>
              {gameDuration > 0 && (
                <div className="space-y-4">
                  {/* Time display */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-mono font-bold text-amber-300">
                        {formatTime(currentTime)}
                      </span>
                      {isTimeLoading && (
                        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <span className="text-stone-400 font-mono">
                      / {formatTime(gameDuration)}
                    </span>
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min={0}
                    max={gameDuration}
                    step={1}
                    value={currentTime}
                    onChange={(e) => handleTimeChange(Number(e.target.value))}
                    className="w-full h-3 bg-stone-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-gradient-to-br
                      [&::-webkit-slider-thumb]:from-amber-400
                      [&::-webkit-slider-thumb]:to-amber-600
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:shadow-amber-500/30
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-amber-300
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-110
                      [&::-moz-range-thumb]:w-5
                      [&::-moz-range-thumb]:h-5
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-gradient-to-br
                      [&::-moz-range-thumb]:from-amber-400
                      [&::-moz-range-thumb]:to-amber-600
                      [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-amber-300
                      [&::-moz-range-thumb]:cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(251 191 36) 0%, rgb(251 191 36) ${(currentTime / gameDuration) * 100}%, rgb(68 64 60) ${(currentTime / gameDuration) * 100}%, rgb(68 64 60) 100%)`
                    }}
                  />
                </div>
              )}
            </div>

            {/* Chart area - upper half of remaining space */}
            <div className="flex-1 min-h-0">
              <StatsChart
                statistics={statistics}
                currentTime={currentTime}
                gameDuration={gameDuration || 1}
                isLoading={statsLoading}
                ageUptimes={ageUptimes}
              />
            </div>

            {/* Stats panel - lower half */}
            <div className="flex-1 min-h-0 border-t border-stone-700/50">
              <StatsPanel currentStats={currentStats} />
            </div>
          </div>

          {/* Right half - Game map */}
          <div className="w-1/2 relative">
            <GameMap
              gaiaItems={gaiaItems}
              buildings={buildings}
              gaiaConfig={gaiaConfig}
              buildingConfig={buildingConfig}
              mapSize={mapSize}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    )
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
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

        {/* Mode Selector */}
        <div className="mb-8 flex gap-4 justify-center">
          <button
            onClick={() => {
              setInputMode('upload')
              setSelectedUser(null)
              setMatches([])
              setError(null)
            }}
            className={`
              px-6 py-2 rounded-lg border-2 transition-all duration-200
              ${inputMode === 'upload'
                ? 'border-amber-400 bg-amber-400/20 text-amber-100'
                : 'border-amber-700/50 bg-stone-900/50 text-amber-200/80 hover:border-amber-500/70 hover:bg-stone-800/50'
              }
              backdrop-blur-sm
            `}
          >
            Upload File
          </button>
          <button
            onClick={() => {
              setInputMode('matches')
              setError(null)
            }}
            className={`
              px-6 py-2 rounded-lg border-2 transition-all duration-200
              ${inputMode === 'matches'
                ? 'border-amber-400 bg-amber-400/20 text-amber-100'
                : 'border-amber-700/50 bg-stone-900/50 text-amber-200/80 hover:border-amber-500/70 hover:bg-stone-800/50'
              }
              backdrop-blur-sm
            `}
          >
            Select from Matches
          </button>
        </div>

        <div className="w-full max-w-2xl">
          {/* File Upload Area */}
          {inputMode === 'upload' && (
            <div
              onClick={handleClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative w-full cursor-pointer
                border-2 border-dashed rounded-xl p-12
                transition-all duration-300 ease-out
                ${isDragging
                  ? 'border-amber-400 bg-amber-400/10 scale-[1.02]'
                  : 'border-amber-700/50 bg-stone-900/50 hover:border-amber-500/70 hover:bg-stone-800/50'
                }
                backdrop-blur-sm mb-6
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

          {/* User and Match Selection */}
          {inputMode === 'matches' && (
            <>
              {/* User Selection */}
              <div className="mb-6">
                <label className="block text-amber-200/80 text-sm font-medium mb-3">
                  Select Player
                </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {users.map((user) => (
                <button
                  key={user.profileId}
                  onClick={() => handleUserSelect(user)}
                  className={`
                    px-6 py-4 rounded-lg border-2 transition-all duration-200
                    ${selectedUser?.profileId === user.profileId
                      ? 'border-amber-400 bg-amber-400/20 text-amber-100'
                      : 'border-amber-700/50 bg-stone-900/50 text-amber-200/80 hover:border-amber-500/70 hover:bg-stone-800/50'
                    }
                    backdrop-blur-sm
                  `}
                >
                  <div className="font-medium">{user.name}</div>
                </button>
              ))}
              </div>
              </div>

              {/* Match Selection */}
              {selectedUser && (
            <div className="mb-6">
              <label className="block text-amber-200/80 text-sm font-medium mb-3">
                {isLoadingMatches ? 'Loading matches...' : 'Select Match'}
              </label>
              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-12 border-2 border-amber-700/50 bg-stone-900/50 rounded-lg backdrop-blur-sm">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : matches.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {matches.map((match) => (
                    <button
                      key={match.matchId}
                      onClick={() => handleMatchSelect(match)}
                      disabled={isLoadingReplay}
                      className={`
                        w-full px-4 py-3 rounded-lg border-2 text-left transition-all duration-200
                        ${selectedMatch?.matchId === match.matchId
                          ? 'border-amber-400 bg-amber-400/20'
                          : 'border-amber-700/50 bg-stone-900/50 hover:border-amber-500/70 hover:bg-stone-800/50'
                        }
                        ${isLoadingReplay ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        backdrop-blur-sm
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              match.winLoss === 'Win' 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {match.winLoss}
                            </span>
                            <span className="text-amber-300 font-medium">{getCivilizationName(match.civilizationID)}</span>
                            <span className="text-amber-200/60 text-sm">•</span>
                            <span className="text-amber-200/60 text-sm">{getMapName(match.mapType)}</span>
                          </div>
                          <div className="text-amber-200/50 text-xs">
                            {formatDate(match.dateTime)}
                          </div>
                        </div>
                        {isLoadingReplay && selectedMatch?.matchId === match.matchId && (
                          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin ml-4" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 border-2 border-amber-700/50 bg-stone-900/50 rounded-lg backdrop-blur-sm text-center text-amber-200/60">
                  No matches found
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 px-6 py-4 bg-red-900/30 border border-red-700/50 rounded-lg max-w-2xl w-full">
            <p className="text-red-300 text-center">{error}</p>
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
