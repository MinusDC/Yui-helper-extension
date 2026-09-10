import { MESSAGE_TYPES } from '../services/message-types.js';

const app = document.querySelector('#jl-popup-app');

initialize().catch((error) => {
  console.error('Could not initialize extension popup.', error);
  app.replaceChildren(createElement('p', 'jl-popup-error', 'Không thể tải dữ liệu extension. Vui lòng thử lại.'));
});

async function initialize() {
  const response = await sendMessage({ type: MESSAGE_TYPES.GET_DASHBOARD });
  render(response);
}

function render({ vocabulary, history, settings }) {
  const shell = createElement('div', 'jl-popup-shell');
  const header = createElement('header', 'jl-popup-header');
  const titleBlock = document.createElement('div');
  titleBlock.append(
    createElement('h1', 'jl-popup-title', '🇯🇵 Japanese Learning Assistant'),
    createElement('p', 'jl-popup-subtitle', 'Bôi đen tiếng Nhật trên một trang web để bắt đầu.')
  );
  header.append(titleBlock);

  const settingsSection = createElement('section', 'jl-popup-section');
  settingsSection.append(createElement('h2', 'jl-popup-heading', 'Quick settings'));
  const toggleLabel = createElement('label', 'jl-popup-toggle');
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = settings.selectionPopupEnabled;
  toggle.setAttribute('aria-label', 'Bật popup khi bôi đen tiếng Nhật');
  toggle.addEventListener('change', () => updateSelectionSetting(toggle));
  toggleLabel.append(toggle, document.createTextNode('Bật popup khi bôi đen tiếng Nhật'));
  settingsSection.append(toggleLabel);

  shell.append(
    header,
    settingsSection,
    createListSection('History', history, renderHistoryItem, 'Chưa có lịch sử tra cứu.'),
    createListSection('Saved Words', vocabulary, renderVocabularyItem, 'Chưa lưu mục từ nào.')
  );
  app.replaceChildren(shell);
}

async function updateSelectionSetting(toggle) {
  toggle.disabled = true;
  try {
    await sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      settings: { selectionPopupEnabled: toggle.checked }
    });
  } catch (error) {
    console.error('Could not update settings.', error);
    toggle.checked = !toggle.checked;
  } finally {
    toggle.disabled = false;
  }
}

function createListSection(title, items, itemRenderer, emptyMessage) {
  const section = createElement('section', 'jl-popup-section');
  section.append(createElement('h2', 'jl-popup-heading', title));
  if (!items.length) {
    section.append(createElement('p', 'jl-popup-empty', emptyMessage));
    return section;
  }

  const list = createElement('ul', 'jl-popup-list');
  items.slice(0, 8).forEach((item) => list.append(itemRenderer(item)));
  section.append(list);
  return section;
}

function renderHistoryItem(item) {
  const listItem = createElement('li', 'jl-popup-list-item');
  listItem.append(createElement('div', '', item.text));
  if (item.reading) {
    listItem.append(createElement('div', 'jl-popup-reading', item.reading));
  }
  const description = item.translation || item.meaning;
  if (description) {
    listItem.append(createElement('div', 'jl-popup-meta', description));
  }
  listItem.append(createElement('div', 'jl-popup-meta', formatRelativeTime(item.createdAt)));
  return listItem;
}

function renderVocabularyItem(item) {
  const listItem = createElement('li', 'jl-popup-list-item');
  listItem.append(createElement('div', '', item.word));
  if (item.reading) {
    listItem.append(createElement('div', 'jl-popup-reading', item.reading));
  }
  if (item.meaning) {
    listItem.append(createElement('div', 'jl-popup-meta', item.meaning));
  }
  return listItem;
}

function formatRelativeTime(timestamp) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - Number(timestamp)) / 60000));
  if (elapsedMinutes < 1) return 'vừa xong';
  if (elapsedMinutes < 60) return `${elapsedMinutes} phút trước`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} giờ trước`;
  return `${Math.floor(elapsedHours / 24)} ngày trước`;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || 'Không thể xử lý yêu cầu.');
  }
  return response;
}
