# BÁO CÁO KIỂM TOÁN & HOÀN THIỆN HỆ THỐNG QUẢN LÝ AI API KEY (ZERO CLIENT EXPOSURE)

**Dự án:** AI Tutor (`d:\UET Master`)  
**Ngày kiểm toán:** 22/11/2026  
**Stack phát hiện:** Vanilla HTML/CSS/ES6 SPA (`index.html`, `style.css`, `app.js`, `converter.js`, `ai-providers-config.js`, build tĩnh ra `dist/` qua `scripts/build-static.js`, không framework/zero runtime dependencies) + **Vercel Node.js Serverless Functions** (`/api/index.js`, `/api/ai/proxy.js`, `/api/admin/system-keys.js`, `/api/admin/me.js`), xác thực bằng **Google Sign-In RS256 ID Token** (xác minh JWKS trên server), lưu trữ bền vững tùy chọn **Vercel KV / Upstash Redis REST** hoặc **Supabase Postgres + Strict RLS** (fallback JSON cục bộ cho dev/test).  
**Giả định áp dụng:** Tiếp tục dùng kiến trúc Vercel Serverless sẵn có của dự án và hỗ trợ cả 2 backend lưu trữ bền vững (Upstash Redis/Vercel KV và Supabase Service Role) để bạn bật ngay loại DB có sẵn mà không cần viết lại code.

---

## 1. Kết luận tổng quan (Verdict), Điểm đánh giá & Top 5 rủi ro còn lại

**Verdict:** **CONDITIONAL GO** — Đạt chuẩn an toàn để nạp API Key thật **SAU KHI** hoàn tất các điều kiện bắt buộc tại Mục 7 (cấu hình `ENCRYPTION_SECRET` 64 ký tự hex và bật lưu trữ bền vững Upstash Redis/Vercel KV hoặc Supabase + RLS trên Vercel Dashboard).

| Hạng mục | Điểm | Nhận xét ngắn |
|---|---:|---|
| **Security (Bảo mật)** | **9.0 / 10** | Zero client exposure, AES-256-GCM + HKDF-SHA256, IV 12B ngẫu nhiên, key rotation, RS256 JWKS trên mọi endpoint AI & Admin Key, chặn SSRF/header injection, chặn spoof `X-Forwarded-For`, 0 secret trong Git history/dist/logs. Trừ 1 điểm vì các route billing cũ không liên quan AI trong `api/index.js` vẫn còn fallback `X-User-Email` để tương thích ngược. |
| **Logic & Failover** | **9.0 / 10** | Dual-path nghiêm ngặt (Personal key gọi trực tiếp, không tự fallback sang System Pool), dedup ENV+DB, cooldown 429 + tự hồi phục, 401/403 -> Invalid, Vision failover an toàn năng lực, SSE streaming không buffer (`X-Accel-Buffering: no`) + client abort + retry 5xx. Trừ 1 điểm vì thao tác ghi mảng key trong KV/Supabase theo dạng read-merge-write có thể gặp race condition nhẹ ở tải cực cao. |
| **Completeness (Độ đầy đủ)** | **9.5 / 10** | Đáp ứng đầy đủ 1A, 1B, 1C, có `SETUP.md`, `.env.example`, `.gitignore`, `firestore.rules`, `supabase/migrations/001_system_ai_keys_rls.sql`, cập nhật toàn bộ model theo tài liệu chính thức tháng 11/2026 và giữ 100% i18n VI/EN/JA. |
| **UX & UI** | **9.5 / 10** | Sửa triệt để hộp cảnh báo vàng (căn trái, bỏ justify, 1 đoạn văn tự nhiên), textarea `rows="5"` + `padding: 10px 12px`, tách rõ Mục A (Cá nhân cục bộ) và Mục B (Hệ thống dùng chung chỉ hiện khi `/api/admin/me` xác thực), badge cập nhật tức thì không cần reload, xác nhận gõ `XOA` khi xóa toàn bộ. |

### Top 5 rủi ro còn lại cần lưu ý
1. **Lưu trữ tạm thời (Ephemeral `/tmp`) nếu chưa cấu hình KV/Supabase trên Vercel:** Nếu deploy mà bỏ trống cả `KV_REST_API_URL` lẫn `SUPABASE_URL`, khóa nạp qua Admin Panel và bộ đếm rate-limit/cooldown sẽ mất khi serverless cold start.
2. **Auth trên các route billing cũ (ngoài phạm vi AI Key):** Các endpoint cũ trong `api/index.js` (`/api/admin/users`, `/api/admin/subscriptions`, `/api/admin/payment-requests`, `/api/admin/vouchers`) vẫn dùng `isCallerAdmin(req)` đọc `X-User-Email` (riêng toàn bộ route AI Key gồm `/api/ai/proxy`, `/api/admin/me`, `/api/admin/system-keys*`, `/api/admin/user-apis*` đã khóa chặt bằng `verifyAdminRequest` RS256).
3. **Chưa kiểm thử thực địa với Live Provider & Live DB:** Toàn bộ test tự động đã chạy với mock `fetch`, mock JWKS verifier và local `/tmp` store — Upstash KV REST, Supabase REST + RLS live và Google JWKS thực tế đang ở trạng thái **UNVERIFIED (chưa có thông tin kết nối live trong môi trường test cục bộ)**.
4. **Hạn chế của `localStorage` cho Key cá nhân (Mục A):** Key cá nhân lưu trên trình duyệt người dùng theo thiết kế BYOK; bất kỳ XSS nào trên cùng origin đều có thể đọc `localStorage` (đã phòng vệ bằng `esc()` và lọc thẻ HTML trong label, nên tránh thêm thư viện thứ ba không tin cậy).
5. **Thay đổi vòng đời model `:free` của OpenRouter/Groq/Gemini:** Các hãng thường xuyên xoay vòng/ngừng model free mà báo trước ngắn; dù đã ưu tiên `openrouter/free` và tách cấu hình tập trung vào `ai-providers-config.js`, cần định kỳ bấm **Test All Keys** để kiểm tra.

