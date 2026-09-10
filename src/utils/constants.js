export const MAX_TEXT_LENGTH = 1000;
export const REQUEST_TIMEOUT_MS = 10000;
export const CACHE_LIMIT = 100;
export const HISTORY_LIMIT = 100;

// Includes common Hiragana, Katakana (including half-width), and CJK ranges.
export const JAPANESE_CHARACTER_PATTERN = /[\u3040-\u309f\u30a0-\u30ff\u31f0-\u31ff\uff66-\uff9f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
