import { CACHE_LIMIT, REQUEST_TIMEOUT_MS } from '../utils/constants.js';
import { BoundedCache } from './bounded-cache.js';
import { ServiceError } from './service-error.js';

// const TRANSLATION_ENDPOINT =  'https://translate.googleapis.com/translate_a/single';
const TRANSLATION_ENDPOINT =
  'https://api.mymemory.translated.net/get?q=Hello%20World&langpair=en|vi';

export class TranslationService {
  constructor() {
    this.cache = new BoundedCache(CACHE_LIMIT);
  }

  async translate(text) {
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    const parameters = new URLSearchParams({
      client: 'gtx',
      sl: 'ja',
      tl: 'vi',
      dt: 't',
      q: text,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${TRANSLATION_ENDPOINT}?${parameters}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ServiceError(
          'Dịch vụ dịch hiện không phản hồi. Vui lòng thử lại sau.',
        );
      }

      const payload = await response.json();
      const translation = extractTranslation(payload);
      if (!translation) {
        throw new ServiceError(
          'Dịch vụ trả về kết quả không hợp lệ. Vui lòng thử lại sau.',
        );
      }

      this.cache.set(text, translation);
      return translation;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ServiceError(
          'Dịch vụ dịch mất quá nhiều thời gian phản hồi. Vui lòng thử lại.',
        );
      }

      if (error instanceof ServiceError) {
        throw error;
      }

      console.error('Translation request failed.', error);
      throw new ServiceError(
        'Không thể kết nối đến dịch vụ dịch. Vui lòng thử lại sau.',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function extractTranslation(payload) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    return '';
  }

  return payload[0]
    .map((segment) =>
      Array.isArray(segment) && typeof segment[0] === 'string'
        ? segment[0]
        : '',
    )
    .join('')
    .trim();
}
