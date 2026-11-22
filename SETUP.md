# Hướng dẫn cài đặt AI Tutor — Hệ thống quản lý AI API Key (Zero Client Exposure)

Tài liệu này hướng dẫn chi tiết từng bước cho người mới để cấu hình và vận hành an toàn hệ thống **System Default Key Pool** trên Vercel Serverless mà **tuyệt đối không để lộ API Key xuống trình duyệt**.

---

## 1. Sinh khóa mã hóa `ENCRYPTION_SECRET` (Bắt buộc)

Mở PowerShell / Terminal ở bất kỳ đâu trên máy tính của bạn và chạy lệnh sau:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- Lệnh sẽ in ra một chuỗi ngẫu nhiên dài **64 ký tự hex (256-bit)**.
- Lưu tạm chuỗi này để dán vào Vercel ở Bước 3. **Tuyệt đối không commit lên Git hay chia sẻ công khai.**

---

## 2. Thiết lập kho lưu trữ bền vững trên Serverless (Khuyên dùng)

Vì Vercel Serverless Functions không giữ file đĩa cục bộ lâu dài giữa các lần cold start, hãy chọn **1 trong 2 phương án miễn phí** bên dưới để lưu Key đã mã hóa AES-256-GCM, trạng thái Cooldown 429, Audit Log và giới hạn 20 lượt/giờ:

