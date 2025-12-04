import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

// ---------------------------------------------
// ESM FIXES: __dirname + express.static
// ---------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const serveStatic = (pathToDir: string) => express['static'](pathToDir)


// ---------------------------------------------
// TYPES
// ---------------------------------------------
type SpaceWeatherMode = 'QUIET' | 'FLR' | 'CME' | 'GST' | 'SEP' | 'HSS' | 'RBE'
type PixelColor = { r: number; g: number; b: number }

type FacadePixel = {
  x: number
  y: number
  color: PixelColor
  source: 'home' | 'visitor'
  createdAt: string
  mode: SpaceWeatherMode
}

type DayState = {
  date: string
  mode: SpaceWeatherMode
  intensity: number
  pixelIndex: number
  updated: boolean
}

type VisitorPixel = {
  color: PixelColor
  createdAt: string
  approxCountry?: string
  approxCity?: string
}

type EarthConditions = { tempC: number; cloudCover: number; solar: number }

// ---------------------------------------------
// ORIGINAL CONSTANTS / HELPERS
// ---------------------------------------------
const GRID_W = parseInt(process.env.GRID_W || '24', 10)
const GRID_H = parseInt(process.env.GRID_H || '12', 10)
const BUILD_LAT = parseFloat(process.env.BUILD_LAT || '40.7128')
const BUILD_LON = parseFloat(process.env.BUILD_LON || '-74.0060')
const PROJECT_START = new Date(process.env.PROJECT_START || '2024-01-01')

const facade: FacadePixel[] = Array.from({ length: GRID_W * GRID_H }, (_, idx) => ({
  x: idx % GRID_W,
  y: Math.floor(idx / GRID_W),
  color: { r: 5, g: 6, b: 10 },
  source: 'home',
  createdAt: new Date(PROJECT_START).toISOString(),
  mode: 'QUIET'
}))

const dayState = new Map<string, DayState>()
const visitorPixels: VisitorPixel[] = []

function clamp(v: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, v))
}

function mix(a: PixelColor, b: PixelColor, weight: number): PixelColor {
  return {
    r: Math.round(a.r * (1 - weight) + b.r * weight),
    g: Math.round(a.g * (1 - weight) + b.g * weight),
    b: Math.round(a.b * (1 - weight) + b.b * weight)
  }
}

function seededNumber(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  return Math.abs(h % 10000) / 10000
}

function pseudoLocation(ip: string) {
  const seed = seededNumber(ip || '0')
  return {
    lat: (seed * 160 - 80).toFixed(4),
    lon: (seed * 340 - 170).toFixed(4),
    city: 'Unknown',
    country: 'Unknown'
  }
}

async function getSpaceWeatherForDay(dateKey: string) {
  const seed = seededNumber(dateKey)
  const buckets: SpaceWeatherMode[] = ['QUIET', 'RBE', 'HSS', 'SEP', 'FLR', 'CME', 'GST']
  const mode = buckets[Math.min(buckets.length - 1, Math.floor(seed * buckets.length))]
  const intensity = Math.min(1, Math.max(0, seed * 0.7 + 0.2))
  return { mode, intensity }
}

function mapSpaceWeatherToColor(mode: SpaceWeatherMode, intensity: number): PixelColor {
  const base = {
    QUIET: { r: 6, g: 10, b: 26 },
    FLR: { r: 255, g: 245, b: 214 },
    CME: { r: 210, g: 80, b: 32 },
    GST: { r: 68, g: 180, b: 105 },
    SEP: { r: 235, g: 198, b: 60 },
    HSS: { r: 90, g: 180, b: 210 },
    RBE: { r: 180, g: 80, b: 210 }
  } satisfies Record<SpaceWeatherMode, PixelColor>

  const scale = 0.2 + 0.8 * Math.min(1, Math.max(0, intensity))

  return {
    r: clamp(base[mode].r * scale),
    g: clamp(base[mode].g * scale),
    b: clamp(base[mode].b * scale)
  }
}

async function getEarthConditions(lat: number, lon: number, dateKey: string) {
  const seed = seededNumber(`${lat}:${lon}:${dateKey}`)
  return {
    tempC: -10 + seed * 45,
    cloudCover: seed * 100,
    solar: 0.1 + 0.9 * Math.abs(Math.sin(seed * Math.PI))
  }
}

