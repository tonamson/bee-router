export default function manifest() {
  return {
    name: 'BeeRouter - AI Gateway & Unified Routing',
    short_name: 'BeeRouter',
    description: 'One unified endpoint for all your AI providers. High-performance model routing, quota tracking, and intelligent fallbacks.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D0E12',
    theme_color: '#FFC700',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
