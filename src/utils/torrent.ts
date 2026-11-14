// POC: resolve a torrent infohash (used as the /:slug) into a playable audio blob.
// WebTorrent in the browser can only reach peers over WebRTC, so the magnet needs WSS trackers.
export const TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.webtorrent.dev',
]

const AUDIO_EXTENSIONS = /\.(flac|mp3|m4a|aac|ogg|oga|opus|wav|webm)$/i
const HEX_HASH = /^[0-9a-f]{40}$/i
const BASE32_HASH = /^[a-z2-7]{32}$/i
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** True when the slug looks like a BitTorrent infohash (hex or base32). */
export function isTorrentInfoHash(value: string): boolean {
  return HEX_HASH.test(value) || BASE32_HASH.test(value)
}

/** Normalize a hex/base32 infohash to lowercase hex, or return null when invalid. */
export function normalizeInfoHash(value: string): string | null {
  if (HEX_HASH.test(value)) return value.toLowerCase()
  if (!BASE32_HASH.test(value)) return null

  let bits = ''
  for (const char of value.toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) return null
    bits += index.toString(2).padStart(5, '0')
  }

  let hex = ''
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    hex += parseInt(bits.slice(offset, offset + 8), 2).toString(16).padStart(2, '0')
  }
  return hex.slice(0, 40)
}

export function buildMagnetURI(infoHash: string): string {
  return `magnet:?xt=urn:btih:${infoHash}${TRACKERS.map((tracker) => `&tr=${encodeURIComponent(tracker)}`).join('')}`
}

export interface TorrentFileSummary {
  name: string
  length: number
  type: string
}

export interface TorrentAudio {
  infoHash: string
  name: string
  audioUrl: string
  /** Cover art embedded in the audio metadata, when present. */
  imageUrl?: string
  files: TorrentFileSummary[]
  /** Stops the torrent and revokes the blob URLs. */
  destroy: () => void
}

interface DownloadOptions {
  onProgress?: (progress: number) => void
  timeoutMs?: number
}

export async function downloadTorrentAudio(
  slug: string,
  { onProgress, timeoutMs = 45_000 }: DownloadOptions = {},
): Promise<TorrentAudio> {
  const infoHash = normalizeInfoHash(slug)
  if (!infoHash) throw new Error('Hash de torrent invalide')

  // Lazy-loaded: the WebTorrent browser bundle is heavy, keep it out of the initial chunk.
  const { default: WebTorrent } = await import('webtorrent/dist/webtorrent.min.js')

  const client = new WebTorrent()
  let audioUrl: string | null = null
  let imageUrl: string | null = null
  const destroy = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    audioUrl = null
    imageUrl = null
    try {
      client.destroy()
    } catch {
      // already destroyed
    }
  }

  try {
    const torrent = client.add(buildMagnetURI(infoHash))
    await waitForMetadata(torrent, timeoutMs)

    const audioFile = torrent.files.find(
      (file) => file.type.startsWith('audio/') || AUDIO_EXTENSIONS.test(file.name),
    )
    if (!audioFile) throw new Error('Aucun fichier audio dans ce torrent')

    const onDownload = () => onProgress?.(torrent.progress)
    torrent.on('download', onDownload)
    onProgress?.(torrent.progress)

    let blob: Blob
    try {
      blob = await audioFile.blob()
    } finally {
      torrent.off('download', onDownload)
    }

    audioUrl = URL.createObjectURL(blob)
    imageUrl = await extractCoverUrl(blob)
    onProgress?.(1)

    return {
      infoHash,
      name: torrent.name,
      audioUrl,
      imageUrl: imageUrl ?? undefined,
      files: torrent.files.map(({ name, length, type }) => ({ name, length, type })),
      destroy,
    }
  } catch (error) {
    destroy()
    throw error
  }
}

/** Reads the first embedded cover art from the downloaded audio, if any. */
async function extractCoverUrl(blob: Blob): Promise<string | null> {
  try {
    const { parseBlob } = await import('music-metadata')
    const { common } = await parseBlob(blob)
    const picture = common.picture?.[0]
    if (!picture) return null
    return URL.createObjectURL(new Blob([new Uint8Array(picture.data)], { type: picture.format }))
  } catch {
    // Cover art is optional: unsupported/corrupt tags must not break playback.
    return null
  }
}

function waitForMetadata(torrent: {
  ready: boolean
  once: (event: string, handler: (...args: unknown[]) => void) => void
  off: (event: string, handler: (...args: unknown[]) => void) => void
}, timeoutMs: number): Promise<void> {
  if (torrent.ready) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      torrent.off('metadata', onMetadata)
      torrent.off('error', onError)
    }
    const onMetadata = () => {
      cleanup()
      resolve()
    }
    const onError = (error: unknown) => {
      cleanup()
      reject(error instanceof Error ? error : new Error(String(error)))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Métadonnées du torrent indisponibles (aucun pair WebRTC joignable ?)'))
    }, timeoutMs)

    torrent.once('metadata', onMetadata)
    torrent.once('error', onError)
  })
}
