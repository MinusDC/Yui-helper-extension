import { HISTORY_LIMIT } from '../utils/constants.js';

const KEYS = Object.freeze({
  VOCABULARY: 'savedVocabulary',
  HISTORY: 'lookupHistory',
  SETTINGS: 'settings'
});

const DEFAULT_SETTINGS = Object.freeze({
  selectionPopupEnabled: true
});

export class StorageService {
  async getDashboard() {
    const stored = await chrome.storage.local.get([KEYS.VOCABULARY, KEYS.HISTORY, KEYS.SETTINGS]);
    return {
      vocabulary: Array.isArray(stored[KEYS.VOCABULARY]) ? stored[KEYS.VOCABULARY] : [],
      history: Array.isArray(stored[KEYS.HISTORY]) ? stored[KEYS.HISTORY] : [],
      settings: { ...DEFAULT_SETTINGS, ...(stored[KEYS.SETTINGS] ?? {}) }
    };
  }

  async getSettings() {
    const stored = await chrome.storage.local.get(KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(stored[KEYS.SETTINGS] ?? {}) };
  }

  async updateSettings(settings) {
    const current = await this.getSettings();
    const next = {
      ...current,
      selectionPopupEnabled: Boolean(settings?.selectionPopupEnabled)
    };
    await chrome.storage.local.set({ [KEYS.SETTINGS]: next });
    return next;
  }

  async saveVocabulary(vocabulary) {
    const stored = await chrome.storage.local.get(KEYS.VOCABULARY);
    const words = Array.isArray(stored[KEYS.VOCABULARY]) ? stored[KEYS.VOCABULARY] : [];
    const normalizedWord = normalizeKey(vocabulary.word);
    const normalizedReading = normalizeKey(vocabulary.reading);
    const existing = words.find((word) =>
      normalizeKey(word.word) === normalizedWord && normalizeKey(word.reading) === normalizedReading
    );

    if (existing) {
      return { saved: false, vocabulary: existing };
    }

    const record = {
      id: crypto.randomUUID(),
      word: String(vocabulary.word ?? '').trim(),
      reading: String(vocabulary.reading ?? '').trim(),
      meaning: String(vocabulary.meaning ?? '').trim(),
      createdAt: Date.now()
    };
    words.unshift(record);
    await chrome.storage.local.set({ [KEYS.VOCABULARY]: words });
    return { saved: true, vocabulary: record };
  }

  async recordHistory(historyItem) {
    const stored = await chrome.storage.local.get(KEYS.HISTORY);
    const history = Array.isArray(stored[KEYS.HISTORY]) ? stored[KEYS.HISTORY] : [];
    const text = String(historyItem.text ?? '').trim();
    const previous = history.find((item) => item.text === text) ?? {};
    const record = {
      ...previous,
      ...historyItem,
      id: previous.id ?? crypto.randomUUID(),
      text,
      createdAt: Date.now()
    };
    const next = [record, ...history.filter((item) => item.text !== text)].slice(0, HISTORY_LIMIT);
    await chrome.storage.local.set({ [KEYS.HISTORY]: next });
    return record;
  }
}

function normalizeKey(value) {
  return String(value ?? '').trim().normalize('NFC');
}
