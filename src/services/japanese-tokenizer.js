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
    return tokens.map((token) => ({
      surface: token.surface_form,
      reading: getTokenReading(token),
      showRuby: hasKanji(token.surface_form) && hasReliableReading(token)
    }));
  }

  async tokenize(text) {
    const tokenizer = await this.loadTokenizer();
    return tokenizer.tokenize(text);
  }

  loadTokenizer() {
    if (!this.tokenizerPromise) {
      this.tokenizerPromise = new Promise((resolve, reject) => {
        const kuromoji = globalThis.kuromoji;
        if (!kuromoji?.builder) {
          reject(new Error('Không thể khởi tạo bộ phân tích tiếng Nhật.'));
          return;
        }

        kuromoji.builder({ dicPath: this.dictionaryPath }).build((error, tokenizer) => {
          if (error) {
            reject(new Error('Không thể tải từ điển đọc tiếng Nhật.'));
            return;
          }

          resolve(tokenizer);
        });
      });
    }

    return this.tokenizerPromise;
  }
}

function hasReliableReading(token) {
  return typeof token.reading === 'string' && token.reading !== '*' && token.reading.length > 0;
}

function getTokenReading(token) {
  return hasReliableReading(token)
    ? katakanaToHiragana(token.reading)
    : katakanaToHiragana(token.surface_form);
}
