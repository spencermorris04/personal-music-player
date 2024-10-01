// public/sw.ts

import { installSerwist } from '@serwist/sw';
import { defaultCache } from '@serwist/next/worker';
import type {
  PrecacheEntry,
  RouteHandlerCallbackOptions,
  RouteMatchCallbackOptions,
} from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ url }: RouteMatchCallbackOptions) =>
        /\.(?:css|js)$/.test(url.pathname),
      handler: async ({ request, event }: RouteHandlerCallbackOptions) => {
        const cache = await caches.open('static-resources');
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
          // Optionally update the cache in the background
          event.waitUntil(
            (async () => {
              const networkResponse = await fetch(request);
              cache.put(request, networkResponse.clone());
            })()
          );
          return cachedResponse;
        } else {
          const networkResponse = await fetch(request);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        }
      },
      // Removed 'options' property
    },
    // Add more custom caching strategies here
  ],
});
