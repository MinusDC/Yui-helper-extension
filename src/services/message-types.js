export const MESSAGE_TYPES = Object.freeze({
  TRANSLATE: 'TRANSLATE',
  LOOKUP_WORD: 'LOOKUP_WORD',
  SAVE_WORD: 'SAVE_WORD',
  RECORD_HISTORY: 'RECORD_HISTORY',
  GET_DASHBOARD: 'GET_DASHBOARD',
  GET_SETTINGS: 'GET_SETTINGS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS'
});

export function isKnownMessageType(type) {
  return Object.values(MESSAGE_TYPES).includes(type);
}
