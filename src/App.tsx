import React, { useEffect, useMemo, useState } from 'react'

type PixelColor = { r: number; g: number; b: number }

type FacadePixel = {
  x: number
  y: number
  color: PixelColor
  source: 'home' | 'visitor'
  createdAt: string
  mode: string
}

type GridState = {
  size: { w: number; h: number }
  mark: number
  grid: FacadePixel[]
  recent: PixelColor[]
}

type VisitResponse = {
  gift: PixelColor
  echo: PixelColor
  idx: number
}

const toCss = (c?: PixelColor) => `rgb(${c?.r ?? 0}, ${c?.g ?? 0}, ${c?.b ?? 0})`

export default function App() {
  const [state, setState] = useState<GridState | null>(null)
  const [personal, setPersonal] = useState<PixelColor | null>(null)
  const [gift, setGift] = useState<PixelColor | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchState = async () => {
    const res = await fetch('/api/state')
    const data = await res.json()
    setState(data)
  }

  const visit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/visit', { method: 'POST' })
      const data: VisitResponse = await res.json()
      setPersonal(data.echo)
      setGift(data.gift)
      await fetchState()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
    visit()
  }, [])

  const cells = useMemo(() => {
    if (!state) return []
    const map = new Map<string, FacadePixel>()
    state.grid.forEach(p => map.set(`${p.x}-${p.y}`, p))
    return Array.from({ length: state.size.w * state.size.h }, (_, idx) => {
      const x = idx % state.size.w
      const y = Math.floor(idx / state.size.w)
      const key = `${x}-${y}`
      return map.get(key) ?? {
        x,
        y,
        color: { r: 5, g: 6, b: 10 },
        source: 'home',
        createdAt: '',
        mode: 'QUIET'
      }
    })
  }, [state])

  return (
    <div className="page">
      <div className="header">
        <div className="title">pattern</div>
        <button className="ghost" onClick={visit} disabled={loading} aria-label="refresh">
          {loading ? '…' : 'refresh'}
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${state?.size.w || 1}, 1fr)` }}>
        {cells.map((cell, idx) => (
          <div
            key={`${cell.x}-${cell.y}`}
            className={`cell ${state?.mark === idx ? 'is-marked' : ''}`}
            style={{ backgroundColor: toCss(cell.color) }}
          />
        ))}
      </div>

      <div className="footer">
        <div className="token">
          <div className="label">echo</div>
          <div className="swatch" style={{ backgroundColor: toCss(personal || state?.recent?.slice(-1)[0]) }} />
        </div>
        <div className="token">
          <div className="label">gift</div>
          <div className="swatch" style={{ backgroundColor: toCss(gift) }} />
        </div>
        <div className="token trail">
          <div className="label">trace</div>
          <div className="trail-row">
            {(state?.recent || []).map((c, idx) => (
              <span key={idx} className="crumb" style={{ backgroundColor: toCss(c) }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
