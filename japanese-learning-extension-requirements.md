# Yêu cầu & lưu ý khi phát triển Japanese Learning Browser Extension

## 1. Mục tiêu dự án

Xây dựng một Browser Extension dành cho người học tiếng Nhật, ưu tiên Chrome/Chromium và tương thích Edge.

Chức năng cốt lõi:

1. Người dùng có thể bôi đen một đoạn văn/câu tiếng Nhật trên bất kỳ website phù hợp nào.
2. Extension phát hiện nội dung được chọn.
3. Hiển thị một popup nhỏ gần vùng được chọn.
4. Cho phép:
   - Dịch tiếng Nhật → tiếng Việt.
   - Hiển thị cách đọc Hiragana cho Kanji.
   - Hiển thị Furigana nếu có thể.
   - Tra cứu/phân tích từ vựng.
5. Giao diện phải nhẹ, không làm thay đổi nội dung hoặc layout của website đang truy cập.

---

## 2. Công nghệ và nền tảng

### Bắt buộc

- JavaScript hiện đại (ES6+).
- HTML5.
- CSS3.
- Chrome Extension Manifest V3.
- Có thể sử dụng TypeScript nếu Codex thấy phù hợp, nhưng không bắt buộc.
- Ưu tiên Web APIs native trước khi thêm thư viện bên ngoài.

### Tương thích

Ưu tiên:

- Google Chrome.
- Microsoft Edge.
- Các Chromium-based browsers khác nếu không phát sinh khác biệt API.

Không sử dụng Manifest V2.

---

## 3. Cấu trúc kiến trúc đề xuất

Tách rõ trách nhiệm giữa các thành phần:

```text
Japanese Learning Extension
│
├── manifest.json
│
├── content/
│   ├── content.js
│   └── content.css
│
├── background/
│   └── background.js
│
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
│
├── services/
│   ├── translationService.js
│   ├── japaneseService.js
│   └── storageService.js
│
├── utils/
│   ├── japaneseDetector.js
│   ├── textUtils.js
│   └── domUtils.js
│
└── README.md
```

Nếu dự án nhỏ, có thể đơn giản hóa cấu trúc nhưng vẫn phải giữ nguyên nguyên tắc tách trách nhiệm.

---

# 4. Chức năng phát hiện văn bản được bôi đen

Content Script phải theo dõi thao tác chọn văn bản của người dùng.

Ví dụ:

```text
日本語を勉強しています。
```

Khi người dùng bôi đen câu trên, extension phải lấy được:

```text
日本語を勉強しています。
```

### Yêu cầu

- Sử dụng `window.getSelection()`.
- Xử lý `selectionchange`, `mouseup` hoặc cơ chế phù hợp.
- Không xử lý nếu selection rỗng.
- Trim khoảng trắng dư thừa.
- Không hiện popup nếu nội dung không có tiếng Nhật.
- Không làm mất selection của người dùng.
- Không can thiệp vào thao tác copy/paste mặc định của website.

---

# 5. Nhận diện tiếng Nhật

Extension phải nhận diện tối thiểu:

### Hiragana

Unicode:

```text
U+3040–U+309F
```

### Katakana

Unicode:

```text
U+30A0–U+30FF
```

### Kanji

Có thể nhận diện phạm vi Unicode CJK phổ biến:

```text
U+4E00–U+9FAF
```

Có thể mở rộng Unicode range nếu cần.

### Lưu ý

Không được giả định rằng tất cả văn bản tiếng Nhật đều có khoảng trắng.

Ví dụ:

```text
私は日本語を勉強しています。
```

Không được xử lý bằng:

```javascript
text.split(/\s+/)
```

để tách từ tiếng Nhật.

Đây là một yêu cầu quan trọng.

---

# 6. Popup khi bôi đen

Popup phải xuất hiện gần vùng text được chọn.

Ví dụ:

