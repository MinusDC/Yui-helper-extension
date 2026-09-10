import { MESSAGE_TYPES } from '../services/message-types.js';
const POPUP_WIDTH = 420;
const VIEWPORT_MARGIN = 12;

export class SelectionPopup {
  constructor({ tokenizer, onClose }) {
    this.tokenizer = tokenizer;
    this.onClose = onClose;
    this.currentText = '';
    this.currentDictionary = null;
    this.currentReading = '';
    this.isBusy = false;
    this.host = document.createElement('div');
    this.host.id = 'jl-selection-host';
    this.host.setAttribute('data-jl-owned', 'true');
    this.host.style.cssText =
      'all: initial; display: block; left: 0; position: fixed; top: 0; z-index: 2147483647;';
    this.host.hidden = true;
    this.shadowRoot = this.host.attachShadow({ mode: 'closed' });
    this.shadowRoot.append(this.createStyle(), this.createView());
    document.documentElement.append(this.host);
  }

  show({ text, rect }) {
    this.currentText = text;
    this.currentDictionary = null;
    this.currentReading = '';
    this.setSelectionText(text);
    this.setResult('Chọn một công cụ để bắt đầu.', 'empty');
    this.setSaveButtonLabel('☆ Lưu mục');
    this.position(rect);
    this.host.hidden = false;
  }

  hide() {
    this.host.hidden = true;
    this.currentText = '';
    this.currentDictionary = null;
    this.currentReading = '';
  }

  contains(node) {
    return (
      this.host.contains(node) || node?.getRootNode?.() === this.shadowRoot
    );
  }

  containsEvent(event) {
    return (
      event.composedPath?.().includes(this.host) || this.contains(event.target)
    );
  }

  keepInViewport() {
    if (this.host.hidden) {
      return;
    }

    const cardRect = this.card.getBoundingClientRect();
    const width = cardRect.width || POPUP_WIDTH;
    const height = cardRect.height || 160;
    const left = Number.parseFloat(this.host.style.left) || VIEWPORT_MARGIN;
    const top = Number.parseFloat(this.host.style.top) || VIEWPORT_MARGIN;
    this.host.style.left = `${Math.round(clamp(left, VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN))}px`;
    this.host.style.top = `${Math.round(clamp(top, VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN))}px`;
  }

  position(rect) {
    const estimatedHeight = 274;
    const desiredLeft = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
    const left = clamp(
      desiredLeft,
      VIEWPORT_MARGIN,
      window.innerWidth - POPUP_WIDTH - VIEWPORT_MARGIN,
    );
    const above = rect.top - estimatedHeight - VIEWPORT_MARGIN;
    const top =
      above >= VIEWPORT_MARGIN
        ? above
        : clamp(
            rect.bottom + VIEWPORT_MARGIN,
            VIEWPORT_MARGIN,
            window.innerHeight - 160,
          );

    this.host.style.left = `${Math.round(left)}px`;
    this.host.style.top = `${Math.round(top)}px`;
  }

