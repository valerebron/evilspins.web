import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/pages/HomeView.vue'
import SlugView from '@/pages/SlugView.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    // Dev-only helper to seed a local file over WebRTC; must come before /:slug.
    ...(import.meta.env.DEV
      ? [{ path: '/seed', name: 'seed', component: () => import('@/pages/SeedView.vue') }]
      : []),
    // Everything after the leading slash is the slug, passed to the page as `slug`.
    // The slug is NOT decoded here: vue-router already decodes route params.
    { path: '/:slug', name: 'slug', component: SlugView, props: true },
  ],
})
