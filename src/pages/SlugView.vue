<template>
  <div class="screen-centered p-4">
    <Card v-if="card" :card="card" click-behavior="self-play" />
    <div v-else-if="status === 'loading'" class="text-center text-sm text-gray-400">
      <p>torrent {{ slug }}</p>
      <p class="mt-2 tabular-nums">{{ Math.round(progress * 100) }}%</p>
    </div>
    <p v-else-if="status === 'error'" class="max-w-xs text-center text-sm text-red-400">
      {{ error }}
    </p>
    <p v-else class="text-sm text-gray-400">/{{ slug }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Card } from 'evilspins-player'
import type { CardData } from '@/types/types'
import { downloadTorrentAudio, isTorrentInfoHash } from '@/utils/torrent'

const props = defineProps<{ slug: string }>()

const slug = computed(() => props.slug)

const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const progress = ref(0)
const error = ref('')
const card = ref<CardData | null>(null)

// Temporary stand-in for the real slug resolution (see the next step).
// TODO: replace with the slug -> CardData lookup once the rules are defined.
const DEMO_SLUG = 'title-artist'
const DEMO_CARD: CardData = {
  audioUrl: 'https://pnb-website-bucket.s3.us-east-2.amazonaws.com/samples/audio/flac/sample-audio-30s.flac',
  imageUrl: 'https://i.ebayimg.com/images/g/LawAAOSwtutcWxl1/s-l1200.jpg',
  blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
  year: 2022,
  artist: 'artist',
  title: 'title',
  suit: '♥',
  rank: '9',
}

let teardown: (() => void) | null = null
let runId = 0

const stop = () => {
  teardown?.()
  teardown = null
  card.value = null
}

const toCard = (torrent: {
  infoHash: string
  name: string
  audioUrl: string
  imageUrl?: string
}): CardData => ({
  audioUrl: torrent.audioUrl,
  imageUrl: torrent.imageUrl,
  title: torrent.name.replace(/\.[^.]+$/, '') || torrent.infoHash,
  artist: 'unknown',
  year: new Date().getFullYear(),
})

const resolveSlug = async (value: string) => {
  const run = ++runId
  stop()
  status.value = 'idle'
  error.value = ''
  progress.value = 0

  if (!isTorrentInfoHash(value)) {
    if (value === DEMO_SLUG) {
      card.value = DEMO_CARD
      status.value = 'ready'
    }
    return
  }

  status.value = 'loading'
  try {
    const torrent = await downloadTorrentAudio(value, {
      onProgress: (value) => {
        if (run === runId) progress.value = value
      },
    })
    if (run !== runId) {
      torrent.destroy()
      return
    }
    teardown = torrent.destroy
    card.value = toCard(torrent)
    status.value = 'ready'
  } catch (caught) {
    if (run !== runId) return
    error.value = caught instanceof Error ? caught.message : String(caught)
    status.value = 'error'
  }
}

watch(slug, resolveSlug, { immediate: true })

onBeforeUnmount(() => {
  runId++
  stop()
})
</script>