```text
┌─────────────────────────────────┐
│ 🇯🇵 Japanese Assistant        × │
├─────────────────────────────────┤
│ 日本語を勉強しています。           │
├─────────────────────────────────┤
│ 🇻🇳 Dịch       あ Hiragana       │
│ 📖 Tra từ      🈁 Furigana       │
├─────────────────────────────────┤
│ Kết quả                         │
└─────────────────────────────────┘
```

### Yêu cầu UI

- Kích thước nhỏ gọn.
- Có `z-index` cao.
- Không bị che bởi phần tử thông thường của website.
- Không phá layout website.
- Có thể đóng popup.
- Tự đóng khi người dùng click ra ngoài.
- Không tạo nhiều popup trùng nhau.
- Không vượt khỏi viewport.
- Nếu selection gần cạnh màn hình, popup phải tự điều chỉnh vị trí.
- Có loading state.
- Có error state.
- Có empty state.

### Quan trọng

CSS của extension phải tránh xung đột với website.

Nên sử dụng prefix riêng, ví dụ:

```text
.jl-
#japanese-learning-
```

Không dùng các selector global như:

```css
button {}
div {}
p {}
body {}
```

trong content CSS.

---

# 7. Chức năng dịch tiếng Việt

Khi người dùng chọn:

```text
🇻🇳 Dịch tiếng Việt
```

Extension gửi nội dung tiếng Nhật đến Translation Service.

Ví dụ:

```text
日本語を勉強しています。
```

Kết quả:

```text
Tôi đang học tiếng Nhật.
```

### Kiến trúc

Không hard-code API trực tiếp trong UI.

Nên có:

```javascript
translationService.translate(text)
```

để dễ thay đổi provider sau này.

### API

Có thể bắt đầu bằng một API dịch phù hợp cho prototype.

Tuy nhiên:

- Không hard-code API key trong source code.
- Không commit secret vào Git.
- Nếu API yêu cầu API key, phải sử dụng cấu hình an toàn phù hợp.
- Phải xử lý timeout.
- Phải xử lý HTTP error.
- Phải xử lý API response không hợp lệ.
- Phải có fallback/error message.

### Bảo mật

Không gửi dữ liệu người dùng đến server không cần thiết.

Chỉ gửi đoạn text mà người dùng chủ động chọn để dịch.

---

# 8. Chức năng Kanji → Hiragana

Đây là chức năng quan trọng.

Ví dụ:

```text
日本語を勉強しています。
```

Kết quả:

```text
にほんごをべんきょうしています。
```

Hoặc tốt hơn:

```text
日本語 → にほんご
勉強 → べんきょう
```

### KHÔNG được

Không được coi mỗi Kanji là một từ độc lập.

Ví dụ không nên xử lý:

```text
日本語
```

thành:

```text
日 → にち
本 → ほん
語 → ご
```

vì cách đọc phụ thuộc vào từ.

Phải ưu tiên phân tích theo token/từ.

---

# 9. Furigana

Nên hỗ trợ hiển thị:

```text
日本語（にほんご）を
勉強（べんきょう）しています。
```

Hoặc giao diện HTML:

```html
<ruby>
  日本語
  <rt>にほんご</rt>
</ruby>
```

### Lưu ý

Ưu tiên sử dụng `<ruby>` để hiển thị Furigana.

Không tự suy đoán cách đọc Kanji bằng một bảng mapping đơn giản.

Ví dụ:

```text
生
```

có nhiều cách đọc:

```text
せい
しょう
い
う
なま
```

Do đó cần dictionary/tokenization hoặc Japanese language service.

---

# 10. Phân tách từ tiếng Nhật

Đây là điểm cần đặc biệt chú ý.

Tiếng Nhật thông thường không có khoảng trắng giữa các từ:

```text
昨日は友達と一緒に映画を見に行きました。
```

Không được dùng:

```javascript
text.split(" ")
```

để phân tích.

Nên sử dụng một Japanese tokenizer/dictionary phù hợp nếu cần phân tích từ.

Có thể cân nhắc:

- Kuromoji.js.
- Một tokenizer chạy phía client.
- Một Japanese dictionary API.
- Một backend service chuyên xử lý tiếng Nhật.

Nếu thêm thư viện, cần đánh giá:

- Kích thước bundle.
- Hiệu năng.
- License.
- Khả năng chạy trong Chrome Extension.
- Khả năng offline.
- Khả năng xử lý câu dài.

---

# 11. Tra cứu từ vựng

Khi người dùng bôi đen một từ hoặc câu, nên hỗ trợ phân tích:

```text
日本語
にほんご
Nghĩa: tiếng Nhật
```

Có thể hiển thị:

```text
Kanji:
日本語

Hiragana:
にほんご

Meaning:
Japanese language

JLPT:
N5
```

Nếu API/dictionary cung cấp:

- Part of speech.
- Example sentence.
- Pitch accent.
- JLPT level.
- Kanji components.

thì có thể hiển thị ở phần mở rộng.

Không bắt buộc phải triển khai tất cả ngay từ phiên bản đầu tiên.

---

# 12. JLPT

Nếu dictionary có dữ liệu JLPT, có thể hiển thị:

```text
N5
N4
N3
N2
N1
```

Ví dụ:

```text
勉強
べんきょう
Học

JLPT: N5
```

Không được tự đoán JLPT nếu không có nguồn dữ liệu đáng tin cậy.

Nếu chưa có dữ liệu JLPT, bỏ qua trường này thay vì hiển thị thông tin không chính xác.

---

# 13. Storage

Có thể sử dụng:

```javascript
chrome.storage.local
```

để lưu:

- Lịch sử tra cứu.
- Từ vựng đã lưu.
- Cài đặt người dùng.
- Ngôn ngữ đích.
- Các tùy chọn hiển thị.

Ví dụ:

```text
Saved Words
├── 日本語
├── 勉強
├── 友達
└── 映画
```

Không lưu toàn bộ nội dung website.

Chỉ lưu dữ liệu cần thiết.

---

# 14. Tính năng lưu từ vựng

Nên có nút:

```text
⭐ Lưu từ
```

Ví dụ:

```text
日本語
にほんご
Japanese language

[⭐ Lưu]
```

Khi lưu thành công:

```text
✓ Đã lưu
```

Nếu từ đã tồn tại:

```text
✓ Đã lưu trước đó
```

Không tạo duplicate.

---

# 15. Lịch sử tra cứu

Có thể lưu:

```text
History

1. 日本語
   にほんご
   5 phút trước

2. 勉強
   べんきょう
   10 phút trước
```

Có thể giới hạn số lượng lịch sử, ví dụ:

```text
100 items
```

để tránh storage tăng không kiểm soát.

---

# 16. Popup Extension

Khi người dùng click icon Extension trên browser, mở:

```text
popup.html
```

Có thể hiển thị:

```text
🇯🇵 Japanese Learning Assistant

Quick Settings

☑ Enable selection popup

Translation:
Japanese → Vietnamese

History
Saved Words
Settings
```

Popup browser và popup xuất hiện trên webpage phải được tách biệt.

---

# 17. Background Service Worker

Manifest V3 sử dụng Service Worker.

Ví dụ:

```text
background.js
```

Chỉ sử dụng background khi cần:

- API request cần xử lý tập trung.
- Message passing.
- Context menu.
- Storage/background events.
- Các tác vụ không phù hợp với content script.

Không đưa toàn bộ logic vào background nếu không cần thiết.

---

# 18. Message Passing

Nếu content script cần gọi background:

```text
Content Script
      │
      │ chrome.runtime.sendMessage()
      ▼
Background Service Worker
      │
      │ API
      ▼
Translation / Dictionary
      │
      ▼
Background
      │
      ▼
Content Script
```

Phải xử lý:

- success
- error
- timeout
- malformed response

Ví dụ:

```javascript
chrome.runtime.sendMessage(
  {
    type: "TRANSLATE",
    text: selectedText
  },
  response => {
    // xử lý kết quả
  }
);
```

