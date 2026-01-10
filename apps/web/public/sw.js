// Service Worker for Cursor Agent Manager PWA
// Version: 2.0.0 - Network First strategy for fresh content

const CACHE_NAME = "cursor-agent-manager-v2"
const RUNTIME_CACHE = "cursor-agent-manager-runtime-v2"

// Assets to cache on install (only static assets, not pages)
const PRECACHE_ASSETS = ["/manifest.json"]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Failed to precache some assets:", err)
      })
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
          })
          .map((cacheName) => {
            return caches.delete(cacheName)
          })
      )
    })
  )
  return self.clients.claim()
})

// Fetch event - Network First for pages, Cache First for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Skip API requests (they should always be fresh)
  if (url.pathname.startsWith("/api/")) {
    return
  }

  // Skip auth requests (they need to be fresh)
  if (url.pathname.startsWith("/api/auth/")) {
    return
  }

  // Network First strategy for navigation requests (pages)
  // This ensures users always get the latest content
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response for caching
          const responseToCache = response.clone()

          // Cache successful responses for offline fallback
          if (response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }

          return response
        })
        .catch(() => {
          // Network failed, try cache as fallback
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // If no cache, return offline page
            return caches.match("/")
          })
        })
    )
    return
  }

  // Cache First strategy for static assets (JS, CSS, images, fonts)
  // This improves performance for assets that don't change often
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update cache in background (stale-while-revalidate)
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseToCache = response.clone()
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseToCache)
              })
            }
          })
          .catch(() => {
            // Network failed, that's okay - we have cache
          })
        return cachedResponse
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          // Cache successful responses
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // Network failed and no cache - return error
          return new Response("Network error", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
          })
        })
    })
  )
})

// Message event - handle messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
