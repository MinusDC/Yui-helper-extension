import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TEXT_LENGTH } from '../src/utils/constants.js';
import { containsJapanese, normalizeSelectedText, validateJapaneseText } from '../src/utils/text.js';

test('detects Kanji, Hiragana, Katakana, and mixed Japanese text', () => {
  for (const sample of [
    '日本語',
    '日本語を勉強しています。',
    '私はPythonを勉強しています。',
    'こんにちは',
    'コンピューター',
    '「日本語を勉強しています。」'
  ]) {
    assert.equal(containsJapanese(sample), true, sample);
  }
});

test('does not detect non-Japanese text', () => {
  assert.equal(containsJapanese('Hello world'), false);
  assert.equal(containsJapanese('Xin chào'), false);
});

test('normalizes selection whitespace without tokenizing Japanese by whitespace', () => {
  assert.equal(normalizeSelectedText('  日本語を\n 勉強しています。  '), '日本語を 勉強しています。');
});

test('rejects text over the shared API length limit', () => {
  const result = validateJapaneseText(`日${'本'.repeat(MAX_TEXT_LENGTH)}`);
  assert.equal(result.valid, false);
  assert.match(result.error, /quá dài/);
});