  createStyle() {
    const style = document.createElement('style');
    style.textContent = `
      :host([hidden]) { display: none !important; }
      .jl-card {
        box-sizing: border-box;
        width: min(${POPUP_WIDTH}px, calc(100vw - 24px));
        color: #3f3540;
        background: linear-gradient(180deg, #fffafc 0%, #ffffff 100%);
        border: 1px solid #f1c5d3;
        border-radius: 16px;
        box-shadow: 0 14px 32px rgba(161, 115, 137, 0.16);
        font-family: Inter, "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
        font-size: 13px;
        line-height: 1.45;
        max-height: min(68vh, 520px);
        overflow: hidden;
        pointer-events: auto;
      }
      .jl-header {
        align-items: center;
        background: linear-gradient(135deg, rgba(255, 57, 169, 0.61), rgba(246, 78, 134, 0.9));
        border-bottom: 1px solid #e52d67;
        display: flex;
        justify-content: space-between;
        padding: 10px 12px;
      }
      .jl-title {
        color: #94003b;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .01em;
      }
      .jl-close, .jl-action, .jl-save {
        appearance: none;
        border: 0;
        box-sizing: border-box;
        cursor: pointer;
        font: inherit;
      }
      .jl-close {
        align-items: center;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 8px;
        color: #6e6262;
        display: inline-flex;
        font-size: 19px;
        height: 26px;
        justify-content: center;
        line-height: 1;
        width: 26px;
      }
      .jl-close:hover {
        background: rgba(255, 255, 255, 0.8);
        color: #831d27;
      }
      .jl-close:focus-visible, .jl-action:focus-visible, .jl-save:focus-visible { outline: 3px solid #f4a5ab; outline-offset: 2px; }
      .jl-selected {
        background: #ffffff;
        border-bottom: 1px solid #f0e8eb;
        font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
        font-size: 14px;
        line-height: 1.55;
        max-height: 92px;
        overflow: auto;
        padding: 12px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .jl-actions {
        display: grid;
        gap: 8px;
        grid-template-columns: 1fr 1fr;
        padding: 10px 12px;
      }
      .jl-action {
        background: #ffffff;
        border: 1px solid #f0c6d7;
        border-radius: 10px;
        color: #4c3944;
        min-height: 36px;
        padding: 7px 8px;
        text-align: left;
        transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, transform .15s ease;
      }
      .jl-action:hover:not(:disabled) {
        background: #fff4f8;
        border-color: #e88baa;
        box-shadow: inset 0 0 0 1px rgba(232, 139, 170, 0.2);
        color: #7d3d59;
        transform: translateY(-1px);
      }
      .jl-action:disabled { cursor: wait; opacity: .55; }
      .jl-result {
        background: linear-gradient(180deg, rgba(255, 248, 250, 0.85), rgba(255, 255, 255, 0.95));
        border-top: 1px solid #efeaed;
        min-height: 56px;
        padding: 12px;
      }
      .jl-result[data-state="empty"] { color: #6c5c68; }
      .jl-result[data-state="loading"] { color: #8a5467; }
      .jl-result[data-state="error"] { color: #c05c75; }
      .jl-result-heading {
        color: #9d6c7d;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: .08em;
        margin-bottom: 6px;
        text-transform: uppercase;
      }
      .jl-result-content { white-space: pre-wrap; word-break: break-word; }
      .jl-result ruby { ruby-position: over; }
      .jl-result rt { color: #bf5a7f; font-size: 10px; }
      .jl-definition { margin: 3px 0; }
      .jl-definition-label { color: #7c6773; font-size: 11px; font-weight: 700; }
      .jl-footer {
        background: #fffafc;
        border-top: 1px solid #efeaed;
        display: flex;
        justify-content: flex-end;
        padding: 10px 12px;
      }
      .jl-save {
        background: linear-gradient(135deg, #e88baa 0%, #d66f93 100%);
        border-radius: 10px;
        color: white;
        min-height: 32px;
        padding: 6px 12px;
        transition: filter .15s ease, transform .15s ease;
      }
      .jl-save:hover:not(:disabled) {
        filter: brightness(1.02);
        transform: translateY(-1px);
      }
      .jl-save:disabled { cursor: wait; opacity: .6; }
    `;
    return style;
  }

  createView() {
    const card = createElement('section', 'jl-card');
    this.card = card;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Japanese Learning Assistant');

    const header = createElement('div', 'jl-header');
    header.append(createElement('span', 'jl-title', 'JP ゆいちゃん'));
    this.closeButton = createElement('button', 'jl-close', '×');
    this.closeButton.type = 'button';
    this.closeButton.setAttribute('aria-label', 'Đóng trợ lý tiếng Nhật');
    this.closeButton.addEventListener('click', () => this.onClose());
    header.append(this.closeButton);

    this.selectedTextElement = createElement('div', 'jl-selected');
    this.selectedTextElement.setAttribute('lang', 'ja');

    const actions = createElement('div', 'jl-actions');
    actions.append(
      this.createAction('🇻🇳 Dịch', 'Dịch sang tiếng Việt', () =>
        this.translate(),
      ),
      this.createAction('あ Hiragana', 'Hiển thị cách đọc Hiragana', () =>
        this.showReading(),
      ),
      this.createAction('🈁 Furigana', 'Hiển thị Furigana', () =>
        this.showFurigana(),
      ),
      this.createAction('📖 Tra từ', 'Tra cứu từ vựng', () => this.lookup()),
    );

    this.resultElement = createElement('div', 'jl-result');
    this.resultElement.setAttribute('aria-live', 'polite');
    this.resultElement.setAttribute('data-state', 'empty');

    const footer = createElement('div', 'jl-footer');
    this.saveButton = createElement('button', 'jl-save', '☆ Lưu mục');
    this.saveButton.type = 'button';
    this.saveButton.setAttribute('aria-label', 'Lưu mục từ vựng');
    this.saveButton.addEventListener('mousedown', preventSelectionLoss);
    this.saveButton.addEventListener('click', () => this.saveVocabulary());
    footer.append(this.saveButton);

    card.append(
      header,
      this.selectedTextElement,
      actions,
      this.resultElement,
      footer,
    );
    return card;
  }

  createAction(label, ariaLabel, handler) {
    const button = createElement('button', 'jl-action', label);
    button.type = 'button';
    button.setAttribute('aria-label', ariaLabel);
    button.addEventListener('mousedown', preventSelectionLoss);
    button.addEventListener('click', handler);
    return button;
  }

  setSelectionText(value) {
    this.selectedTextElement.textContent = value;
  }

