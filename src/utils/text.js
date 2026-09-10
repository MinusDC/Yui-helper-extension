import { JAPANESE_CHARACTER_PATTERN, MAX_TEXT_LENGTH } from './constants.js';

export function normalizeSelectedText(value) {
  return String(value ?? '')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/\s*\r?\n\s*/g, ' ')
    .trim();
}

export function containsJapanese(value) {
  return JAPANESE_CHARACTER_PATTERN.test(String(value ?? ''));
}

export function validateJapaneseText(value) {
  const text = normalizeSelectedText(value);

  if (!text) {
    return { valid: false, error: 'Không có văn bản để xử lý.' };
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Đoạn văn quá dài. Vui lòng chọn tối đa ${MAX_TEXT_LENGTH} ký tự.`
    };
  }

  if (!containsJapanese(text)) {
    return { valid: false, error: 'Vui lòng chọn văn bản tiếng Nhật.' };
  }

  return { valid: true, text };
}

export function katakanaToHiragana(value) {
  return String(value ?? '').replace(/[\u30a1-\u30f6]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60)
  );
}

export function hasKanji(value) {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(String(value ?? ''));
}
