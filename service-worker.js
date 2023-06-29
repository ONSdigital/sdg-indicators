importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js'
);

const {registerRoute, setDefaultHandler} = workbox.routing;
const {CacheableResponsePlugin} = workbox.cacheableResponse;
const {ExpirationPlugin} = workbox.expiration;
const {precacheAndRoute} = workbox.precaching;
const {offlineFallback} = workbox.recipes;

const {
    NetworkFirst,
    StaleWhileRevalidate,
    CacheFirst,
    NetworkOnly,
} = workbox.strategies;
const cacheName = 'install-cache';
setDefaultHandler(new NetworkOnly());
offlineFallback();


// Precache the indicator/goal pages.
self.addEventListener('install', (event) => {
  const populateCache = async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(["/sdg-indicators/1/","/sdg-indicators/2/","/sdg-indicators/3/","/sdg-indicators/4/","/sdg-indicators/5/","/sdg-indicators/6/","/sdg-indicators/7/","/sdg-indicators/8/","/sdg-indicators/9/","/sdg-indicators/10/","/sdg-indicators/11/","/sdg-indicators/12/","/sdg-indicators/13/","/sdg-indicators/14/","/sdg-indicators/15/","/sdg-indicators/16/","/sdg-indicators/17/"]);
    await cache.addAll(["/sdg-indicators/9-3-1/","/sdg-indicators/17-19-2/","/sdg-indicators/16-10-2/","/sdg-indicators/11-6-1/","/sdg-indicators/archived-indicators/13-a-1-archived/","/sdg-indicators/3-a-1/","/sdg-indicators/8-1-1/","/sdg-indicators/10-5-1/","/sdg-indicators/3-1-2/","/sdg-indicators/archived-indicators/2-5-2-archived/","/sdg-indicators/12-6-1/","/sdg-indicators/9-5-2/","/sdg-indicators/8-10-1/","/sdg-indicators/archived-indicators/13-b-1-archived/","/sdg-indicators/3-1-1/","/sdg-indicators/1-b-1/","/sdg-indicators/archived-indicators/8-9-2-archived/","/sdg-indicators/3-3-2/","/sdg-indicators/3-3-4/","/sdg-indicators/16-3-2/","/sdg-indicators/10-a-1/","/sdg-indicators/1-3-1/","/sdg-indicators/8-a-1/","/sdg-indicators/2-5-2/","/sdg-indicators/2-3-1/","/sdg-indicators/4-1-2/","/sdg-indicators/11-1-1/","/sdg-indicators/7-3-1/","/sdg-indicators/17-18-1/","/sdg-indicators/4-a-1/","/sdg-indicators/15-2-1/","/sdg-indicators/1-2-2/","/sdg-indicators/4-2-1/","/sdg-indicators/8-8-2/","/sdg-indicators/4-b-1/","/sdg-indicators/4-1-1/","/sdg-indicators/12-c-1/","/sdg-indicators/1-a-2/","/sdg-indicators/10-7-1/","/sdg-indicators/11-5-1/","/sdg-indicators/3-9-1/","/sdg-indicators/9-1-1/","/sdg-indicators/17-16-1/","/sdg-indicators/8-6-1/","/sdg-indicators/4-4-1/","/sdg-indicators/17-19-1/","/sdg-indicators/8-5-2/","/sdg-indicators/1-5-3/","/sdg-indicators/17-18-3/","/sdg-indicators/3-7-1/","/sdg-indicators/archived-indicators/11-a-1-archived/","/sdg-indicators/archived-indicators/6-3-1-archived/","/sdg-indicators/4-5-1/","/sdg-indicators/14-b-1/","/sdg-indicators/17-4-1/","/sdg-indicators/12-5-1/","/sdg-indicators/6-5-1/","/sdg-indicators/15-1-2/","/sdg-indicators/16-1-3/","/sdg-indicators/10-c-1/","/sdg-indicators/archived-indicators/11-c-1-archived/","/sdg-indicators/17-9-1/","/sdg-indicators/14-5-1/","/sdg-indicators/archived-indicators/2-4-1-archived/","/sdg-indicators/8-3-1/","/sdg-indicators/6-2-1/","/sdg-indicators/archived-indicators/1-a-3-archived/","/sdg-indicators/17-14-1/","/sdg-indicators/10-7-2/","/sdg-indicators/9-1-2/","/sdg-indicators/3-2-2/","/sdg-indicators/17-18-2/","/sdg-indicators/2-2-2/","/sdg-indicators/archived-indicators/4-2-1-archived/","/sdg-indicators/5-1-1/","/sdg-indicators/14-6-1/","/sdg-indicators/11-3-1/","/sdg-indicators/5-a-1/","/sdg-indicators/16-7-2/","/sdg-indicators/3-2-1/","/sdg-indicators/3-b-1/","/sdg-indicators/12-4-2/","/sdg-indicators/3-4-1/","/sdg-indicators/15-8-1/","/sdg-indicators/6-6-1/","/sdg-indicators/3-6-1/","/sdg-indicators/6-3-2/","/sdg-indicators/13-1-3/","/sdg-indicators/2-a-1/","/sdg-indicators/16-9-1/","/sdg-indicators/archived-indicators/15-9-1-archived/","/sdg-indicators/3-d-1/","/sdg-indicators/14-4-1/","/sdg-indicators/4-6-1/","/sdg-indicators/12-b-1/","/sdg-indicators/2-4-1/","/sdg-indicators/17-12-1/","/sdg-indicators/16-5-1/","/sdg-indicators/1-1-1/","/sdg-indicators/archived-indicators/17-5-1-archived/","/sdg-indicators/12-2-2/","/sdg-indicators/16-2-1/","/sdg-indicators/5-5-2/","/sdg-indicators/4-2-2/","/sdg-indicators/8-5-1/","/sdg-indicators/2-3-2/","/sdg-indicators/10-7-3/","/sdg-indicators/15-7-1/","/sdg-indicators/3-b-3/","/sdg-indicators/14-3-1/","/sdg-indicators/9-b-1/","/sdg-indicators/10-2-1/","/sdg-indicators/5-6-1/","/sdg-indicators/16-4-2/","/sdg-indicators/13-a-1/","/sdg-indicators/13-3-1/","/sdg-indicators/11-b-2/","/sdg-indicators/3-d-2/","/sdg-indicators/archived-indicators/12-a-1-archived/","/sdg-indicators/14-1-1/","/sdg-indicators/17-6-1/","/sdg-indicators/2-5-1/","/sdg-indicators/14-2-1/","/sdg-indicators/7-2-1/","/sdg-indicators/4-3-1/","/sdg-indicators/1-4-1/","/sdg-indicators/16-2-2/","/sdg-indicators/5-c-1/","/sdg-indicators/3-5-2/","/sdg-indicators/3-b-2/","/sdg-indicators/2-2-1/","/sdg-indicators/3-3-3/","/sdg-indicators/14-a-1/","/sdg-indicators/3-9-2/","/sdg-indicators/archived-indicators/5-a-2-archived/","/sdg-indicators/9-3-2/","/sdg-indicators/16-1-4/","/sdg-indicators/17-3-1/","/sdg-indicators/14-7-1/","/sdg-indicators/15-3-1/","/sdg-indicators/3-5-1/","/sdg-indicators/13-1-2/","/sdg-indicators/13-2-2/","/sdg-indicators/5-6-2/","/sdg-indicators/16-6-1/","/sdg-indicators/archived-indicators/1-a-1-archived/","/sdg-indicators/15-a-1/","/sdg-indicators/8-7-1/","/sdg-indicators/17-10-1/","/sdg-indicators/16-1-2/","/sdg-indicators/10-4-1/","/sdg-indicators/12-a-1/","/sdg-indicators/archived-7-b-1/","/sdg-indicators/4-7-1/","/sdg-indicators/17-11-1/","/sdg-indicators/7-a-1/","/sdg-indicators/10-1-1/","/sdg-indicators/2-b-1/","/sdg-indicators/11-5-2/","/sdg-indicators/11-6-2/","/sdg-indicators/17-13-1/","/sdg-indicators/15-c-1/","/sdg-indicators/15-4-2/","/sdg-indicators/5-a-2/","/sdg-indicators/15-1-1/","/sdg-indicators/10-7-4/","/sdg-indicators/archived-indicators/1-b-1-archived/","/sdg-indicators/15-6-1/","/sdg-indicators/1-5-2/","/sdg-indicators/12-4-1/","/sdg-indicators/16-8-1/","/sdg-indicators/6-a-1/","/sdg-indicators/6-4-2/","/sdg-indicators/7-b-1/","/sdg-indicators/archived-indicators/17-6-1-archived/","/sdg-indicators/5-2-1/","/sdg-indicators/8-2-1/","/sdg-indicators/6-5-2/","/sdg-indicators/3-3-5/","/sdg-indicators/archived-11-6-1/","/sdg-indicators/17-8-1/","/sdg-indicators/17-7-1/","/sdg-indicators/archived-indicators/15-a-1-archived/","/sdg-indicators/archived-indicators/13-3-1-archived/","/sdg-indicators/12-1-1/","/sdg-indicators/11-7-2/","/sdg-indicators/16-3-1/","/sdg-indicators/9-c-1/","/sdg-indicators/11-4-1/","/sdg-indicators/9-2-1/","/sdg-indicators/2-a-2/","/sdg-indicators/3-c-1/","/sdg-indicators/5-3-2/","/sdg-indicators/15-5-1/","/sdg-indicators/5-2-2/","/sdg-indicators/7-1-1/","/sdg-indicators/6-4-1/","/sdg-indicators/archived-indicators/17-18-1-archived/","/sdg-indicators/2-c-1/","/sdg-indicators/10-4-2/","/sdg-indicators/16-10-1/","/sdg-indicators/5-3-1/","/sdg-indicators/11-2-1/","/sdg-indicators/1-5-1/","/sdg-indicators/archived-indicators/15-b-1-archived/","/sdg-indicators/9-4-1/","/sdg-indicators/5-b-1/","/sdg-indicators/archived-indicators/13-2-1-archived/","/sdg-indicators/12-3-1/","/sdg-indicators/17-2-1/","/sdg-indicators/4-c-1/","/sdg-indicators/2-2-3/","/sdg-indicators/16-b-1/","/sdg-indicators/10-3-1/","/sdg-indicators/11-3-2/","/sdg-indicators/1-a-1/","/sdg-indicators/9-5-1/","/sdg-indicators/6-b-1/","/sdg-indicators/16-7-1/","/sdg-indicators/8-8-1/","/sdg-indicators/archived-indicators/17-3-1-archived/","/sdg-indicators/2-1-1/","/sdg-indicators/17-15-1/","/sdg-indicators/8-9-1/","/sdg-indicators/9-2-2/","/sdg-indicators/1-4-2/","/sdg-indicators/16-6-2/","/sdg-indicators/13-1-1/","/sdg-indicators/17-1-2/","/sdg-indicators/archived-indicators/13-3-2-archived/","/sdg-indicators/11-7-1/","/sdg-indicators/8-4-1/","/sdg-indicators/1-5-4/","/sdg-indicators/17-5-1/","/sdg-indicators/12-2-1/","/sdg-indicators/10-6-1/","/sdg-indicators/8-b-1/","/sdg-indicators/12-7-1/","/sdg-indicators/16-4-1/","/sdg-indicators/16-2-3/","/sdg-indicators/17-3-2/","/sdg-indicators/6-1-1/","/sdg-indicators/5-4-1/","/sdg-indicators/8-4-2/","/sdg-indicators/archived-indicators/17-17-1-archived/","/sdg-indicators/3-8-1/","/sdg-indicators/5-5-1/","/sdg-indicators/16-1-1/","/sdg-indicators/3-7-2/","/sdg-indicators/archived-indicators/12-b-1-archived/","/sdg-indicators/2-1-2/","/sdg-indicators/16-a-1/","/sdg-indicators/14-c-1/","/sdg-indicators/7-1-2/","/sdg-indicators/16-5-2/","/sdg-indicators/1-2-1/","/sdg-indicators/3-8-2/","/sdg-indicators/3-4-2/","/sdg-indicators/9-a-1/","/sdg-indicators/archived-indicators/8-3-1-archived/","/sdg-indicators/3-9-3/","/sdg-indicators/15-4-1/","/sdg-indicators/12-8-1/","/sdg-indicators/15-b-1/","/sdg-indicators/11-b-1/","/sdg-indicators/8-10-2/","/sdg-indicators/17-1-1/","/sdg-indicators/3-3-1/","/sdg-indicators/10-b-1/","/sdg-indicators/11-c-1/","/sdg-indicators/6-3-1/","/sdg-indicators/13-b-1/","/sdg-indicators/17-17-1/","/sdg-indicators/15-9-1/","/sdg-indicators/13-2-1/","/sdg-indicators/11-a-1/","/sdg-indicators/16-3-3/"]);
    await cache.addAll(["https://ONSdigital.github.io/sdg-data/en/comb/9-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-19-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-10-2.json","https://ONSdigital.github.io/sdg-data/en/comb/11-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-13-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/10-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-1-2.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-2-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/12-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/9-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/8-10-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-13-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/1-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-8-9-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-3-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-3-4.json","https://ONSdigital.github.io/sdg-data/en/comb/16-3-2.json","https://ONSdigital.github.io/sdg-data/en/comb/10-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/1-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/2-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/4-1-2.json","https://ONSdigital.github.io/sdg-data/en/comb/11-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/7-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-18-1.json","https://ONSdigital.github.io/sdg-data/en/comb/4-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/1-2-2.json","https://ONSdigital.github.io/sdg-data/en/comb/4-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-8-2.json","https://ONSdigital.github.io/sdg-data/en/comb/4-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/4-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/1-a-2.json","https://ONSdigital.github.io/sdg-data/en/comb/10-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-9-1.json","https://ONSdigital.github.io/sdg-data/en/comb/9-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-16-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/4-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-19-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/1-5-3.json","https://ONSdigital.github.io/sdg-data/en/comb/17-18-3.json","https://ONSdigital.github.io/sdg-data/en/comb/3-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-11-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-6-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/4-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/14-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-1-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-1-3.json","https://ONSdigital.github.io/sdg-data/en/comb/10-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-11-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-9-1.json","https://ONSdigital.github.io/sdg-data/en/comb/14-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-2-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-1-a-3.json","https://ONSdigital.github.io/sdg-data/en/comb/17-14-1.json","https://ONSdigital.github.io/sdg-data/en/comb/10-7-2.json","https://ONSdigital.github.io/sdg-data/en/comb/9-1-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-2-2.json","https://ONSdigital.github.io/sdg-data/en/comb/17-18-2.json","https://ONSdigital.github.io/sdg-data/en/comb/2-2-2.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-4-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/14-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-7-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-4-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-8-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-3-2.json","https://ONSdigital.github.io/sdg-data/en/comb/13-1-3.json","https://ONSdigital.github.io/sdg-data/en/comb/2-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-9-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-15-9-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-d-1.json","https://ONSdigital.github.io/sdg-data/en/comb/14-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/4-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-12-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/1-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-17-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-2-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/4-2-2.json","https://ONSdigital.github.io/sdg-data/en/comb/8-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-3-2.json","https://ONSdigital.github.io/sdg-data/en/comb/10-7-3.json","https://ONSdigital.github.io/sdg-data/en/comb/15-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-b-3.json","https://ONSdigital.github.io/sdg-data/en/comb/14-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/9-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/10-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-4-2.json","https://ONSdigital.github.io/sdg-data/en/comb/13-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/13-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-b-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-d-2.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-12-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/14-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/14-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/7-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/4-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/1-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-2-2.json","https://ONSdigital.github.io/sdg-data/en/comb/5-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-b-2.json","https://ONSdigital.github.io/sdg-data/en/comb/2-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-3-3.json","https://ONSdigital.github.io/sdg-data/en/comb/14-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-9-2.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-5-a-2.json","https://ONSdigital.github.io/sdg-data/en/comb/9-3-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-1-4.json","https://ONSdigital.github.io/sdg-data/en/comb/17-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/14-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/13-1-2.json","https://ONSdigital.github.io/sdg-data/en/comb/13-2-2.json","https://ONSdigital.github.io/sdg-data/en/comb/5-6-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-1-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-10-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-1-2.json","https://ONSdigital.github.io/sdg-data/en/comb/10-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-7-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/4-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-11-1.json","https://ONSdigital.github.io/sdg-data/en/comb/7-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/10-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/11-6-2.json","https://ONSdigital.github.io/sdg-data/en/comb/17-13-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-4-2.json","https://ONSdigital.github.io/sdg-data/en/comb/5-a-2.json","https://ONSdigital.github.io/sdg-data/en/comb/15-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/10-7-4.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-1-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/1-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/12-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-8-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-4-2.json","https://ONSdigital.github.io/sdg-data/en/comb/7-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-17-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-3-5.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-11-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-8-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-15-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-13-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-7-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/9-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/9-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-a-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-3-2.json","https://ONSdigital.github.io/sdg-data/en/comb/15-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-2-2.json","https://ONSdigital.github.io/sdg-data/en/comb/7-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-17-18-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/10-4-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-10-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/1-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-15-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/9-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-13-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/4-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-2-3.json","https://ONSdigital.github.io/sdg-data/en/comb/16-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/10-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-3-2.json","https://ONSdigital.github.io/sdg-data/en/comb/1-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/9-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-8-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-17-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-15-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-9-1.json","https://ONSdigital.github.io/sdg-data/en/comb/9-2-2.json","https://ONSdigital.github.io/sdg-data/en/comb/1-4-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-6-2.json","https://ONSdigital.github.io/sdg-data/en/comb/13-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-1-2.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-13-3-2.json","https://ONSdigital.github.io/sdg-data/en/comb/11-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/1-5-4.json","https://ONSdigital.github.io/sdg-data/en/comb/17-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/10-6-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-7-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-2-3.json","https://ONSdigital.github.io/sdg-data/en/comb/17-3-2.json","https://ONSdigital.github.io/sdg-data/en/comb/6-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-4-2.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-17-17-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-8-1.json","https://ONSdigital.github.io/sdg-data/en/comb/5-5-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-7-2.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-12-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/2-1-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/14-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/7-1-2.json","https://ONSdigital.github.io/sdg-data/en/comb/16-5-2.json","https://ONSdigital.github.io/sdg-data/en/comb/1-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-8-2.json","https://ONSdigital.github.io/sdg-data/en/comb/3-4-2.json","https://ONSdigital.github.io/sdg-data/en/comb/9-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/archived-8-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-9-3.json","https://ONSdigital.github.io/sdg-data/en/comb/15-4-1.json","https://ONSdigital.github.io/sdg-data/en/comb/12-8-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/8-10-2.json","https://ONSdigital.github.io/sdg-data/en/comb/17-1-1.json","https://ONSdigital.github.io/sdg-data/en/comb/3-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/10-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-c-1.json","https://ONSdigital.github.io/sdg-data/en/comb/6-3-1.json","https://ONSdigital.github.io/sdg-data/en/comb/13-b-1.json","https://ONSdigital.github.io/sdg-data/en/comb/17-17-1.json","https://ONSdigital.github.io/sdg-data/en/comb/15-9-1.json","https://ONSdigital.github.io/sdg-data/en/comb/13-2-1.json","https://ONSdigital.github.io/sdg-data/en/comb/11-a-1.json","https://ONSdigital.github.io/sdg-data/en/comb/16-3-3.json"]);
  };

  event.waitUntil(populateCache());
});