  setResult(value, state = 'success', heading = '') {
    this.resultElement.replaceChildren();
    this.resultElement.setAttribute('data-state', state);
    if (heading) {
      this.resultElement.append(
        createElement('div', 'jl-result-heading', heading),
      );
    }
    this.resultElement.append(createElement('div', 'jl-result-content', value));
  }

  setResultNodes(nodes, state = 'success', heading = '') {
    this.resultElement.replaceChildren();
    this.resultElement.setAttribute('data-state', state);
    if (heading) {
      this.resultElement.append(
        createElement('div', 'jl-result-heading', heading),
      );
    }
    const content = createElement('div', 'jl-result-content');
    content.append(...nodes);
    this.resultElement.append(content);
  }

  setSaveButtonLabel(label) {
    this.saveButton.textContent = label;
  }

  async translate() {
    await this.runAction(async () => {
      const result = await sendMessage({
        type: MESSAGE_TYPES.TRANSLATE,
        text: this.currentText,
      });
      this.setResult(result.translation, 'success', 'Bản dịch tiếng Việt');
    });
  }

  async showReading() {
    await this.runAction(async () => {
      const reading = await this.tokenizer.getReading(this.currentText);
      this.currentReading = reading;
      this.setResult(reading, 'success', 'Hiragana');
      await sendMessage({
        type: MESSAGE_TYPES.RECORD_HISTORY,
        text: this.currentText,
        reading,
      });
    });
  }

  async showFurigana() {
    await this.runAction(async () => {
      const tokens = await this.tokenizer.getFuriganaTokens(this.currentText);
      this.currentReading = tokens.map((token) => token.reading).join('');
      const fragment = document.createDocumentFragment();
      for (const token of tokens) {
        if (token.showRuby) {
          const ruby = document.createElement('ruby');
          ruby.textContent = token.surface;
          const reading = document.createElement('rt');
          reading.textContent = token.reading;
          ruby.append(reading);
          fragment.append(ruby);
        } else {
          fragment.append(document.createTextNode(token.surface));
        }
      }
      this.setResultNodes([fragment], 'success', 'Furigana');
      await sendMessage({
        type: MESSAGE_TYPES.RECORD_HISTORY,
        text: this.currentText,
        reading: this.currentReading,
      });
    });
  }

  async lookup() {
    await this.runAction(async () => {
      const result = await sendMessage({
        type: MESSAGE_TYPES.LOOKUP_WORD,
        text: this.currentText,
      });
      this.currentDictionary = result.entry;
      this.currentReading = result.entry.reading || this.currentReading;
      this.setDictionaryResult(result.entry);
    });
  }

  setDictionaryResult(entry) {
    const nodes = [];
    nodes.push(createDefinition('Từ', entry.word));
    if (entry.reading) {
      nodes.push(createDefinition('Cách đọc', entry.reading));
    }
    nodes.push(createDefinition('Nghĩa (EN)', entry.meanings.join('; ')));
    if (entry.partsOfSpeech.length) {
      nodes.push(createDefinition('Từ loại', entry.partsOfSpeech.join(', ')));
    }
    this.setResultNodes(nodes, 'success', 'Kết quả Jisho');
  }

  async saveVocabulary() {
    if (this.isBusy || !this.currentText) {
      return;
    }

    await this.runAction(
      async () => {
        const source = this.currentDictionary ?? {
          word: this.currentText,
          reading: this.currentReading,
          meanings: [],
        };
        const result = await sendMessage({
          type: MESSAGE_TYPES.SAVE_WORD,
          vocabulary: {
            word: source.word,
            reading: source.reading,
            meaning: source.meanings?.join('; ') ?? '',
          },
        });
        this.setSaveButtonLabel(
          result.saved ? '✓ Đã lưu' : '✓ Đã lưu trước đó',
        );
      },
      { showLoading: false },
    );
  }

  async runAction(operation, { showLoading = true } = {}) {
    if (this.isBusy) {
      return;
    }

    this.isBusy = true;
    this.setControlsDisabled(true);
    if (showLoading) {
      this.setResult('⏳ Đang xử lý...', 'loading');
    }

    try {
      await operation();
    } catch (error) {
      console.error('Japanese Learning Assistant action failed.', error);
      this.setResult(
        error?.message || 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.',
        'error',
        'Có lỗi xảy ra',
      );
    } finally {
      this.isBusy = false;
      this.setControlsDisabled(false);
    }
  }

  setControlsDisabled(disabled) {
    this.shadowRoot
      .querySelectorAll('.jl-action, .jl-save')
      .forEach((button) => {
        button.disabled = disabled;
      });
  }
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function createDefinition(label, value) {
  const line = createElement('div', 'jl-definition');
  line.append(
    createElement('span', 'jl-definition-label', `${label}: `),
    document.createTextNode(value),
  );
  return line;
}

function preventSelectionLoss(event) {
  event.preventDefault();
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, Math.max(minimum, maximum)));
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(
      response?.error || 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.',
    );
  }
  return response;
}
