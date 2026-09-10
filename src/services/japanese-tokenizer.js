import kuromoji from 'kuromoji/build/kuromoji.js';
import { hasKanji, katakanaToHiragana } from '../utils/text.js';

/**
 * Kuromoji's IPADIC dictionary gives each token a context-sensitive reading.
 * Unknown Kanji is intentionally left as-is instead of guessed.
 */
export class JapaneseTokenizer {
  constructor(dictionaryPath) {
    this.dictionaryPath = dictionaryPath;
    this.tokenizerPromise = null;
  }

  async getReading(text) {
    const tokens = await this.tokenize(text);
    return tokens.map((token) => getTokenReading(token)).join('');
  }

  async getFuriganaTokens(text) {
    const tokens = await this.tokenize(text);
    return tokens.flatMap((token) => {
      if (!hasKanji(token.surface_form) || !hasReliableReading(token)) {
        return [
          {
            surface: token.surface_form,
            reading: getTokenReading(token),
            showRuby: false,
          },
        ];
      }

      const reading = getTokenReading(token);
      return alignFurigana(token.surface_form, reading);
    });
  }

  async tokenize(text) {
    const tokenizer = await this.loadTokenizer();
    return tokenizer.tokenize(text);
  }

  loadTokenizer() {
    if (!this.tokenizerPromise) {
      this.tokenizerPromise = new Promise((resolve, reject) => {
        ensureXhrPolyfill();
        const builderObj =
          kuromoji?.builder ||
          kuromoji?.default?.builder ||
          globalThis.kuromoji?.builder;
        if (!builderObj) {
          reject(new Error('Không thể khởi tạo bộ phân tích tiếng Nhật.'));
          return;
        }

        builderObj({ dicPath: this.dictionaryPath }).build(
          (error, tokenizer) => {
            if (error) {
              reject(new Error('Không thể tải từ điển đọc tiếng Nhật.'));
              return;
            }

            resolve(tokenizer);
          },
        );
      }).catch((error) => {
        this.tokenizerPromise = null;
        throw error;
      });
    }

    return this.tokenizerPromise;
  }
}

export function alignFurigana(surface, reading) {
  if (!hasKanji(surface) || !reading || reading === surface) {
    return [{ surface, reading: '', showRuby: false }];
  }

  const hiraganaReading = katakanaToHiragana(reading);

  const blocks = [];
  let currentIsKanji = hasKanji(surface[0]);
  let currentText = surface[0];

  for (let i = 1; i < surface.length; i++) {
    const char = surface[i];
    const isK = hasKanji(char);
    if (isK === currentIsKanji) {
      currentText += char;
    } else {
      blocks.push({ text: currentText, isKanji: currentIsKanji });
      currentIsKanji = isK;
      currentText = char;
    }
  }
  blocks.push({ text: currentText, isKanji: currentIsKanji });

  if (blocks.length === 1 && blocks[0].isKanji) {
    return [{ surface, reading: hiraganaReading, showRuby: true }];
  }

  let rIndex = 0;
  const result = [];

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    if (!block.isKanji) {
      const blockHiragana = katakanaToHiragana(block.text);
      if (hiraganaReading.startsWith(blockHiragana, rIndex)) {
        rIndex += blockHiragana.length;
        result.push({ surface: block.text, reading: '', showRuby: false });
      } else {
        return [{ surface, reading: hiraganaReading, showRuby: true }];
      }
    } else {
      let nextRIndex = hiraganaReading.length;
      if (b + 1 < blocks.length && !blocks[b + 1].isKanji) {
        const nextKanaHiragana = katakanaToHiragana(blocks[b + 1].text);
        const found = hiraganaReading.indexOf(nextKanaHiragana, rIndex + 1);
        if (found !== -1) {
          nextRIndex = found;
        } else {
          return [{ surface, reading: hiraganaReading, showRuby: true }];
        }
      }

      const kanjiReading = hiraganaReading.slice(rIndex, nextRIndex);
      if (!kanjiReading) {
        return [{ surface, reading: hiraganaReading, showRuby: true }];
      }
      result.push({
        surface: block.text,
        reading: kanjiReading,
        showRuby: true,
      });
      rIndex = nextRIndex;
    }
  }

  if (rIndex !== hiraganaReading.length) {
    return [{ surface, reading: hiraganaReading, showRuby: true }];
  }

  return result;
}

function hasReliableReading(token) {
  return (
    typeof token.reading === 'string' &&
    token.reading !== '*' &&
    token.reading.length > 0
  );
}

function getTokenReading(token) {
  return hasReliableReading(token)
    ? katakanaToHiragana(token.reading)
    : katakanaToHiragana(token.surface_form);
}

function ensureXhrPolyfill() {
  if (typeof XMLHttpRequest === 'undefined') {
    globalThis.XMLHttpRequest = class XMLHttpRequest {
      open(method, url) {
        this.url = url;
      }
      async send() {
        try {
          const response = await fetch(this.url);
          if (!response.ok) {
            this.status = response.status;
            this.statusText = response.statusText;
            this.onload?.();
            return;
          }
          this.status = 200;
          this.response = await response.arrayBuffer();
          this.onload?.();
        } catch (error) {
          this.onerror?.(error);
        }
      }
    };
  }
}
