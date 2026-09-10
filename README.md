# Japanese Learning Assistant

Browser extension Manifest V3 hỗ trợ học tiếng Nhật trên trang web. Bôi đen văn bản tiếng Nhật để dịch sang tiếng Việt, xem Hiragana/Furigana hoặc tra nghĩa từ vựng.

## Quick start for contributors

```bash
git clone <github-repo-url>
cd Yui-helper-extension
npm install
npm run build
```

Sau đó mở Chrome hoặc Edge và tải extension từ thư mục `dist` theo hướng dẫn bên dưới.

> Lưu ý: `dist/` là build output của extension, nên thường được bỏ qua khi commit lên GitHub. Repo gốc nên chỉ chứa source code và file cấu hình.

## Installation

Yêu cầu Node.js 20+ và Chrome hoặc Microsoft Edge.

```bash
cd Yui-helper-extension
npm install
npm run build
```

Mở `chrome://extensions/` (hoặc `edge://extensions/`), bật **Developer mode**, chọn **Load unpacked**, rồi chọn thư mục `Yui-helper-extension/dist`.

Sau khi thay đổi source, chạy lại `npm run build` và bấm Reload trên trang Extensions.

## Usage

1. Mở bất kỳ website thông thường có nội dung tiếng Nhật.
2. Bôi đen một từ, câu hoặc đoạn tối đa 1.000 ký tự.
3. Một nút tròn 🇯🇵 xuất hiện cạnh selection nếu selection có Hiragana, Katakana hoặc Kanji; popup **không** tự mở.
4. Bấm nút 🇯🇵 để mở Japanese Learning Assistant, sau đó chọn một thao tác:
   - **🇻🇳 Dịch**: dịch Nhật → Việt.
   - **あ Hiragana**: token hóa cục bộ rồi hiển thị cách đọc.
   - **🈁 Furigana**: hiển thị token Kanji có reading đáng tin cậy dưới dạng `ruby/rt`.
   - **📖 Tra từ**: tra Jisho, với phần nghĩa tiếng Anh do Jisho cung cấp.
   - **☆ Lưu mục**: lưu mục vào local storage và ngăn mục trùng lặp.

Popup của browser action cho phép bật/tắt selection popup, xem tối đa tám lịch sử gần nhất và từ đã lưu. Các trang đặc biệt như `chrome://`, `edge://` và Chrome Web Store không cho content script chạy theo chính sách của trình duyệt.

## Architecture

```text
Page selection
  ↓  selectionchange (180 ms debounce)
Selection trigger (Shadow DOM, explicit user click)
  ↓
Content popup (Shadow DOM)
  ├─ local Kuromoji + IPADIC → token, Hiragana, Furigana
  └─ typed chrome.runtime message
       ↓
Manifest V3 service worker
  ├─ TranslationService → Google Translate prototype endpoint
  ├─ DictionaryService → Jisho API
  └─ StorageService → chrome.storage.local
       ↓
Browser-action popup → settings, history, saved vocabulary
```

`src/content` chỉ chịu trách nhiệm selection/UI, `src/background` điều phối và xác thực message, `src/services` tách riêng external API, tokenizer và storage. Tất cả kết quả từ trang web/API được đưa vào DOM bằng `textContent` hoặc node DOM được tạo trực tiếp; extension không chèn HTML không tin cậy.

## APIs

- **Google Translate `translate.googleapis.com`**: endpoint công khai không khóa, dùng cho prototype Nhật → Việt. Đây không phải cam kết API production; có thể thay đổi/rate-limit mà không báo trước. Muốn triển khai production, thay implementation của `TranslationService` bằng provider có hợp đồng/API key do backend của bạn bảo vệ.
- **Jisho API `jisho.org/api/v1/search/words`**: tra mục từ, cách đọc, nghĩa tiếng Anh và từ loại khi API trả về dữ liệu. Extension không tự bịa nghĩa hoặc JLPT.
- **Kuromoji.js 0.1.2 + IPADIC**: tokenizer cục bộ. Từ điển được đóng vào `dist/dict`; selected text không rời thiết bị khi dùng Hiragana/Furigana. Kuromoji.js có Apache-2.0; cần rà soát license của dữ liệu IPADIC theo chính sách phát hành trước khi phát hành store.