---

## 2. Cây thư mục & Danh sách file tạo mới / chỉnh sửa

```text
d:\UET Master\
├── AUDIT_REPORT.md                             (MỚI - Báo cáo kiểm toán toàn diện)
├── SETUP.md                                    (MỚI - Hướng dẫn cài đặt từng bước cho người mới)
├── ai-providers-config.js                      (MỚI/CẬP NHẬT - Config tập trung 5 hãng AI, model 11/2026, failover map, Pro Tip, Banner)
├── .env.example                                (SỬA - Khai báo toàn bộ biến server-only)
├── .gitignore                                  (SỬA - Chặn .env*, *.log, data/system-keys-store.json)
├── vercel.json                                 (SỬA - Thêm maxDuration 60s/30s/15s cho các functions)
├── firestore.rules                             (MỚI - Khóa allow read, write: if false toàn bộ collection nhạy cảm)
├── supabase/
│   └── migrations/
│       └── 001_system_ai_keys_rls.sql          (MỚI - Bảng encrypted keys, env_state, audit_logs, rate_limits + FORCE RLS)
├── scripts/
│   └── build-static.js                         (SỬA - Đóng gói ai-providers-config.js vào dist/)
├── api/
│   ├── index.js                                (SỬA - Điều hướng /api/ai/proxy, /api/admin/me, /api/admin/system-keys*, khóa RS256 cho /api/admin/user-apis)
│   ├── ai/
│   │   └── proxy.js                            (MỚI - Serverless endpoint /api/ai/proxy)
│   ├── admin/
│   │   ├── me.js                               (MỚI - Serverless endpoint /api/admin/me xác thực admin phía server)
│   │   └── system-keys.js                      (MỚI - Serverless endpoint /api/admin/system-keys*)
│   └── lib/
│       ├── auth.js                             (MỚI - Xác minh RS256 Google ID Token qua JWKS + ADMIN_EMAILS/ADMIN_UIDS)
│       ├── crypto.js                           (MỚI/NÂNG CẤP - AES-256-GCM + HKDF-SHA256, IV 12B, key rotation, HMAC, mask, sanitize)
│       ├── http-utils.js                       (MỚI/NÂNG CẤP - CORS ALLOWED_ORIGINS, Expose-Headers, body 4MB, chống spoof IP)
│       ├── storage.js                          (MỚI/NÂNG CẤP - Driver KV/Supabase/File + clearAllStoredKeys + Supabase cooldown/envState)
│       ├── key-parser.js                       (MỚI/NÂNG CẤP - Smart parser 2 bước, sk-or- trước sk-, lọc XSS & MSSV, bỏ qua "Chưa tạo")
│       ├── ai-proxy.js                         (MỚI/NÂNG CẤP - Dual rate-limit UID+IP, dedup ENV+DB, SSRF guard, Vision failover, SSE + abort + 5xx retry)
│       └── admin-keys.js                       (MỚI/NÂNG CẤP - /api/admin/me, preview/import, test-all 20s cooldown, delete-all XOA, audit log)
├── index.html                                  (SỬA - Nạp ai-providers-config.js, link /api-guide, cache-bust ?v=20261122d)
├── style.css                                   (SỬA - .free-api-callout căn trái bỏ justify, .multi-key-textarea py-2.5, Section A/B, modal XOA)
├── converter.js                                (SỬA - Badge 2 trạng thái, Callout fix, Mục A/B tách biệt theo /api/admin/me, nén ảnh 1600px/0.82, Guide & Banner)
└── app.js                                      (SỬA - Route /api-guide & /admin/system-keys, xóa toàn bộ Key Hệ thống XOA, model select động, dọn key thô khỏi localStorage, i18n VI/EN/JA)
```

---

## 3. Bảng các phát hiện kiểm toán (Findings Table)