function mapEarthToColor(tempC: number, cloudCover: number, solar: number): PixelColor {
  const clampedTemp = Math.max(-20, Math.min(40, tempC))
  const tNorm = (clampedTemp + 20) / 60
  const r = 30 + tNorm * 200
  const g = 50 + (1 - Math.abs(0.5 - tNorm) * 2) * 140
  const b = 180 - tNorm * 150
  const saturation = 0.3 + 0.7 * (1 - cloudCover / 100)
  const brightness = 0.2 + 0.8 * solar
  return {
    r: clamp(r * saturation * brightness),
    g: clamp(g * saturation * brightness),
    b: clamp(b * saturation * brightness)
  }
}

async function ensureDay(dateKey: string) {
  let current = dayState.get(dateKey)
  if (!current) {
    const { mode, intensity } = await getSpaceWeatherForDay(dateKey)
    const daysSinceStart = Math.floor((new Date(dateKey).getTime() - PROJECT_START.getTime()) / 86400000)
    const pixelIndex = ((daysSinceStart % (GRID_W * GRID_H)) + (GRID_W * GRID_H)) % (GRID_W * GRID_H)
    current = { date: dateKey, mode, intensity, pixelIndex, updated: false }
    dayState.set(dateKey, current)
  }

  if (!current.updated) {
    const earth = await getEarthConditions(BUILD_LAT, BUILD_LON, dateKey)
    const final = mix(mapEarthToColor(earth.tempC, earth.cloudCover, earth.solar),
                      mapSpaceWeatherToColor(current.mode, current.intensity),
                      0.3)

    const idx = current.pixelIndex
    facade[idx] = {
      x: idx % GRID_W,
      y: Math.floor(idx / GRID_W),
      color: final,
      source: 'home',
      createdAt: new Date().toISOString(),
      mode: current.mode
    }

    current.updated = true
  }

  return current
}

async function buildVisitorPixel(dateKey: string, lat: number, lon: number) {
  const day = await ensureDay(dateKey)
  const earth = await getEarthConditions(lat, lon, dateKey)
  return mix(mapEarthToColor(earth.tempC, earth.cloudCover, earth.solar),
             mapSpaceWeatherToColor(day.mode, day.intensity),
             0.3)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------
// EXPRESS APP
// ---------------------------------------------
const app = express()
app.use(cors())
app.use(express.json())

// ---------------------------------------------
// STATIC ASSET HOSTING (FIXED FOR ESM)
// ---------------------------------------------
const assetsDir = path.join(__dirname, '../assets')
app.use('/assets', serveStatic(assetsDir))

// ---------------------------------------------
// ASSET SCANNER
// ---------------------------------------------
function walk(dir: string, base: string): string[] {
  let out: string[] = []
  const list = fs.readdirSync(dir)

  for (const file of list) {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)

    if (stat.isDirectory()) {
      out = out.concat(walk(full, `${base}/${file}`))
    } else if (/\.(png|jpg|jpeg|svg)$/i.test(file)) {
      out.push(`${base}/${file}`)
    }
  }
  return out
}

app.get('/api/assets', (_req, res) => {
  try {
    const files = walk(assetsDir, '/assets')
    res.json({ assets: files })
  } catch (e) {
    console.error('Asset scan error:', e)
    res.status(500).json({ error: 'asset_scan_failed' })
  }
})

// ---------------------------------------------
// ORIGINAL ENDPOINTS
// ---------------------------------------------
app.get('/api/state', async (_req, res) => {
  const key = todayKey()
  const current = await ensureDay(key)
  res.json({
    size: { w: GRID_W, h: GRID_H },
    mark: current.pixelIndex,
    grid: facade,
    recent: visitorPixels.slice(-8).map(v => v.color)
  })
})

app.post('/api/visit', async (req, res) => {
  const key = todayKey()
  const loc = pseudoLocation(req.ip || '0.0.0.0')
  const lat = parseFloat(String(loc.lat)) || BUILD_LAT
  const lon = parseFloat(String(loc.lon)) || BUILD_LON
  const echo = await buildVisitorPixel(key, lat, lon)
  const day = await ensureDay(key)

  visitorPixels.push({
    color: echo,
    createdAt: new Date().toISOString(),
    approxCity: loc.city,
    approxCountry: loc.country
  })

  res.json({
    gift: facade[day.pixelIndex]?.color,
    echo,
    idx: day.pixelIndex
  })
})

// ---------------------------------------------
// STATIC CLIENT
// ---------------------------------------------
const clientDir = path.join(__dirname, '../dist/client')
app.use(serveStatic(clientDir))

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'))
})

// ---------------------------------------------
const PORT = parseInt(process.env.PORT || '4173', 10)
app.listen(PORT, () => {
  console.log(`[themeplay] Server running on ${PORT}`)
})