Không truyền dữ liệu thừa.

---

# 19. Content Security Policy

Tuân thủ CSP của Chrome Extension Manifest V3.

Không sử dụng:

```javascript
eval()
```

Không sử dụng inline JavaScript không cần thiết.

Không dùng:

```html
<script>
  ...
</script>
```

nếu không cần.

Tách JavaScript thành file riêng.

---

# 20. Không dùng inline HTML nguy hiểm

Cẩn thận khi hiển thị nội dung lấy từ website hoặc API.

Không nên trực tiếp:

```javascript
element.innerHTML = apiResult;
```

nếu dữ liệu chưa được kiểm soát.

Ưu tiên:

```javascript
element.textContent = apiResult;
```

Nếu bắt buộc dùng HTML, phải sanitize dữ liệu.

Đặc biệt không để text của website trở thành executable HTML/JavaScript.

---

# 21. Permissions

Chỉ yêu cầu permission cần thiết.

Không yêu cầu quyền quá rộng nếu không cần.

Ví dụ cần cân nhắc:

```json
"permissions": [
  "storage"
]
```

và:

```json
"host_permissions": [
  "https://api.example.com/*"
]
```

Không tùy tiện thêm:

```text
tabs
history
bookmarks
management
```

nếu chức năng không sử dụng.

---

# 22. `<all_urls>` và quyền website

Nếu extension cần hoạt động trên mọi website, có thể cần:

```json
"matches": [
  "<all_urls>"
]
```

Nhưng phải hiểu rằng đây là quyền rộng.

Nếu có thể giới hạn domain thì nên giới hạn.

Không cố gắng vượt qua giới hạn bảo mật của browser.

Một số trang đặc biệt như:

```text
chrome://
edge://
Chrome Web Store
```

có thể không cho Content Script hoạt động.

Đây là hành vi bình thường của browser.

---

# 23. Context Menu

Có thể bổ sung menu chuột phải:

```text
Bôi đen text
     ↓
Right Click
     ↓
Japanese Learning Assistant
     ├── Dịch tiếng Việt
     ├── Hiragana
     └── Tra từ
```

Nếu triển khai, sử dụng Chrome Context Menus API.

Không bắt buộc cho MVP.

---

# 24. UX khi đang gọi API

Khi gọi API phải có:

```text
⏳ Đang xử lý...
```

Không cho phép người dùng bấm liên tục gây nhiều request.

Có thể disable button trong lúc request:

```javascript
button.disabled = true;
```

Sau khi hoàn thành:

```javascript
button.disabled = false;
```

---

# 25. Debounce / chống request dư thừa

Không gọi API mỗi lần `selectionchange`.

Ví dụ người dùng kéo chuột tạo ra nhiều event.

Nên debounce hoặc chỉ xử lý khi selection ổn định.

Có thể dùng:

```javascript
setTimeout(...)
```

hoặc debounce function.

---

# 26. Cache

Có thể cache kết quả:

```text
日本語を勉強しています。
```

Nếu người dùng tra lại cùng text:

```text
Cache hit
```

không cần gọi API lần nữa.

Cache nên có giới hạn.

Không cache vô hạn.

---

# 27. Xử lý câu dài

Cần giới hạn độ dài text gửi API.

Ví dụ:

```text
MAX_TEXT_LENGTH = 1000
```

Nếu người dùng bôi quá dài:

```text
Đoạn văn quá dài.
Vui lòng chọn một câu hoặc đoạn ngắn hơn.
```

Giá trị giới hạn có thể điều chỉnh tùy API.

---

# 28. Xử lý lỗi

Các lỗi cần hiển thị thân thiện.

Ví dụ:

```text
❌ Không thể kết nối đến dịch vụ.

Vui lòng thử lại sau.
```

Không hiển thị lỗi kỹ thuật dài cho người dùng cuối.

Console vẫn có thể log:

```javascript
console.error(error);
```

để developer debug.

---

# 29. Offline

