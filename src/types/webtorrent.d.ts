// Minimal typings for WebTorrent's pre-built browser bundle (the package ships no .d.ts).
declare module 'webtorrent/dist/webtorrent.min.js' {
  export interface TorrentFile {
    name: string
    path: string
    length: number
    type: string
    blob(): Promise<Blob>
  }

  export interface Torrent {
    infoHash: string
    name: string
    files: TorrentFile[]
    progress: number
    downloaded: number
    uploaded: number
    length: number
    downloadSpeed: number
    numPeers: number
    magnetURI: string
    ready: boolean
    on(event: string, handler: (...args: unknown[]) => void): this
    once(event: string, handler: (...args: unknown[]) => void): this
    off(event: string, handler: (...args: unknown[]) => void): this
    destroy(): void
  }

  export default class WebTorrent {
    constructor(opts?: { maxConns?: number; tracker?: Record<string, unknown> })
    add(torrentId: string): Torrent
    seed(input: File, opts?: { announce?: string[] }, cb?: (torrent: Torrent) => void): Torrent
    remove(torrentId: string): void
    destroy(): void
    on(event: string, handler: (...args: unknown[]) => void): this
  }
}
