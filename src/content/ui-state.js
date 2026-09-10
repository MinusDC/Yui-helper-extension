export const UI_STATE = Object.freeze({
  IDLE: 'idle',
  TRIGGER_VISIBLE: 'trigger-visible',
  POPUP_OPEN: 'popup-open'
});

export class UiStateManager {
  constructor() {
    this.state = UI_STATE.IDLE;
  }

  showTrigger() {
    this.state = UI_STATE.TRIGGER_VISIBLE;
  }

  openPopup() {
    if (this.state !== UI_STATE.TRIGGER_VISIBLE && this.state !== UI_STATE.POPUP_OPEN) {
      return false;
    }

    this.state = UI_STATE.POPUP_OPEN;
    return true;
  }

  reset() {
    this.state = UI_STATE.IDLE;
  }

  is(state) {
    return this.state === state;
  }
}