MVP có thể yêu cầu Internet.

Tuy nhiên kiến trúc nên cho phép sau này hỗ trợ offline.

Ví dụ:

```text
Online:
Dictionary API
Translation API

Offline:
Local Japanese Dictionary
Local tokenizer
Local cached vocabulary
```

Không thiết kế code khiến toàn bộ extension phụ thuộc cứng vào một API.

---

# 30. Hiệu năng

Extension phải nhẹ.

Không:

- chạy vòng lặp liên tục trên toàn bộ DOM.
- scan toàn bộ website mỗi khi mouse move.
- gửi request liên tục.
- load dictionary khổng lồ nếu chưa cần.
- inject nhiều DOM element không cần thiết.

Chỉ xử lý khi người dùng thực sự chọn text.

---

# 31. Không thay đổi website

Extension phải hoạt động như một lớp UI độc lập.

Không được:

- sửa nội dung website.
- thay đổi CSS của website.
- thay đổi font toàn trang.
- chặn sự kiện click của website.
- override global JavaScript của website.

Popup phải được mount độc lập.

Có thể cân nhắc Shadow DOM để cách ly CSS:

```javascript
const shadowRoot = host.attachShadow({
  mode: "closed"
});
```

Nếu dùng Shadow DOM, đảm bảo các event và accessibility vẫn hoạt động tốt.

---

# 32. Accessibility

UI nên hỗ trợ:

- keyboard navigation.
- button có `aria-label`.
- focus rõ ràng.
- contrast đủ tốt.
- font dễ đọc.
- không phụ thuộc hoàn toàn vào màu sắc.

Ví dụ:

```html
<button
  aria-label="Dịch sang tiếng Việt">
  🇻🇳 Dịch
</button>
```

---

# 33. Thiết kế giao diện

Phong cách đề xuất:

```text
Clean
Minimal
Japanese-inspired
Modern
Compact
```

Màu sắc có thể lấy cảm hứng từ:

```text
White
Red
Dark gray
Light gray
```

Không làm UI quá lớn.

Ưu tiên đọc tiếng Nhật dễ dàng.

---

# 34. MVP

Phiên bản đầu tiên chỉ cần:

### MVP-1

```text
1. Detect selected Japanese text
2. Popup UI
3. Translate Japanese → Vietnamese
4. Kanji → Hiragana
5. Error handling
6. Loading state
7. Chrome Manifest V3
```

Sau khi MVP ổn định mới phát triển:

```text
MVP-2
├── Furigana
├── Dictionary
├── Word segmentation
├── Save vocabulary
└── History

MVP-3
├── JLPT level
├── Example sentences
├── Notes
├── Review vocabulary
└── Settings

MVP-4
├── Offline dictionary
├── Anki export
├── Dark mode
└── Advanced Japanese analysis
```

---

# 35. Data model đề xuất

Vocabulary:

```javascript
{
  id: "uuid",
  word: "日本語",
  reading: "にほんご",
  meaning: "Tiếng Nhật",
  jlpt: "N5",
  createdAt: 1234567890
}
```

History:

```javascript
{
  id: "uuid",
  text: "日本語を勉強しています。",
  translation: "Tôi đang học tiếng Nhật.",
  reading: "にほんごをべんきょうしています。",
  createdAt: 1234567890
}
```

Không lưu dữ liệu nhạy cảm.

---

# 36. API abstraction

Không viết:

```javascript
fetch("https://some-api.com/...")
```

rải rác khắp project.

Tạo service:

```javascript
class TranslationService {

  async translate(text) {
    // API logic
  }

}
```

và:

```javascript
class JapaneseService {

  async getReading(text) {
    // Japanese dictionary/tokenizer logic
  }

}
```

UI chỉ gọi:

```javascript
translationService.translate(text);
```

Điều này giúp thay API sau này dễ dàng.

---

# 37. Không hard-code secret

Tuyệt đối không commit:

```javascript
const API_KEY = "xxxxxxxx";
```