// Cache page navigations (html) with a Network First strategy
registerRoute(
  // Check to see if the request is a navigation to a new page
  ({ request }) => request.mode === 'navigate',
  // Use a Network First caching strategy
  new NetworkFirst({
    cacheName: cacheName,
    plugins: [
      // Ensure that only requests that result in a 200 status are cached
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  }),
);

// Cache CSS, JS, and Web Worker requests with a Stale While Revalidate strategy
registerRoute(
  // Check to see if the request's destination is style for stylesheets, script for JavaScript, or worker for web worker
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  // Use a Stale While Revalidate caching strategy
  new StaleWhileRevalidate({
    cacheName: cacheName,
    plugins: [
      // Ensure that only requests that result in a 200 status are cached
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  }),
);

// Cache images/fonts with a Cache First strategy
registerRoute(
  // Check to see if the request's destination is style for an image
  ({ request }) => ['image', 'font'].includes(request.destination),
  // Use a Cache First caching strategy
  new CacheFirst({
    cacheName: cacheName,
    plugins: [
      // Ensure that only requests that result in a 200 status are cached
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      // Don't cache more than 50 items, and expire them after 30 days
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
      }),
    ],
  }),
);

// Cache json with a Network First strategy.
registerRoute(
  /.*\.(json|geojson|zip|csv)$/,
  new NetworkFirst({
    cacheName: cacheName,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ]
  }),
);
