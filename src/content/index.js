import { JapaneseTokenizer } from '../services/japanese-tokenizer.js';
import { MESSAGE_TYPES } from '../services/message-types.js';
import { containsJapanese, normalizeSelectedText } from '../utils/text.js';
import { SelectionPopup } from './selection-popup.js';
import { SelectionTrigger } from './selection-trigger.js';
import { UI_STATE, UiStateManager } from './ui-state.js';

const SELECTION_DEBOUNCE_MS = 180;

let selectionTimer = null;
let selectionPopupEnabled = true;
let activeSelection = null;

const uiState = new UiStateManager();
const tokenizer = new JapaneseTokenizer(chrome.runtime.getURL('dict/'));
const popup = new SelectionPopup({ tokenizer, onClose: resetUi });
const trigger = new SelectionTrigger({ onActivate: openPopupFromTrigger });

loadSettings();
document.addEventListener('selectionchange', scheduleSelectionProcessing, { passive: true });
document.addEventListener('mousedown', handleDocumentMouseDown, true);
document.addEventListener('keydown', handleDocumentKeyDown, true);
window.addEventListener('resize', keepUiInViewport, { passive: true });
window.addEventListener('scroll', keepUiInViewport, { passive: true, capture: true });
chrome.storage.onChanged.addListener(handleStorageChange);

async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_SETTINGS });
    selectionPopupEnabled = response?.ok ? response.settings.selectionPopupEnabled : true;
  } catch (error) {
    console.error('Could not load Japanese Learning Assistant settings.', error);
  }
}

function handleStorageChange(changes, areaName) {
  if (areaName !== 'local' || !changes.settings) {
    return;
  }

  selectionPopupEnabled = changes.settings.newValue?.selectionPopupEnabled ?? true;
  if (!selectionPopupEnabled) {
    resetUi();
  }
}

function scheduleSelectionProcessing() {
  clearTimeout(selectionTimer);
  selectionTimer = setTimeout(processSelection, SELECTION_DEBOUNCE_MS);
}

function processSelection() {
  if (!selectionPopupEnabled) {
    resetUi();
    return;
  }

  const selection = window.getSelection();
  if (selectionBelongsToExtension(selection)) {
    return;
  }

  const text = normalizeSelectedText(selection?.toString());
  if (!text || !containsJapanese(text) || selection?.rangeCount === 0) {
    resetUi();
    return;
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (!hasVisibleSelectionRect(rect)) {
    resetUi();
    return;
  }

  activeSelection = { text, rect };
  trigger.show(rect);

  if (uiState.is(UI_STATE.POPUP_OPEN)) {
    // An open assistant follows an intentional new Japanese selection without
    // creating a second popup instance.
    popup.show(activeSelection);
    return;
  }

  popup.hide();
  uiState.showTrigger();
}

function openPopupFromTrigger() {
  if (!activeSelection || uiState.is(UI_STATE.POPUP_OPEN) || !uiState.openPopup()) {
    return;
  }

  popup.show(activeSelection);
}

function handleDocumentMouseDown(event) {
  if (popup.containsEvent(event) || trigger.containsEvent(event)) {
    return;
  }

  resetUi();
}

function handleDocumentKeyDown(event) {
  if (event.key === 'Escape' && !uiState.is(UI_STATE.IDLE)) {
    resetUi();
  }
}

function keepUiInViewport() {
  // Scroll and resize preserve the active UI. Fixed elements are only clamped
  // back into the viewport instead of being dismissed.
  if (uiState.is(UI_STATE.IDLE)) {
    return;
  }

  trigger.keepInViewport();
  if (uiState.is(UI_STATE.POPUP_OPEN)) {
    popup.keepInViewport();
  }
}

function resetUi() {
  clearTimeout(selectionTimer);
  activeSelection = null;
  trigger.hide();
  popup.hide();
  uiState.reset();
}

function selectionBelongsToExtension(selection) {
  return popup.contains(selection?.anchorNode) || popup.contains(selection?.focusNode);
}

function hasVisibleSelectionRect(rect) {
  return Boolean(rect && (rect.width > 0 || rect.height > 0));
}