### Phương án A — Upstash Redis / Vercel KV (Nhanh & dễ nhất)
1. Truy cập **Vercel Dashboard** → chọn project **ai-tutor** → tab **Storage** → **Create Database** → chọn **Upstash Redis** (hoặc tạo trực tiếp tại https://console.upstash.com).
2. Sau khi tạo, mở tab **REST API** và sao chép 2 biến:
   - `KV_REST_API_URL` (hoặc `UPSTASH_REDIS_REST_URL`)
   - `KV_REST_API_TOKEN` (hoặc `UPSTASH_REDIS_REST_TOKEN`)

### Phương án B — Supabase Postgres + Strict RLS
1. Mở **Supabase Dashboard** → project của bạn → mục **SQL Editor**.
2. Dán toàn bộ nội dung file `supabase/migrations/001_system_ai_keys_rls.sql` và bấm **Run**.
   - Migration này bật `FORCE ROW LEVEL SECURITY`, từ chối 100% quyền đọc/ghi của `anon` và `authenticated`, chỉ cho phép server dùng `service_role`.
3. Vào **Project Settings → API**, lấy:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (**Service Role Secret** — KHÔNG đặt tiền tố `NEXT_PUBLIC_`, KHÔNG đưa ra frontend).

*(Nếu bạn dùng Firebase Firestore cho dữ liệu bổ sung, hãy deploy file `firestore.rules` qua Firebase Console → Firestore Database → Rules để khóa chặt toàn bộ collection `system_ai_*` và `ai_proxy_rate_limits`.)*

---

## 3. Cấu hình Environment Variables trên Vercel Dashboard

1. Mở **Vercel Dashboard** → chọn project **ai-tutor** → **Settings** → **Environment Variables**.
2. Thêm lần lượt các biến sau (chọn phạm vi **Production** và **Preview**):

| Tên biến | Giá trị mẫu / Hướng dẫn | Bắt buộc |
|---|---|---|
| `ENCRYPTION_SECRET` | Chuỗi 64 ký tự hex sinh ở Bước 1 | **Có** |
| `ENCRYPTION_KEY_VERSION` | `v1` | Khuyên dùng |
| `GOOGLE_CLIENT_ID` | `480927164540-o3o4h9v5vmi8h93605ridg4eqvtf5rcf.apps.googleusercontent.com` | **Có** |
| `ADMIN_EMAILS` | `phamduchieurobotics@gmail.com` (có thể thêm nhiều email cách nhau dấu phẩy) | **Có** |
| `ALLOWED_ORIGINS` | `https://ai-tutor.phamduchieu.site,https://ai-tutor-two-zeta.vercel.app,http://localhost:5000` | **Có** |
| `AI_PROXY_RATE_LIMIT_PER_HOUR` | `20` | Tùy chọn |
| `AI_KEY_COOLDOWN_SECONDS` | `60` | Tùy chọn |
| `AI_PROXY_MAX_TOKENS` | `8192` | Tùy chọn |
| `KV_REST_API_URL` & `KV_REST_API_TOKEN` | Từ Bước 2A (nếu dùng Redis/KV) | **Có (A hoặc B)** |
| `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` | Từ Bước 2B (nếu dùng Supabase) | **Có (A hoặc B)** |
| `DEFAULT_GROQ_KEYS` / `DEFAULT_OPENROUTER_KEYS` / `DEFAULT_GEMINI_KEYS` | Key dự phòng dạng danh sách cách nhau dấu phẩy (có thể bỏ trống và nhập live qua Admin Panel) | Tùy chọn |

3. Vào tab **Deployments**, chọn bản deploy mới nhất → bấm **Redeploy** để áp dụng toàn bộ biến môi trường.

---

## 4. Chạy thử trên máy cá nhân (Local Development)

Tại thư mục gốc dự án (`d:\UET Master`):

```powershell
# 1. Tạo file .env từ mẫu (file .env đã bị .gitignore chặn, không bao giờ commit)
Copy-Item .env.example .env

# 2. Mở .env và điền ENCRYPTION_SECRET cùng các biến cần thiết

# 3. Build bundle tĩnh vào dist/
node scripts/build-static.js

# 4. Khởi chạy server local (http://localhost:5000)
node scripts/local-server.js
```

---

## 5. Nhập API Key Hệ thống trực tiếp (Không cần Redeploy)

1. Mở trang web đã deploy (vd: `https://ai-tutor.phamduchieu.site`), đăng nhập bằng tài khoản Google Admin (`phamduchieurobotics@gmail.com`).
2. Bạn có thể quản lý System Key Pool ở **2 nơi** (cả hai đều được máy chủ xác thực qua Google ID Token + `/api/admin/me`):
   - **Admin Panel → tab `🔑 API Key Hệ thống`** (`/admin/system-keys`): Đầy đủ công cụ Importer 2 bước, `Test All Keys`, `Remove All Invalid Keys`, bật/tắt từng key, xóa toàn bộ và xem Audit Log.
   - **Trang `Cài đặt API` → Mục B `Kho API Key Hệ thống`** (`/api-settings`): Tự động chỉ hiển thị cho Admin đã được server xác thực; người dùng thường không thấy mục này.
3. Dán danh sách theo định dạng nhóm tài khoản:
   ```text
   1. Tài khoản 1 — email1@gmail.com
     - Google AI Studio (Gemini): AIza...
     - Groq Cloud (gsk_...): gsk_...
     - OpenRouter (sk-or-...): sk-or-...
     - OpenAI (sk-...):
     - DeepSeek (sk-...):
   ```
4. Nhấn **Phân tích & Xem trước (Preview)** / **Lưu vào Kho Hệ thống (Dùng chung)** → kiểm tra danh sách key đã ẩn, mục trùng lặp hoặc lệch tiền tố → nhấn **Xác nhận**. Key được mã hóa AES-256-GCM và kích hoạt ngay lập tức cho toàn bộ người dùng.

---

## 6. Xoay khóa mã hóa (Key Rotation)

Khi muốn đổi `ENCRYPTION_SECRET` sang khóa mới:
1. Tạo khóa mới 64 ký tự hex.
2. Đặt `ENCRYPTION_SECRET_PREVIOUS={"v1":"<khóa_v1_cũ>"}` trên Vercel.
3. Đổi `ENCRYPTION_SECRET=<khóa_v2_mới>` và `ENCRYPTION_KEY_VERSION=v2`, rồi Redeploy. Các key cũ `v1` vẫn được giải mã bình thường mà không gián đoạn dịch vụ.