| ID | Mức độ | File:dòng | Vấn đề phát hiện | Cách khắc phục đã áp dụng | Trạng thái |
|---|---|---|---|---|---|
| **F-01** | **HIGH** | `api/lib/crypto.js:47-53` | Dẫn xuất khóa AES/HMAC dùng plain SHA-256 thay vì KDF chuẩn (HKDF/scrypt). | Nâng cấp sang `crypto.hkdfSync("sha256", ...)` với salt & info riêng cho AES-256-GCM và HMAC-SHA256, lưu `kdf: "hkdf-sha256"`, giữ fallback giải mã bản ghi legacy. | **FIXED** |
| **F-02** | **HIGH** | `api/lib/http-utils.js:127-132`, `api/lib/ai-proxy.js:393-403` | `getClientIp()` tin phần tử đầu `x-forwarded-for` (client giả mạo được) và gộp chung 1 bucket `uid:ipHash` → attacker đổi `X-Forwarded-For` vượt qua giới hạn 20 req/giờ. | Ưu tiên header edge tin cậy (`x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`, `socket.remoteAddress`) và áp dụng **2 bucket độc lập**: giới hạn theo `uid` (20/giờ) **VÀ** theo `ip` (40/giờ). | **FIXED** |
| **F-03** | **HIGH** | `api/admin/me.js`, `api/lib/admin-keys.js`, `converter.js` | Thiếu endpoint `/api/admin/me` để xác thực admin phía server cho Mục B trong trang Cài đặt API và thiếu route xóa toàn bộ key (`DELETE /api/admin/system-keys`). | Tạo `api/admin/me.js` + `handleAdminMe()`, thêm `DELETE /api/admin/system-keys` & `POST /delete-all` bắt buộc `{ confirm: "XOA" }` + ghi Audit Log; Mục B trong `converter.js` chỉ render khi `/api/admin/me` trả `isAdmin: true`. | **FIXED** |
| **F-04** | **HIGH** | `ai-providers-config.js`, `app.js:2782-2812`, `converter.js:64-68` | Chứa các model đã bị đóng/ngừng hoạt động tính đến 11/2026: `gemini-2.0-flash` (đóng 1/6/2026), `meta-llama/llama-4-scout-17b-16e-instruct` (đóng 17/7/2026), `llama-3.3-70b-versatile` (đóng 16/8/2026), `google/gemini-2.0-flash-exp:free` (404). | Cập nhật toàn bộ danh sách model & `FALLBACK_MODEL_MAP` theo tài liệu chính thức 11/2026 (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-2.5-flash-lite`, `qwen/qwen3.6-27b`, `openai/gpt-oss-120b`, `openrouter/free`, `gpt-4.1-mini`, `deepseek-chat`/`deepseek-reasoner`); sinh động dropdown ở `app.js` từ config chung. | **FIXED** |
| **F-05** | **HIGH** | `api/index.js:1050-1084` | Route gán API theo email cũ `/api/admin/user-apis` dùng `isCallerAdmin(req)` chấp nhận header `X-User-Email` chưa ký. | Bắt buộc `await verifyAdminRequest(req)` (xác minh RS256 Google ID Token) cho cả `POST /api/admin/user-apis` và `DELETE /api/admin/user-apis/:email`. | **FIXED** |
| **F-06** | **HIGH** | `converter.js:338-478`, `style.css` | Hộp cảnh báo `"⚠️ Lưu ý khi dùng API Free / Flash:"` bị thiếu, textarea chưa đặt `rows="5"` & `padding` dọc đủ rộng, thiếu tách biệt Mục A (Cục bộ) / Mục B (Hệ thống) và nhãn badge/nút chưa khớp đặc tả 1B. | Khôi phục `.free-api-callout` căn trái hoàn toàn (không `justify`, 1 đoạn `<p>` liền mạch), đặt `.multi-key-textarea` `rows="5"` + `padding: 10px 12px`, chuẩn hóa chính xác nhãn Mục A, Mục B, badge 2 trạng thái và modal xác nhận gõ `XOA`. | **FIXED** |
| **F-07** | **MEDIUM** | `api/lib/ai-proxy.js:70-109, 323-547` | Chưa dedup key trùng giữa ENV và DB; chưa nối `AbortController` với client disconnect (`req.on("close")`); chưa chặn SSRF fields (`upstreamUrl`/`headers`); chưa kiểm tra dung lượng từng ảnh inline; chưa re-read state mới trước khi ghi mutation; chưa đặt `X-Accel-Buffering: no` cho SSE. | Bổ sung dedup theo `keyHash`, từ chối `400` nếu body có `upstreamUrl`/`baseUrl`/`endpoint`/`headers`, giới hạn kích thước ảnh đơn (`413`), nối `AbortController` + timeout 52s + 1 lần retry backoff 400ms cho 502/503/504, thêm `X-Accel-Buffering: no`, đọc lại snapshot mới trước khi ghi delta. | **FIXED** |
| **F-08** | **MEDIUM** | `api/lib/key-parser.js:30-44, 123, 200`, `app.js:2846` | Chưa lọc thẻ HTML trong `accountLabel`; regex rỗng bỏ sót `"Chưa tạo"`; `summaryByAccount` trả object trong khi `app.js` gọi `.map()` (lỗi runtime khi preview ở Admin Panel). | Lọc `<...>` & MSSV trong `extractShortAccountLabel`, thêm `"chưa tạo"` vào danh sách rỗng, chuẩn hóa `summaryByAccount` dạng mảng `[{ accountLabel, count }]` ở cả `key-parser.js`, `app.js` và `converter.js`. | **FIXED** |
| **F-09** | **MEDIUM** | `api/lib/storage.js:212-231, 354-376`, `001_system_ai_keys_rls.sql` | Khi dùng driver `supabase`, `getEnvKeyStates`/`saveEnvKeyStates` và `checkAdminActionCooldown` rơi về file tạm `/tmp`. | Bổ sung bảng `system_ai_env_state` (kèm `FORCE RLS` & `REVOKE ALL`) và hoàn thiện nhánh Supabase cho cả `envState` lẫn `checkAdminActionCooldown`. | **FIXED** |
| **F-10** | **MEDIUM** | `api/index.js:485-499, 935-1045` | Các endpoint billing cũ (không thuộc hệ thống AI Key: `/api/admin/users`, `/api/admin/subscriptions`, `/api/admin/vouchers`, `/api/admin/payment-requests`) vẫn xác thực bằng `X-User-Email` để tương thích luồng billing cũ. | Ghi nhận để nâng cấp sang `verifyAdminRequest` ở đợt bảo trì billing tiếp theo (giữ nguyên để không phá vỡ luồng billing hiện có). | **NOT FIXED (Legacy ngoài phạm vi AI Key)** |
| **F-11** | **LOW** | `converter.js:2614` | Biểu tượng đầu Disclaimer Banner dùng `ℹ️` thay vì `💡` và chưa có link inline ngay sau câu thông báo. | Cập nhật icon `💡` và link inline `[Xem hướng dẫn lấy API Key miễn phí →]` đúng nguyên văn mục 1C. | **FIXED** |

---

## 4. Bảng kiểm tra chi tiết Đặc tả Mục 1 (1A, 1B, 1C)

### 1A. Bảo mật, Pool, Rotation, Failover & Admin Panel
- [x] **DONE:** System Default keys tuyệt đối không gửi xuống trình duyệt (không `NEXT_PUBLIC_`, không đọc DB từ client, không lộ trong API response/`localStorage`/`dist/`). Mọi gọi mặc định đi qua `/api/ai/proxy`.
- [x] **DONE:** Lockdown DB hoàn toàn: [supabase/migrations/001_system_ai_keys_rls.sql](file:///d:/UET%20Master/supabase/migrations/001_system_ai_keys_rls.sql) (`FORCE ROW LEVEL SECURITY`, `RESTRICTIVE FALSE`, `REVOKE ALL`) và [firestore.rules](file:///d:/UET%20Master/firestore.rules) (`allow read, write: if false`).
- [x] **DONE:** Mã hóa AES-256-GCM với `ENCRYPTION_SECRET` dẫn xuất bằng **HKDF-SHA256**, IV ngẫu nhiên 12 bytes, `authTag`, `keyVersion`, rotation (`ENCRYPTION_SECRET_PREVIOUS`) và `HMAC-SHA256` chống trùng.
- [x] **DONE:** UI chỉ nhận `id` + `maskedKey` (`AIzaSy••••••9xQ2`); không response/error/log nào chứa full key.
- [x] **DONE:** `.env.example` & `.gitignore` bảo vệ `.env*` trừ `.env.example`; quét toàn bộ Git history + workspace = **0 key thật**.
- [x] **DONE:** Gemini gửi qua header `x-goog-api-key` (không `?key=` trên URL); lọc sanitize lỗi từ provider; 0 `console.log` chứa key trên server.
- [x] **DONE:** Ưu tiên (1) Key cá nhân gọi trực tiếp, lỗi 401/429 báo rõ ràng, **không** âm thầm fallback về System Pool; (2) Không có key cá nhân → `/api/ai/proxy` (gộp ENV + DB có dedup).
- [x] **DONE:** 429 → `cooldown` (mặc định 60s, cấu hình được); 401/403 → `Invalid`; hết provider → fallback sang hãng miễn phí tương đương (`gemini → groq → openrouter`), bảo vệ capability Vision; trả header `X-AI-Fallback-Provider`, `X-AI-Fallback-Model`, `Access-Control-Expose-Headers` + toast.
- [x] **DONE:** Proxy xác minh RS256 Google ID Token, rate-limit kép `20 req/giờ` (UID + IP chống spoof XFF, chỉ áp dụng System Pool), model allowlist, `max_tokens` cap, giới hạn body 4MB & ảnh, CORS `ALLOWED_ORIGINS`, chặn SSRF/custom headers, SSE streaming `X-Accel-Buffering: no`, client abort, `maxDuration` 60s.
- [x] **DONE:** Admin Panel `/admin/system-keys`: xác thực server RS256, Importer 2 bước (`preview` → `Xác nhận`), `sk-or-` trước `sk-`, loại MSSV & XSS, xóa textarea sau import, bảng masked key + Enable/Disable + Delete + `Test All Keys` (rate-limit 20s) + `Remove All Invalid Keys` + `Xóa toàn bộ Key Hệ thống` (`XOA`) + Audit Log.

### 1B. Giao diện Cài đặt API & Tách biệt Cá nhân / Hệ thống
- [x] **DONE:** Callout `"⚠️ Lưu ý khi dùng API Free / Flash:"` giữ nguyên nội dung, căn trái (`text-align: left`, 0 `justify`), icon `⚠️` bên trái (`flex-shrink: 0; margin-top: 2px`), 1 đoạn `<p>` chảy tự nhiên với 3 cụm in đậm inline, font `Plus Jakarta Sans`.
- [x] **DONE:** Textarea multi-key có `rows="5"` và `padding: 10px 12px` (`min-height: 128px`), không bị cắt placeholder.
- [x] **DONE:** Mục A hiển thị cho mọi người với đúng nhãn **"Cài đặt API Key Cá nhân (Chỉ lưu cục bộ trên trình duyệt này)"** và 3 nút **"Lưu Key cá nhân (Cục bộ)"** (chỉ ghi `localStorage`), **"Kiểm tra kết nối (Test API)"** (xử lý CORS rõ ràng), **"Xóa Key cá nhân"** (có xác nhận, xóa `localStorage` & quay về System Pool), kèm Export/Import JSON có cảnh báo plain text.
- [x] **DONE:** Mục B chỉ hiển thị sau khi `GET /api/admin/me` xác thực Admin trên server; người thường và lúc đang tải không render bất kỳ HTML/gợi ý nào. Đúng nhãn **"Kho API Key Hệ thống (Lưu lên Server — Dùng chung cho toàn bộ người dùng)"**, nút **"Lưu vào Kho Hệ thống (Dùng chung)"** (qua preview → "Xác nhận"), nút **"Xóa toàn bộ Key Hệ thống"** (bắt buộc nhập `XOA` và báo số lượng key), nút **Xóa** từng key.
- [x] **DONE:** Status badge đầu thẻ cập nhật tức thì không cần reload: xanh **`Đang dùng: API Key cá nhân (Cục bộ)`** / xanh dương **`Đang dùng: API Key Hệ thống mặc định (Dùng chung)`**; đồng bộ với Disclaimer Banner.

### 1C. Giao diện người dùng khác
- [x] **DONE:** Disclaimer Banner đóng được, chỉ hiện khi chưa có key cá nhân, tự ẩn ngay khi lưu key, đúng nguyên văn tiếng Việt mở đầu bằng `💡` + link `[Xem hướng dẫn lấy API Key miễn phí →]`.
- [x] **DONE:** Chọn hãng AI tường minh theo tab cho key cá nhân (OpenAI và DeepSeek tách riêng, tránh nhầm `sk-`).
- [x] **DONE:** Trang `/api-guide` "Hướng dẫn lấy API Key" đầy đủ 5 hãng, hộp **"Mẹo hay (Pro Tip)"**, nút CTA **"Đã có Key? Nhập ngay tại Cài đặt API"**, toàn bộ danh sách model đọc từ 1 file duy nhất `ai-providers-config.js`, thân thiện di động.

---

## 5. Kết quả kiểm thử tự động & Quét rò rỉ (Step 8 & Step 9)

### Các lệnh đã chạy và kết quả thực tế
1. **Quét Git history & Workspace tìm key thật:**
   - Lệnh: Node script quét toàn bộ `git log --all -p` và mọi file trên ổ đĩa với regex `AIza...`, `gsk_...`, `sk-or-v1-...`, `sk-proj-...`, `sk-...`.
   - Kết quả: **`REAL_KEY_SCAN_HITS=0`** (0 key bị lộ trong toàn bộ lịch sử Git và thư mục dự án).
2. **Suite kiểm thử bảo mật, logic, failover, UI & leak (`test_enterprise_keys.js`):**
   - Lệnh: `node "C:\Users\LOQ\.gemini\antigravity\brain\0f5afe49-0d91-4767-a18c-40373cdfa98f\scratch\test_enterprise_keys.js"`
   - Kết quả: **Exit code `0` — 6/6 suites PASS (0 thất bại):**
     - `PASS 1`: Crypto (HKDF-SHA256 AES-256-GCM, IV 12B ngẫu nhiên, reject tampered ciphertext/authTag, rotation v1→v2, HMAC, sanitize).
     - `PASS 2`: Smart Importer (CRLF, bỏ trống/`Chưa tạo`, `sk-or-` trước `sk-`, OpenAI vs DeepSeek, mismatch, trùng batch & DB, lọc XSS/MSSV, stress test 40 tài khoản).
     - `PASS 3`: 11 Admin routes × 3 kịch bản tấn công (thiếu token kèm giả mạo `X-User-Email` → 401/403, token hết hạn → 401/403, user thường → 403), `/api/admin/me` 200 cho admin, response chỉ có masked key, dedup ENV+DB.
     - `PASS 4`: Proxy security (401, SSRF `upstreamUrl`/`headers` → 400, unlisted model → 400, ảnh >3.2MB → 413), clamp `max_tokens` về 2048, `x-goog-api-key` header (0 `?key=`), 429 cooldown + tự phục hồi sau khi hết cooldown, 401 → Invalid, Vision failover sang `groq/qwen/qwen3.6-27b` + headers, SSE stream `X-Accel-Buffering: no`, pool exhausted → 503 tiếng Việt, 21st request với `X-Forwarded-For` giả mạo vẫn bị chặn `429`, `DELETE /api/admin/system-keys` không có `XOA` → 400 và có `XOA` → 200 + Audit Log, Vision chỉ có DeepSeek → 503 lỗi Vision rõ ràng.
     - `PASS 5`: Kiểm tra code-level UI/UX (callout không `justify`, textarea `rows="5"` + `padding: 10px 12px`, Section B chỉ hiện sau `/api/admin/me`, đúng 10 nhãn tiếng Việt bắt buộc, nút lưu cá nhân 0 `fetch()`, xác nhận gõ `XOA`, 0 model deprecated).
     - `PASS 6`: `node --check` trên 18/18 file JS, `node scripts/build-static.js` xuất `dist/ (8 files)`, leak check trên toàn bộ file client + `dist/` + captured server logs = **0 hit**, và chạy `verify_100_i18n.js` pass 100% (1074 static keys, 186 patterns, 186 HTML strings VI/EN/JA).
3. **Các hạng mục chưa thể test tự động cục bộ (`UNVERIFIED`):**
   - `UNVERIFIED (chưa có biến môi trường cloud live)`: Kết nối thực tế tới Upstash Redis REST, Supabase Postgres REST + RLS thực thi trên Supabase server, và xác minh chữ ký RS256 với Google JWKS trực tuyến.
   - `UNVERIFIED (không có trình duyệt headless chạy live Google OAuth)`: Kiểm thử hiển thị thực tế trên Chrome Android và chụp màn hình Network tab sau khi nạp key thật (xem Mục 8).

---

## 6. Bảng Model AI chính thức (Cập nhật tháng 11/2026) & Khuyến nghị

*(Đã xác minh qua tìm kiếm tài liệu chính thức của Google AI Studio, Groq, OpenRouter, OpenAI và DeepSeek tại thời điểm 11/2026.)*

| Provider | Default Chat | Vision (Đọc ảnh) | Reasoning / Toán | Free hay Paid | Giới hạn chính / Giá tham khảo | Dùng tốt nhất cho |
|---|---|---|---|---|---|---|
| **Google AI Studio (Gemini)** | `gemini-3.8-flash` / `gemini-3.5-flash-lite` | `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-2.5-flash-lite` | `gemini-4-argon` (Paid) | Có Free Tier (Flash/Lite); Flagship Paid | Tính theo Project (RPM / TPM / RPD, reset 0h PT); Context **1M+ token**; `gemini-2.0-flash` đã đóng 1/6/2026, `gemini-2.5-flash` ngừng 1/12/2026 (auto-route về `gemini-3.5-flash-lite`). | PDF scan, tài liệu dài, tiếng Việt chuẩn, OCR công thức Toán/Lý/Hóa. |
| **Groq Cloud** | `openai/gpt-oss-20b` / `qwen/qwen3.6-27b` | `qwen/qwen3.6-27b` | `openai/gpt-oss-120b` | Free Tier bền vững (không cần thẻ Visa) | ~30 RPM, ~1.000 RPD, ~8.000 TPM / ~200K TPD cho model lớn; `llama-4-scout` (đóng 17/7/2026) & `llama-3.3-70b-versatile` (đóng 16/8/2026) đã ngừng trên Free Tier. | Phản hồi siêu nhanh (LPU), OCR ảnh miễn phí bằng Qwen 3.6 27B, giải thích nhanh. |
| **OpenRouter** | `openrouter/free` | `openrouter/free`, `qwen/qwen2.5-vl-72b-instruct:free` | `openrouter/free` / `deepseek/deepseek-chat` (Paid) | Có `:free` & Paid | Free mặc định: **20 RPM / 50 RPD** (nạp 1 lần ≥ $10 tăng lên **1.000 RPD**). Các slug `:free` cũ như `google/gemini-2.0-flash-exp:free` đã bị gỡ (404) → luôn ưu tiên `openrouter/free`. | Lớp dự phòng miễn phí tự xoay vòng (`openrouter/free`) không sợ 404. |
| **OpenAI** | `gpt-4.1-mini` / `gpt-4o-mini` | `gpt-4.1-mini`, `gpt-4o-mini`, `gpt-4o`, `gpt-5-mini` | `gpt-5-mini` | Trả phí (nạp tối thiểu $5) | `gpt-4o-mini` ~$0.15/$0.60 per 1M; `gpt-4.1-mini` ~$0.40/$1.60 per 1M (context 1M); `gpt-4o` ~$2.50/$10 per 1M. | Tuân thủ JSON schema chặt chẽ, Vision ổn định cho key cá nhân trả phí. |
| **DeepSeek** | `deepseek-chat` (V3.x) | Không hỗ trợ Vision | `deepseek-reasoner` (R1) | Trả phí giá rất rẻ | `deepseek-chat` ~$0.25/$0.85 per 1M; `deepseek-reasoner` ~$0.66–$0.90/$1.32–$1.50 per 1M; Context 128K. | Giải toán/lý/hóa văn bản sâu với chi phí cực thấp. |

### Thứ tự Fallback khuyến nghị & Chọn model theo tác vụ
- **Thứ tự Fallback cho Text:** `gemini-3.8-flash` → `gemini-3.5-flash-lite` → `gemini-2.5-flash-lite` → `groq:qwen/qwen3.6-27b` → `groq:openai/gpt-oss-120b` → `groq:openai/gpt-oss-20b` → `openrouter:openrouter/free`.
- **Thứ tự Fallback cho Vision (Đọc ảnh):** `gemini-3.8-flash` → `gemini-3.5-flash-lite` → `gemini-2.5-flash-lite` → `groq:qwen/qwen3.6-27b` → `openrouter:openrouter/free` → `openrouter:qwen/qwen2.5-vl-72b-instruct:free`. *(Tuyệt đối không định tuyến sang `openai/gpt-oss-*` hay `deepseek-*`.)*
- **Thứ tự Fallback cho PDF nguyên bản (Native PDF):** Chỉ các model Gemini (`gemini-3.8-flash` → `gemini-3.5-flash-lite` → `gemini-2.5-flash-lite`).
- **Chọn model tối ưu theo từng tác vụ:**
  - *Chat / Chuẩn hóa đề nhanh:* `groq:openai/gpt-oss-20b` hoặc `gemini-3.5-flash-lite`.
  - *Viết tiếng Việt tự nhiên / Giải thích học thuật:* `gemini-3.8-flash` hoặc `gemini-3.5-flash-lite`.
  - *Tài liệu dài / Nhiều trang PDF:* `gemini-3.8-flash` / `gemini-3.5-flash-lite` (1M+ context) hoặc `openai:gpt-4.1-mini` (1M context).
  - *Đọc ảnh đề thi (Vision OCR):* `gemini-3.8-flash` (ưu tiên 1), `groq:qwen/qwen3.6-27b` (dự phòng miễn phí tốc độ cao), `openrouter:openrouter/free`.
  - *Giải Toán / Lý / Hóa chuyên sâu (văn bản):* `deepseek:deepseek-reasoner`, `groq:openai/gpt-oss-120b`, `openai:gpt-5-mini`.
- **Các model KHÔNG đưa vào System Free Pool:**
  - Mọi model trả phí bắt buộc (`gemini-4-argon`, `gemini-4-carbon`, `openai:gpt-4o`, `openai:gpt-5-mini`, `deepseek:*`).
  - Mọi model đã ngừng/gần đóng (`gemini-2.0-flash`, `meta-llama/llama-4-scout-17b-16e-instruct`, `llama-3.3-70b-versatile`, `google/gemini-2.0-flash-exp:free`).

---

## 7. Hạng mục bạn cần tự thực hiện ("Needs my action")

1. **Bí mật cần thu hồi (Revoke):** **Không phát hiện bất kỳ API Key thật nào bị rò rỉ** trong mã nguồn, build `dist/` hay toàn bộ lịch sử Git (0 hits). Không cần hủy key cũ nào.
2. **Thiết lập Environment Variables trên Vercel Dashboard** (`Vercel Dashboard → Project ai-tutor → Settings → Environment Variables`, phạm vi Production & Preview):
   - Tạo `ENCRYPTION_SECRET` bằng lệnh: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` → dán giá trị 64 ký tự hex.
   - Đặt `ENCRYPTION_KEY_VERSION=v1`, `GOOGLE_CLIENT_ID=480927164540-o3o4h9v5vmi8h93605ridg4eqvtf5rcf.apps.googleusercontent.com`, `ADMIN_EMAILS=phamduchieurobotics@gmail.com`, `ALLOWED_ORIGINS=https://ai-tutor.phamduchieu.site,https://ai-tutor-two-zeta.vercel.app,http://localhost:5000`.
   - Cấu hình **1 trong 2** lưu trữ bền vững:
     - **Upstash Redis / Vercel KV:** `KV_REST_API_URL` + `KV_REST_API_TOKEN` (hoặc `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).
     - **Supabase:** Chạy file `supabase/migrations/001_system_ai_keys_rls.sql` trong Supabase SQL Editor, rồi thêm `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
3. **Deploy Database Rules (nếu dùng Firebase Firestore):** Copy `firestore.rules` vào Firebase Console → Firestore Database → Rules → Publish.
4. **Kiểm tra gói Vercel & Region:** `vercel.json` đã cấu hình `maxDuration: 60` cho `api/index.js` và `api/ai/proxy.js` (lưu ý gói Vercel Hobby hỗ trợ tối đa 60s khi bật Fluid Compute hoặc giới hạn 10s–60s tùy thiết lập project; nên chọn Function Region gần người dùng Việt Nam như `sin1` — Singapore trong Vercel Project Settings → Functions).
5. **Redeploy Vercel** sau khi đã thêm đủ biến môi trường ở mục 2.

---

## 8. Kế hoạch kiểm thử thủ công trên trình duyệt (Manual Browser Test Plan)

Thực hiện lần lượt sau khi Vercel Redeploy xong:
1. **Kiểm tra View Source & DevTools Application:** Mở trang ẩn danh `https://ai-tutor.phamduchieu.site`, nhấn `Ctrl+U` và mở `DevTools → Application → Local Storage` → xác nhận không tồn tại chuỗi `AIza`, `gsk_`, `sk-or-` hay `DEFAULT_*_KEYS`.
2. **Kiểm tra gọi trực tiếp không có token:** Trong Console trình duyệt ẩn danh, chạy:
   - `fetch('/api/ai/proxy', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({model:'gemini-3.5-flash-lite'})}).then(r=>r.status)` → Phải trả **`401`**.
   - `fetch('/api/admin/me').then(r=>r.status)` → Phải trả **`401`**.
3. **Kiểm tra tài khoản người dùng thường:** Đăng nhập bằng một tài khoản Google **không phải** `phamduchieurobotics@gmail.com`:
   - Mở **Cài đặt API (`/api-settings`)**: xác nhận **Mục B ("Kho API Key Hệ thống") hoàn toàn KHÔNG tồn tại trong DOM**, status badge hiện **`Đang dùng: API Key Hệ thống mặc định (Dùng chung)`**.
   - Gọi thử `fetch('/api/admin/system-keys', {headers:{Authorization:'Bearer ' + JSON.parse(localStorage.uet_master_auth).credential}}).then(r=>r.status)` → Phải trả **`403`**.
   - Nếu dùng Supabase, thử gọi `GET <SUPABASE_URL>/rest/v1/system_ai_keys` bằng `anon` key → Phải bị từ chối / trả rỗng.
4. **Kiểm tra giao diện trên điện thoại (Chrome Android):** Mở `/api-settings`, kiểm tra hộp vàng **"⚠️ Lưu ý khi dùng API Free / Flash:"** căn trái đều chữ (không kéo giãn khoảng trắng), ô textarea multi-key hiển thị đầy đủ placeholder không bị cắt phía trên; nhập 1 key giả/thật bấm **"Lưu Key cá nhân (Cục bộ)"** → badge lập tức đổi sang xanh **`Đang dùng: API Key cá nhân (Cục bộ)`** và banner ở `/converter` tự ẩn; bấm **"Xóa Key cá nhân"** → xác nhận → badge lập tức đổi lại sang System Pool và banner hiện lại.
5. **Kiểm tra tài khoản Admin & hậu kiểm Network sau khi nạp Key thật:**
   - Đăng nhập bằng `phamduchieurobotics@gmail.com` → mở `/api-settings` (Mục B xuất hiện) và `/admin/system-keys` (trạng thái `AES-256-GCM Đã bật` và driver `Bền vững`).
   - Nạp key thật qua 2 bước Preview → Xác nhận → kiểm tra textarea tự xóa trắng và bảng chỉ hiển thị key đã ẩn (`prefix••••••suffix`).
   - Đăng xuất, đăng nhập lại bằng **tài khoản người dùng thường** (chưa nhập key cá nhân), mở `DevTools → Network`, chạy 1 lệnh đọc ảnh/giải đề trên `AI Converter`: xác nhận request đi tới `/api/ai/proxy` (không gọi trực tiếp Google/Groq), phản hồi trả kết quả hợp lệ và **không có bất kỳ key thật nào xuất hiện trong Request/Response Headers, Payload hay Local Storage**.

---

## 9. Quyết định Go / No-Go để nạp API Key thật

**Quyết định:** **GO CÓ ĐIỀU KIỆN (Conditional GO)**

- **Lý do đạt chuẩn:** Kiến trúc Zero Client Exposure đã được kiểm chứng toàn diện qua 6 bộ test tự động (0 thất bại, 0 lỗ hổng lộ secret trong Git history / `dist/` / logs / response), mã hóa HKDF + AES-256-GCM hoàn chỉnh, mọi endpoint AI & Admin Key đều xác thực RS256 Google ID Token, chống bypass rate-limit `X-Forwarded-For`, chống SSRF, model đã cập nhật đúng thực tế tháng 11/2026 và UI/UX đáp ứng đủ Mục 1B & 1C.
- **3 Điều kiện bắt buộc TRƯỚC KHI nạp Key thật:**
  1. Đã thêm `ENCRYPTION_SECRET` (64 hex) trên Vercel Dashboard và Redeploy.
  2. Đã bật **Upstash Redis / Vercel KV** hoặc **Supabase (đã chạy `001_system_ai_keys_rls.sql`)** trên Vercel và xác nhận trang `/admin/system-keys` hiện trạng thái **Bền vững**.
  3. Hoàn tất 5 bước kiểm tra thủ công tại Mục 8 (đặc biệt bước 3 & bước 5 xác minh Network tab sau khi nạp key thật).
