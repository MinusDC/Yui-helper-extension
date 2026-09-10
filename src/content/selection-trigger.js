const TRIGGER_SIZE = 34;
const VIEWPORT_MARGIN = 8;

export class SelectionTrigger {
  constructor({ onActivate }) {
    this.onActivate = onActivate;
    this.host = document.createElement('div');
    this.host.id = 'jl-selection-trigger-host';
    this.host.setAttribute('data-jl-owned', 'true');
    this.host.style.cssText =
      'all: initial; display: block; left: 0; position: fixed; top: 0; z-index: 2147483647;';
    this.host.hidden = true;
    this.shadowRoot = this.host.attachShadow({ mode: 'closed' });
    this.shadowRoot.append(this.createStyle(), this.createButton());
    document.documentElement.append(this.host);
  }

  show(rect) {
    this.position(rect);
    this.host.hidden = false;
  }

  hide() {
    this.host.hidden = true;
  }

  containsEvent(event) {
    return (
      event.composedPath?.().includes(this.host) ||
      this.host.contains(event.target)
    );
  }

  keepInViewport() {
    if (this.host.hidden) {
      return;
    }

    const left = Number.parseFloat(this.host.style.left) || VIEWPORT_MARGIN;
    const top = Number.parseFloat(this.host.style.top) || VIEWPORT_MARGIN;
    this.host.style.left = `${Math.round(clamp(left, VIEWPORT_MARGIN, window.innerWidth - TRIGGER_SIZE - VIEWPORT_MARGIN))}px`;
    this.host.style.top = `${Math.round(clamp(top, VIEWPORT_MARGIN, window.innerHeight - TRIGGER_SIZE - VIEWPORT_MARGIN))}px`;
  }

  position(rect) {
    const rightPlacement = rect.right + VIEWPORT_MARGIN;
    const belowPlacement = rect.bottom + VIEWPORT_MARGIN;
    const left =
      rightPlacement + TRIGGER_SIZE <= window.innerWidth - VIEWPORT_MARGIN
        ? rightPlacement
        : rect.left - TRIGGER_SIZE - VIEWPORT_MARGIN;
    const top =
      belowPlacement + TRIGGER_SIZE <= window.innerHeight - VIEWPORT_MARGIN
        ? belowPlacement
        : rect.top - TRIGGER_SIZE - VIEWPORT_MARGIN;

    this.host.style.left = `${Math.round(clamp(left, VIEWPORT_MARGIN, window.innerWidth - TRIGGER_SIZE - VIEWPORT_MARGIN))}px`;
    this.host.style.top = `${Math.round(clamp(top, VIEWPORT_MARGIN, window.innerHeight - TRIGGER_SIZE - VIEWPORT_MARGIN))}px`;
  }

  createStyle() {
    const style = document.createElement('style');
    style.textContent = `
      :host([hidden]) { display: none !important; }
      .jl-selection-trigger {
        align-items: center;
        appearance: none;
        background: linear-gradient(135deg, #db2f69 0%, #e33270 100%);
        border: 2px solid rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        box-shadow: 0 6px 18px rgba(214, 111, 147, 0.28);
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        font: 15px/1 "Noto Color Emoji", "Apple Color Emoji", sans-serif;
        height: ${TRIGGER_SIZE}px;
        justify-content: center;
        padding: 0;
        transition: background .15s ease, box-shadow .15s ease, transform .15s ease;
        width: ${TRIGGER_SIZE}px;
      }
      .jl-selection-trigger:hover {
        background: linear-gradient(135deg, #df7fa1 0%, #df417b 100%);
        box-shadow: 0 8px 20px rgba(214, 111, 147, 0.32);
        transform: scale(1.04);
      }
      .jl-selection-trigger:active {
        transform: scale(0.98);
      }
      .jl-selection-trigger:focus-visible {
        outline: 3px solid #ea2e8c;
        outline-offset: 3px;
      }
    `;
    return style;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'jl-selection-trigger';
    button.type = 'button';
    button.textContent = 'JP';
    button.setAttribute('aria-label', 'Open Japanese Learning Assistant');
    button.title = 'ゆいちゃん';
    // Keeping the selection is necessary so the popup receives the exact selected text.
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => this.onActivate());
    return button;
  }
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, Math.max(minimum, maximum)));
}
