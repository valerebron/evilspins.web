<template>
  <div class="screen-centered p-4">
    <div class="w-full max-w-md space-y-4 text-sm">
      <h1 class="text-base font-semibold">Seed local (dev)</h1>
      <p class="text-gray-500">
        Transmission ne peut pas servir un client WebTorrent (TCP/UDP seulement).
        Choisis ici le fichier audio à seeder, puis ouvre le lien dans un autre onglet :
        garde celui-ci ouvert pendant le téléchargement.
      </p>

      <input
        type="file"
        accept="audio/*"
        class="block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-xs file:text-white"
        @change="onFileChange"
      />

      <p v-if="error" class="text-red-500">{{ error }}</p>

      <p v-else-if="isPreparing" class="text-gray-500">
        Préparation de {{ fileName }}… (hachage du fichier)
      </p>

      <div v-else-if="infoHash" class="space-y-2">
        <p class="break-all">
          hash : <code class="rounded bg-gray-100 px-1">{{ infoHash }}</code>
        </p>
        <p class="break-all text-xs text-gray-500">magnet : {{ magnetURI }}</p>
        <p class="text-gray-500">pairs : {{ peers }} · envoyé : {{ uploaded }}</p>
        <a :href="`/${infoHash}`" target="_blank" rel="noopener" class="inline-block underline">
          Ouvrir /{{ infoHash.slice(0, 8) }}… dans un nouvel onglet
        </a>
      </div>
      <p v-else class="text-gray-400">Aucun fichier sélectionné.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { TRACKERS } from '@/utils/torrent'
import type WebTorrentClient from 'webtorrent/dist/webtorrent.min.js'
import type { Torrent } from 'webtorrent/dist/webtorrent.min.js'

const infoHash = ref('')
const magnetURI = ref('')
const peers = ref(0)
const uploaded = ref('0 B')
const error = ref('')
const fileName = ref('')
const isPreparing = ref(false)

let client: WebTorrentClient | null = null
let torrent: Torrent | null = null

const formatBytes = (bytes: number) => {
  const units = ['kB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${bytes < 1024 ? bytes : value.toFixed(1)} ${bytes < 1024 ? 'B' : units[unit]}`
}

const reset = () => {
  torrent = null
  client?.destroy()
  client = null
  infoHash.value = ''
  magnetURI.value = ''
  peers.value = 0
  uploaded.value = '0 B'
  error.value = ''
  fileName.value = ''
  isPreparing.value = false
}

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  reset()
  fileName.value = file.name
  isPreparing.value = true

  try {
    const { default: WebTorrent } = await import('webtorrent/dist/webtorrent.min.js')
    client = new WebTorrent()
    torrent = client.seed(file, { announce: TRACKERS }, (seeded) => {
      // The infohash only exists once the file has been hashed.
      isPreparing.value = false
      infoHash.value = seeded.infoHash
      magnetURI.value = seeded.magnetURI
      peers.value = seeded.numPeers
    })

    const seededTorrent = torrent
    seededTorrent.on('wire', () => {
      peers.value = seededTorrent.numPeers
    })
    seededTorrent.on('upload', () => {
      uploaded.value = formatBytes(seededTorrent.uploaded)
    })
    seededTorrent.on('error', (caught) => {
      isPreparing.value = false
      error.value = caught instanceof Error ? caught.message : String(caught)
    })
  } catch (caught) {
    isPreparing.value = false
    error.value = caught instanceof Error ? caught.message : String(caught)
  }
}

onBeforeUnmount(reset)
</script>
