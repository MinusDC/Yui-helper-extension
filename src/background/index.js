import { DictionaryService } from '../services/dictionary-service.js';
import { MESSAGE_TYPES, isKnownMessageType } from '../services/message-types.js';
import { ServiceError, toUserMessage } from '../services/service-error.js';
import { StorageService } from '../services/storage-service.js';
import { TranslationService } from '../services/translation-service.js';
import { validateJapaneseText } from '../utils/text.js';

const translationService = new TranslationService();
const dictionaryService = new DictionaryService();
const storageService = new StorageService();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      if (!(error instanceof ServiceError)) {
        console.error('Japanese Learning Assistant message failed.', error);
      }
      sendResponse({ ok: false, error: toUserMessage(error) });
    });

  return true;
});

async function handleMessage(message) {
  if (!message || typeof message !== 'object' || !isKnownMessageType(message.type)) {
    throw new ServiceError('Yêu cầu không hợp lệ.');
  }

  switch (message.type) {
    case MESSAGE_TYPES.TRANSLATE:
      return translate(message.text);
    case MESSAGE_TYPES.LOOKUP_WORD:
      return lookupWord(message.text);
    case MESSAGE_TYPES.SAVE_WORD:
      return saveWord(message.vocabulary);
    case MESSAGE_TYPES.RECORD_HISTORY:
      return recordHistory(message);
    case MESSAGE_TYPES.GET_DASHBOARD:
      return storageService.getDashboard();
    case MESSAGE_TYPES.GET_SETTINGS:
      return { settings: await storageService.getSettings() };
    case MESSAGE_TYPES.UPDATE_SETTINGS:
      if (typeof message.settings?.selectionPopupEnabled !== 'boolean') {
        throw new ServiceError('Cài đặt không hợp lệ.');
      }
      return { settings: await storageService.updateSettings(message.settings) };
    default:
      throw new ServiceError('Loại yêu cầu không được hỗ trợ.');
  }
}

async function translate(value) {
  const text = requireJapaneseText(value);
  const translation = await translationService.translate(text);
  await storageService.recordHistory({ text, translation });
  return { translation };
}

async function lookupWord(value) {
  const text = requireJapaneseText(value);
  const entry = await dictionaryService.lookup(text);
  await storageService.recordHistory({ text, reading: entry.reading, meaning: entry.meanings.join('; ') });
  return { entry };
}

async function saveWord(vocabulary) {
  if (!vocabulary || typeof vocabulary !== 'object') {
    throw new ServiceError('Mục từ không hợp lệ.');
  }

  const word = requireJapaneseText(vocabulary.word);
  const reading = typeof vocabulary.reading === 'string' ? vocabulary.reading.trim().slice(0, 500) : '';
  const meaning = typeof vocabulary.meaning === 'string' ? vocabulary.meaning.trim().slice(0, 1000) : '';
  return storageService.saveVocabulary({ word, reading, meaning });
}

async function recordHistory(message) {
  const text = requireJapaneseText(message.text);
  const record = {
    text,
    reading: typeof message.reading === 'string' ? message.reading.trim().slice(0, 1000) : undefined
  };
  await storageService.recordHistory(record);
  return {};
}

function requireJapaneseText(value) {
  const validation = validateJapaneseText(value);
  if (!validation.valid) {
    throw new ServiceError(validation.error);
  }
  return validation.text;
}