vào Git repository.

Nếu cần API key:

- sử dụng cơ chế cấu hình phù hợp.
- tài liệu rõ cách cấu hình.
- không đưa key thật vào source code public.

Nếu API không yêu cầu key thì ưu tiên API phù hợp cho prototype.

---

# 38. Logging

Trong development:

```javascript
console.debug(...)
console.info(...)
console.error(...)
```

Có thể sử dụng.

Trước production nên giảm log không cần thiết.

Không log:

- API key.
- dữ liệu nhạy cảm.
- thông tin tài khoản.
- dữ liệu không cần thiết.

---

# 39. Testing

Cần test ít nhất:

### Selection

```text
日本語
日本語を勉強しています。
```

### Không phải tiếng Nhật

```text
Hello world
Xin chào
```

→ Không hiện popup.

### Kanji

```text
日本語
勉強
学生
```

### Hiragana

```text
こんにちは
```

### Katakana

```text
コンピューター
```

### Câu hỗn hợp

```text
私はPythonを勉強しています。
```

### Ký tự đặc biệt

```text
「日本語を勉強しています。」
```

### Câu dài

Kiểm tra giới hạn request.

### Website có CSS phức tạp

Đảm bảo popup không bị CSS website phá.

### Website có dark mode

Popup vẫn phải hiển thị đúng.

---

# 40. Debugging

Khi gặp lỗi:

### Content script

Mở:

```text
DevTools → Console
```

### Popup

```text
chrome://extensions/
→ Extension
→ Inspect views
```

### Background

```text
chrome://extensions/
→ Service Worker
→ Inspect
```

Phải xác định lỗi thuộc:

```text
Content Script
Popup
Background
API
Storage
```

trước khi sửa.

---

# 41. Code quality

Codex cần:

- Viết code rõ ràng.
- Tên biến/function có ý nghĩa.
- Không duplicate code.
- Không tạo file/thư viện không cần thiết.
- Tách logic theo module.
- Có comment ở phần logic phức tạp.
- Không comment những đoạn code hiển nhiên.
- Không viết một file JavaScript khổng lồ chứa toàn bộ project.

Ưu tiên:

```javascript
async/await
const
let
modules
```

tránh code callback lồng nhau nếu không cần.

---

# 42. Yêu cầu khi Codex sửa code

Trước khi sửa:

1. Đọc toàn bộ cấu trúc project hiện tại.
2. Kiểm tra `manifest.json`.
3. Xác định Chrome Extension Manifest V3.
4. Kiểm tra các permission hiện có.
5. Không tự ý thay đổi architecture nếu không cần.
6. Tìm nguyên nhân lỗi trước khi sửa.
7. Giữ backward compatibility với chức năng đang chạy.

Sau khi sửa:

1. Kiểm tra syntax.
2. Kiểm tra import/export.
3. Kiểm tra Manifest V3.
4. Kiểm tra permission.
5. Kiểm tra message passing.
6. Kiểm tra API request.
7. Kiểm tra UI.
8. Kiểm tra console errors.

---

# 43. Quy tắc quan trọng cho Codex

Khi được yêu cầu implement một chức năng:

### Không được

- Viết code giả rồi nói đã hoàn thành.
- Tạo API giả mà không nói rõ.
- Hard-code API key.
- Dùng Manifest V2.
- Dùng `eval()`.
- Bỏ qua error handling.
- Dùng `innerHTML` với dữ liệu không tin cậy.
- Tách từ tiếng Nhật bằng whitespace đơn giản.
- Tự suy đoán cách đọc Kanji bằng mapping đơn giản.
- Thay đổi website đang được người dùng truy cập.
- Thêm permission không cần thiết.

### Phải

- Ưu tiên code có thể chạy thực tế.
- Giữ kiến trúc dễ mở rộng.
- Tách API/service khỏi UI.
- Có loading/error state.
- Có xử lý text tiếng Nhật đúng.
- Có khả năng thay đổi API provider.
- Có README hướng dẫn cài đặt.
- Giải thích các dependency mới được thêm vào.
- Nếu có giới hạn do API/dịch vụ bên ngoài, phải nói rõ.