Chỉ văn bản người dùng chủ động chọn và bấm **Dịch** hoặc **Tra từ** mới được gửi đến provider tương ứng. Không có API key hay secret trong source.

## Permissions and security

- `storage`: lưu settings, history (tối đa 100), và vocabulary.
- `host_permissions`: chỉ `translate.googleapis.com` và `jisho.org` cho hai API thực tế.
- `<all_urls>` ở content script là cần thiết để selection popup hoạt động trên website mà người dùng học. Nó không thể chạy ở các trang bị trình duyệt hạn chế.
- Không dùng `eval`, inline JavaScript, Manifest V2, `tabs`, `history`, `bookmarks`, hay `management`.
- Popup trên trang chạy trong closed Shadow DOM, CSS có namespace `jl-`, là `position: fixed`, và không sửa DOM/CSS nội dung website.

## Development and verification

```bash
npm run build
npm run check
npm test
npm run test:browser
```

`npm run check` xác nhận file output, Manifest V3 và không có permission bị cấm. Unit tests kiểm tra phát hiện Japanese, trường hợp không phải Japanese, chuẩn hóa whitespace, và giới hạn 1.000 ký tự.

`npm run test:browser` chạy Chrome qua DevTools Protocol với profile tạm, nạp `dist`, rồi kiểm tra selection → trigger → popup, scroll lên/xuống, resize, click trong popup, copy, selection mới, non-Japanese và outside-click. Có thể chỉ định Edge/Chromium khác trên Windows:

```powershell
$env:CHROME_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:browser
```

Manual test sau khi Load unpacked:

| Selection | Expected |
| --- | --- |
| `日本語` | Hiện trigger; bấm trigger để dùng Hiragana/dictionary |
| `日本語を勉強しています。` | Hiện trigger; Hiragana đọc `にほんごをべんきょうしています。` sau khi mở popup |
| `私はPythonを勉強しています。` | Hiện trigger; token Latin được giữ nguyên |
| `こんにちは` | Hiện trigger |
| `コンピューター` | Hiện trigger |
| `Hello world`, `Xin chào` | Không có trigger/popup |
| `「日本語を勉強しています。」` | Hiện trigger; ký tự đặc biệt được giữ |
| Hơn 1.000 ký tự | Thông báo đoạn quá dài khi chạy tác vụ |

Thử thêm flow bắt buộc: chọn Japanese → bấm trigger → cuộn lên/xuống → popup vẫn mở → bấm trong popup → vẫn mở → bấm vùng website bên ngoài → đóng. Thử trên website CSS phức tạp/dark mode để xác nhận card Shadow DOM vẫn đọc được và không ảnh hưởng giao diện host.

## Dependencies

- **kuromoji**: tokenizer/dictionary tiếng Nhật chạy tại máy, thay cho tách whitespace hoặc map Kanji từng ký tự. Đây là dependency bắt buộc để reading/furigana có ngữ cảnh token.
- **esbuild** (dev): bundle ES modules cho content script cổ điển và service-worker ES module. Không có runtime framework.

## Known limitations

- Google Translate endpoint là prototype không khóa, không phù hợp SLA/production.
- Jisho chủ yếu trả nghĩa tiếng Anh và không đảm bảo tìm được cả câu dài; tốt nhất chọn một từ khi tra từ.
- IPADIC không biết mọi tên riêng/từ mới. Với Kanji chưa có reading đáng tin cậy, extension giữ nguyên surface form, không đoán cách đọc.
- Furigana hiện được gắn ở cấp token; một số token lẫn Kanji/kana có thể không chia nhỏ ở cấp từng Kanji.
- History chỉ lưu sau khi người dùng chủ động chạy một thao tác, không lưu nội dung website tự động.
- Chưa có JLPT, ví dụ câu, pitch accent, đồng bộ, export Anki hoặc từ điển offline đầy đủ.

## Future improvements

1. Provider translation production qua backend không lộ secret.
2. Dictionary tiếng Việt có nguồn dữ liệu/JLPT đáng tin cậy.
3. Chọn token con trong câu trước khi tra nghĩa; ví dụ câu và pitch accent.
4. Review flashcard, spaced repetition, Anki export và settings mở rộng.
5. Từ điển/tokenizer offline tối ưu bundle và dark mode của browser-action popup.
