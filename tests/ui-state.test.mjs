import test from 'node:test';
import assert from 'node:assert/strict';
import { UI_STATE, UiStateManager } from '../src/content/ui-state.js';

test('selection UI starts idle and opens only after a visible trigger', () => {
  const state = new UiStateManager();

  assert.equal(state.is(UI_STATE.IDLE), true);
  assert.equal(state.openPopup(), false);

  state.showTrigger();
  assert.equal(state.is(UI_STATE.TRIGGER_VISIBLE), true);
  assert.equal(state.openPopup(), true);
  assert.equal(state.is(UI_STATE.POPUP_OPEN), true);
});

test('reset returns the selection UI to a single idle state', () => {
  const state = new UiStateManager();
  state.showTrigger();
  state.openPopup();
  state.reset();

  assert.equal(state.is(UI_STATE.IDLE), true);
});
