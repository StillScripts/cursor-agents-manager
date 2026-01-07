// Service Worker for Cursor Agent Manager PWA
// Version: 3.0.0 - Network First strategy + Push Notifications

const CACHE_NAME = "cursor-agent-manager-v3"
const RUNTIME_CACHE = "cursor-agent-manager-runtime-v3"

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

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  let notificationData = {
    title: "Cursor Agent Manager",
    body: "You have a new notification",
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    tag: "default",
    requireInteraction: false,
    data: {},
  }

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data,
        data: data.data || {},
      }
    } catch (e) {
      // If not JSON, try text
      const text = event.data.text()
      if (text) {
        notificationData.body = text
      }
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions || [],
      vibrate: notificationData.vibrate || [200, 100, 200],
    })
  )
})

// Notification click event - handle user clicking on notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const notificationData = event.notification.data || {}
  const urlToOpen = notificationData.url || "/"

  // Open or focus the app
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus()
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Notification close event - handle user dismissing notification
self.addEventListener("notificationclose", (event) => {
  // Can be used for analytics or cleanup
  console.log("Notification closed:", event.notification.tag)
})