---

# 44. Thứ tự triển khai đề xuất

Codex nên triển khai theo thứ tự:

```text
Phase 1
│
├── Manifest V3
├── Content Script
├── Detect selected text
└── Popup cơ bản
        │
        ▼
Phase 2
│
├── Translation Service
├── Japanese → Vietnamese
├── Loading
└── Error handling
        │
        ▼
Phase 3
│
├── Japanese tokenizer/dictionary
├── Kanji reading
└── Hiragana/Furigana
        │
        ▼
Phase 4
│
├── Dictionary
├── Word details
├── JLPT
└── Example sentences
        │
        ▼
Phase 5
│
├── Save vocabulary
├── History
├── Settings
└── Storage
        │
        ▼
Phase 6
│
├── Performance optimization
├── Security review
├── Permission review
├── UX polish
└── Production build
```

---

# 45. Tiêu chí hoàn thành MVP

MVP được coi là hoàn thành khi:

- [ ] Extension cài được bằng "Load unpacked".
- [ ] Chạy trên Chrome/Edge.
- [ ] Manifest V3 hợp lệ.
- [ ] Bôi đen tiếng Nhật → popup xuất hiện.
- [ ] Bôi đen tiếng Anh → không hiện popup.
- [ ] Có nút dịch tiếng Việt.
- [ ] Có kết quả dịch.
- [ ] Có trạng thái loading.
- [ ] Có xử lý lỗi.
- [ ] Có chức năng đọc Hiragana.
- [ ] Không phá giao diện website.
- [ ] Không có API key hard-code.
- [ ] Không có lỗi nghiêm trọng trong Console.
- [ ] Code được chia module hợp lý.
- [ ] Có README hướng dẫn cài đặt và sử dụng.

---

# 46. Định hướng mở rộng

Sau MVP có thể phát triển thành một hệ thống học tiếng Nhật hoàn chỉnh:

```text
Bôi đen câu
     ↓
Phân tích câu
     ↓
┌──────────────────────────────┐
│ 日本語を勉強しています。       │
├──────────────────────────────┤
│ にほんごをべんきょうしています。│
├──────────────────────────────┤
│ Tôi đang học tiếng Nhật.     │
├──────────────────────────────┤
│ 日本語                         │
│ にほんご                      │
│ Tiếng Nhật                    │
│ JLPT N5                       │
│ ⭐ Lưu từ                     │
└──────────────────────────────┘
```

Các tính năng tương lai:

- Phân tích ngữ pháp.
- JLPT level.
- Pitch accent.
- Ví dụ câu.
- Text-to-Speech.
- Phát âm tiếng Nhật.
- Flashcard.
- Spaced repetition.
- Export Anki.
- Dark mode.
- Offline dictionary.
- Đồng bộ dữ liệu.
- Tùy chỉnh ngôn ngữ dịch.
- Hotkey.
- Right-click context menu.

---

# 47. Yêu cầu cuối cùng

Mục tiêu không phải chỉ tạo một extension "dịch văn bản".

Mục tiêu là xây dựng:

> **Japanese Learning Assistant — một công cụ hỗ trợ học tiếng Nhật ngay trên trình duyệt.**

Mọi quyết định về architecture, UI, API và data model nên ưu tiên khả năng mở rộng từ MVP thành một công cụ học tiếng Nhật hoàn chỉnh.

Khi implement, ưu tiên:

```text
Correctness
    ↓
Security
    ↓
Maintainability
    ↓
Performance
    ↓
UX
```

Đặc biệt, phần xử lý **Kanji → Hiragana/Furigana và phân tách từ tiếng Nhật** phải được thiết kế dựa trên dictionary/tokenization thực tế, không sử dụng giải pháp thay thế đơn giản chỉ dựa trên whitespace hoặc mapping từng Kanji.
