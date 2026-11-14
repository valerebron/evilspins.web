<template>
  <div class="screen-centered p-4">
    <Card v-if="card" :card="card" click-behavior="self-play" />
    <p v-else class="text-sm text-gray-400">
      /{{ slug }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Card } from 'evilspins-player'
import type { Card as CardType } from '@/types/types'

const props = defineProps<{ slug: string }>()

const slug = computed(() => props.slug)

// Temporary stand-in for the real slug resolution (see the next step).
// TODO: replace with the slug -> Card lookup once the rules are defined.
const DEMO_CARD: CardType = {
  url_audio: 'https://pnb-website-bucket.s3.us-east-2.amazonaws.com/samples/audio/flac/sample-audio-30s.flac',
  url_image: 'https://i.ebayimg.com/images/g/LawAAOSwtutcWxl1/s-l1200.jpg',
  blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
  year: 2022,
  month: '03',
  day: '12',
  hour: '09',
  artist: 'artist',
  title: 'title',
  slug: 'title-artist',
  esid: 'a2437ebc84f18abedd31d0c4550e5c40',
  suit: '♥',
  rank: '9',
  createdAt: new Date('2022-03-12T08:00:00.000Z'),
}

const card = computed<CardType | null>(() =>
  slug.value === DEMO_CARD.slug ? DEMO_CARD : null,
)
</script>
