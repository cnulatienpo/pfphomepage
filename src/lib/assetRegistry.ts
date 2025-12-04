/**
 * AssetRegistry (frontend version)
 * Fetches all assets from the backend and organizes them
 */

export interface MaterialAsset {
  id: string
  url: string
  name: string
  type: string
  folder: string
  ext: string
}

export class AssetRegistry {
  ready = false
  materials: Map<string, MaterialAsset> = new Map()
  byType: Map<string, MaterialAsset[]> = new Map()
  byFolder: Map<string, MaterialAsset[]> = new Map()
  thumbnails: Map<string, string> = new Map()

  async scan() {
    console.log('[AssetRegistry] Fetching /api/assets…')

    const response = await fetch('/api/assets')
    if (!response.ok) {
      console.error('[AssetRegistry] Failed to fetch asset list')
      return 0
    }

    const { assets } = await response.json()
    let count = 0

    for (const url of assets) {
      const name = url.split('/').pop()!
      const folder = url.split('/').slice(0, -1).join('/')
      const ext = name.split('.').pop()!.toLowerCase()
      const id = url.replace(/\//g, '-')

      const type = this.inferType(name, folder)

      const mat: MaterialAsset = {
        id,
        url,
        name,
        ext,
        type,
        folder
      }

      this.materials.set(id, mat)

      if (!this.byType.has(type)) this.byType.set(type, [])
      this.byType.get(type)!.push(mat)

      if (!this.byFolder.has(folder)) this.byFolder.set(folder, [])
      this.byFolder.get(folder)!.push(mat)

      count++
    }

    this.ready = true
    console.log(`[AssetRegistry] Loaded ${count} materials`)
    window.dispatchEvent(new CustomEvent('assets:ready', { detail: { count } }))

    return count
  }

  inferType(name: string, folder: string) {
    const lower = `${name.toLowerCase()} ${folder.toLowerCase()}`

    if (lower.includes('scrib') || lower.includes('mark')) return 'mark'
    if (lower.includes('shape') || lower.includes('block')) return 'shape'
    if (lower.includes('font') || lower.includes('cursive')) return 'font'
    if (lower.includes('palette') || lower.includes('color')) return 'palette'
    if (lower.includes('pattern')) return 'pattern'
    if (lower.includes('paper') || lower.includes('texture') || lower.includes('scan')) return 'texture'

    return 'texture'
  }

  getAll(type?: string) {
    if (!type) return Array.from(this.materials.values())
    return this.byType.get(type) || []
  }

  getRandom(type?: string) {
    const items = this.getAll(type)
    if (!items.length) return null
    return items[Math.floor(Math.random() * items.length)]
  }

  async getThumbnail(id: string, maxSize = 100): Promise<string | null> {
    if (this.thumbnails.has(id)) return this.thumbnails.get(id)!

    const mat = this.materials.get(id)
    if (!mat) return null

    const img = new Image()
    img.src = mat.url

    await img.decode().catch(() => null)

    const canvas = document.createElement('canvas')
    const scale = maxSize / Math.max(img.width, img.height)
    canvas.width = img.width * scale
    canvas.height = img.height * scale

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const blob = canvas.toDataURL()
    this.thumbnails.set(id, blob)
    return blob
  }
}

export const assetRegistry = new AssetRegistry()

// Auto-scan:
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    assetRegistry.scan()
  })
}
