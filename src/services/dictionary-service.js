import { CACHE_LIMIT, REQUEST_TIMEOUT_MS } from '../utils/constants.js';
import { BoundedCache } from './bounded-cache.js';
import { ServiceError } from './service-error.js';

const JISHO_ENDPOINT = 'https://jisho.org/api/v1/search/words';

export class DictionaryService {
  constructor() {
    this.cache = new BoundedCache(CACHE_LIMIT);
  }

  async lookup(text) {
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${JISHO_ENDPOINT}?keyword=${encodeURIComponent(text)}`, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new ServiceError('Không thể kết nối từ điển. Vui lòng thử lại sau.');
      }

      const payload = await response.json();
      const result = parseDictionaryResult(payload, text);
      if (!result) {
        throw new ServiceError('Không tìm thấy mục từ phù hợp.');
      }

      this.cache.set(text, result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ServiceError('Từ điển mất quá nhiều thời gian phản hồi. Vui lòng thử lại.');
      }

      if (error instanceof ServiceError) {
        throw error;
      }

      console.error('Dictionary request failed.', error);
      throw new ServiceError('Không thể kết nối từ điển. Vui lòng thử lại sau.');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function parseDictionaryResult(payload, searchedText) {
  if (!payload || !Array.isArray(payload.data) || payload.data.length === 0) {
    return null;
  }

  const entry = payload.data.find((candidate) =>
    candidate.japanese?.some((form) => form.word === searchedText || form.reading === searchedText)
  ) ?? payload.data[0];
  const primaryForm = entry.japanese?.[0];
  const meanings = entry.senses
    ?.flatMap((sense) => sense.english_definitions ?? [])
    .filter((meaning) => typeof meaning === 'string' && meaning.trim())
    .slice(0, 6) ?? [];
  const partsOfSpeech = [...new Set(
    entry.senses?.flatMap((sense) => sense.parts_of_speech ?? [])
      .filter((part) => typeof part === 'string' && part.trim()) ?? []
  )].slice(0, 3);

  if (!primaryForm || (!primaryForm.word && !primaryForm.reading) || meanings.length === 0) {
    return null;
  }

  return {
    word: primaryForm.word ?? primaryForm.reading,
    reading: primaryForm.reading ?? '',
    meanings,
    partsOfSpeech
  };
}
