import { CACHE_LIMIT } from '../utils/constants.js';

export async function getPersistentCache(storageKey, key) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return undefined;
    }
    const stored = await chrome.storage.local.get(storageKey);
    const cacheMap = stored[storageKey];
    if (cacheMap && typeof cacheMap === 'object' && Object.prototype.hasOwnProperty.call(cacheMap, key)) {
      return cacheMap[key];
    }
  } catch (error) {
    console.warn(`Failed to read persistent cache for ${storageKey}`, error);
  }
  return undefined;
}

export async function setPersistentCache(storageKey, key, value) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return;
    }
    const stored = await chrome.storage.local.get(storageKey);
    const cacheMap = stored[storageKey] && typeof stored[storageKey] === 'object' ? stored[storageKey] : {};

    delete cacheMap[key];
    cacheMap[key] = value;

    const keys = Object.keys(cacheMap);
    if (keys.length > CACHE_LIMIT) {
      const overflow = keys.length - CACHE_LIMIT;
      for (let i = 0; i < overflow; i++) {
        delete cacheMap[keys[i]];
      }
    }

    await chrome.storage.local.set({ [storageKey]: cacheMap });
  } catch (error) {
    console.warn(`Failed to write persistent cache for ${storageKey}`, error);
  }
}
