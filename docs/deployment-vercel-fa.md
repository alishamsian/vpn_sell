# راهنمای کامل استقرار روی Vercel و اتصال دیتابیس

این سند برای پروژه **VPN Alish** (Next.js 16 + Prisma + PostgreSQL + Supabase) نوشته شده است. مراحل را به ترتیب انجام دهید.

---

## فهرست

1. [پیش‌نیازها](#پیش‌نیازها)
2. [ساخت دیتابیس (Supabase)](#ساخت-دیتابیس-supabase)
3. [رشته‌های اتصال Prisma: `DATABASE_URL` و `DIRECT_URL`](#رشته‌های-اتصال-prisma)
4. [ساخت پروژه در Vercel](#ساخت-پروژه-در-vercel)
5. [تنظیم متغیرهای محیطی در Vercel](#تنظیم-متغیرهای-محیطی-در-vercel)
6. [اجرای Migration روی دیتابیس Production](#اجرای-migration-روی-دیتابیس-production)
7. [ساخت ادمین اولیه (Seed)](#ساخت-ادمین-اولیه-seed)
8. [باکت‌های Supabase برای رسید و چت](#باکت‌های-supabase)
9. [بعد از دیپلوی](#بعد-از-دیپلوی)
10. [عیب‌یابی](#عیب‌یابی)

---

## پیش‌نیازها

- یک حساب [GitHub](https://github.com) و ریپوی پروژه (کد push شده).
- یک حساب [Vercel](https://vercel.com).
- یک دیتابیس PostgreSQL؛ در این راهنما فرض بر **[Supabase](https://supabase.com)** است (رایگان برای شروع مناسب است).
- روی سیستم خودتان: Node.js نسخه‌ای که با پروژه سازگار است و دسترسی به ترمینال.

---

## ساخت دیتابیس (Supabase)

1. به [Supabase Dashboard](https://supabase.com/dashboard) بروید و **New project** بزنید.
2. رمز **Database password** را یادداشت کنید؛ برای URIها لازم است.
3. بعد از آماده شدن پروژه، به **Project Settings → Database** بروید.

---

## رشته‌های اتصال Prisma

در فایل [`prisma/schema.prisma`](../prisma/schema.prisma) دو متغیر استفاده شده است:

- **`DATABASE_URL`**: ترجیحاً اتصال از طریق **Connection Pooler** (برای سرورلس مثل Vercel بهتر است).
- **`DIRECT_URL`**: اتصال **مستقیم** به Postgres (برای `prisma migrate` و بعضی عملیات بدون PgBouncer).

### در Supabase کجا را کپی کنم؟

**Settings → Database → Connection string**

- یک گزینه برای **Transaction mode** یا **Pooler** (پورت **6543**، اغلب با `?pgbouncer=true`) → مناسب **`DATABASE_URL`**.
- یک گزینه برای **Direct** یا **Session** روی پورت **5432** → مناسب **`DIRECT_URL`**.

اگر فقط یک URI دارید، معمولاً:

- همان URI با پورت **5432** را برای **`DIRECT_URL`** بگذارید.
- از بخش **Pooler** همان پروژه، URI با پورت **6543** را برای **`DATABASE_URL`** بگذارید.

نکته امنیتی: این رشته‌ها را در Git commit نکنید؛ فقط در Vercel و لوکال در `.env` (که در `.gitignore` است).

---

## ساخت پروژه در Vercel

1. به [Vercel Dashboard](https://vercel.com/dashboard) بروید → **Add New… → Project**.
2. ریپوی GitHub را **Import** کنید.
3. **Framework Preset**: Next.js (خودکار تشخیص داده می‌شود).
4. **Root Directory**: اگر پروژه در ریشهٔ ریپو است، همان ریشه را نگه دارید.
5. **Build Command**: پیش‌فرض `npm run build` (اسکریپت پروژه: `prisma generate && prisma migrate deploy && next build` — با هر بیلد، migrationهای معلق روی دیتابیس اعمال می‌شود؛ `DATABASE_URL` و **`DIRECT_URL`** در Vercel باید ست باشند).
6. فعلاً **Deploy** نزنید تا اگر خواستید envها را همان اول اضافه کنید؛ یا بعد از اولین دیپلوی، envها را در Settings اضافه کرده و **Redeploy** کنید.

---

## تنظیم متغیرهای محیطی در Vercel

مسیر: **Project → Settings → Environment Variables**

برای هر متغیر، محیط **Production** (و در صورت نیاز **Preview**) را انتخاب کنید.

### ضروری برای بالا آمدن سایت و دیتابیس

| متغیر | توضیح |
|--------|--------|
| `DATABASE_URL` | اتصال Pooler به PostgreSQL (مثلاً Supabase پورت 6543) |
| `DIRECT_URL` | اتصال مستقیم (مثلاً پورت 5432) |
| `AUTH_SECRET` | یک رشتهٔ طولانی تصادفی (برای JWT سشن). در production از مقدار پیش‌فرض dev استفاده نکنید. |
| `NEXT_PUBLIC_APP_URL` | آدرس عمومی سایت، مثلاً `https://your-app.vercel.app` یا دامنهٔ اختصاصی شما |

### Supabase (فایل، چت، رسید)

| متغیر | توضیح |
|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL پروژهٔ Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | کلید anon (سمت کلاینت) |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید service role (فقط سرور؛ هرگز در فرانت لو نرود) |
| `SUPABASE_RECEIPT_BUCKET` | نام باکت رسید پرداخت |
| `SUPABASE_CHAT_BUCKET` | نام باکت پیوست‌های چت |

### ایمیل (اختیاری ولی برای فراموشی رمز و …)

| متغیر |
|--------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` |

### پرداخت و UI

| متغیر | توضیح |
|--------|--------|
| `CARD_TO_CARD_HOLDER` | نام دارندهٔ کارت |
| `CARD_TO_CARD_NUMBER` | شمارهٔ کارت |
| `CARD_TO_CARD_BANK` | نام بانک |
| `TON_WALLET_ADDRESS` | آدرس کیف برای پرداخت TON |

### تلگرام (اختیاری)

| متغیر |
|--------|
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` |

### اختیاری Prisma (timeout)

| متغیر |
|--------|
| `DATABASE_POOL_TIMEOUT`, `DATABASE_CONNECT_TIMEOUT` |

لیست کامل نام‌ها در فایل [`.env.example`](../.env.example) در ریپو آمده است.

بعد از ذخیرهٔ envها: **Deployments → آخرین deployment → … → Redeploy** (یا یک commit خالی push کنید).

---

## اجرای Migration روی دیتابیس Production

جداول باید روی **همان دیتابیسی** که `DATABASE_URL` به آن اشاره می‌کند ساخته شوند.

**روی Vercel:** با هر **Deploy**، دستور `npm run build` به‌صورت خودکار `prisma migrate deploy` را هم اجرا می‌کند؛ نیازی نیست migration را جداگانه فراموش کنید، به شرطی که در تنظیمات پروژه **`DATABASE_URL`** و **`DIRECT_URL`** (اتصال مستقیم، معمولاً پورت 5432) برای همان محیط ست شده باشد.

**دستی** (لوکال یا سرور)، اگر خواستید بدون دیپلوی جدید migration بزنید:

```bash
cd مسیر/پروژه
export DATABASE_URL="همان مقدار pooler یا مستقیم که در Vercel گذاشتید"
export DIRECT_URL="همان DIRECT که در Vercel گذاشتید"
npx prisma migrate deploy
```

- اگر خطای SSL یا اتصال دیدید، URI را از پنل Supabase دوباره کپی کنید و مطمئن شوید پسورد درست است.
- بعد از موفقیت، جداول مطابق پوشهٔ `prisma/migrations` ساخته می‌شوند.

---

## ساخت ادمین اولیه (Seed)

پروژه اسکریپت `npm run seed` دارد (طبق [`package.json`](../package.json)). اگر برای اولین بار ادمین می‌سازید:

```bash
export DATABASE_URL="..."
export DIRECT_URL="..."
npm run seed
```

مقادیر پیش‌فرض ادمین در `prisma/seed.ts` تعریف شده‌اند؛ اگر لازم است قبل از seed آن‌ها را با env یا ویرایش فایل seed تغییر دهید (طبق همان فایل).

---

## باکت‌های Supabase

1. **Storage** در Supabase → یک باکت برای رسیدها (مثلاً `payment-receipts`) و یکی برای چت (مثلاً `chat-attachments`) بسازید.
2. نام دقیق باکت‌ها را در `SUPABASE_RECEIPT_BUCKET` و `SUPABASE_CHAT_BUCKET` در Vercel قرار دهید.
3. سیاست‌های RLS و دسترسی آپلود را طبق نیاز پروژه تنظیم کنید (در غیر این صورت آپلود ممکن است خطا بدهد).

---

## بعد از دیپلوی

1. آدرس `NEXT_PUBLIC_APP_URL` را با دامنهٔ واقعی یکسان کنید.
2. صفحهٔ اصلی و `/login` و `/dashboard` را تست کنید.
3. اگر صفحهٔ اصلی پیام «بارگذاری پلن‌ها از دیتابیس ناموفق بود» نشان داد، متن خطای داخل کادر را بخوانید؛ معمولاً به migration یا `DATABASE_URL` اشاره دارد.
4. لاگ‌های runtime: **Vercel → Project → Deployments → یک deployment → Logs**.

---

## عیب‌یابی

### `DATABASE_URL is not set`

در Vercel برای محیط **Production** متغیر را اضافه کرده و دوباره deploy کنید.

### خطای اتصال به Postgres (مثلاً timeout / SSL)

- برای Supabase از **Pooler** برای `DATABASE_URL` استفاده کنید.
- در کد، برای hostnameهای `supabase.co` در صورت نبودن، `sslmode=require` به URL اضافه می‌شود ([`lib/prisma.ts`](../lib/prisma.ts))؛ با این حال URI پیشنهادی Supabase را ترجیح دهید.

### خطای `Can't reach database server at db.xxxxx.supabase.co:5432`

این یعنی اپ دارد به **پورت 5432 (اتصال مستقیم)** وصل می‌شود و از محیط Vercel به آن **شبکه نمی‌رسد** یا پروژه/اتصال درست تنظیم نشده است.

**کار درست برای Vercel:**

1. در Supabase بروید: **Project Settings → Database → Connection string**.
2. حالت **Transaction** (یا **Pooler** / پورت **6543**) را انتخاب کنید و URI را کپی کنید (معمولاً شامل `pooler.supabase.com` یا شبیه آن و پارامترهایی مثل `?pgbouncer=true` است).
3. در Vercel، متغیر **`DATABASE_URL`** را با **همین رشتهٔ Pooler** جایگزین کنید (نه `db....supabase.co:5432`).
4. متغیر **`DIRECT_URL`** را همان **اتصال مستقیم** روی پورت **5432** نگه دارید (برای `prisma migrate deploy` از روی سیستم خودتان مناسب است).
5. **Redeploy** کنید.

**چیزهایی که حتماً چک کنید:**

- پروژهٔ Supabase **متوقف (Paused)** نباشد؛ در داشبورد Supabase وضعیت را ببینید و در صورت pause، **Resume** کنید.
- رمز داخل URI درست باشد؛ اگر رمز کاراکتر خاص دارد، در URI باید **URL-encoded** باشد (بهتر است از دکمهٔ «کپی URI» خود Supabase استفاده کنید).
- اگر در Supabase محدودیت IP گذاشته‌اید، باید اجازهٔ اتصال از اینترنت/Vercel را بدهید (پیش‌فرض معمولاً برای همه باز است).

اگر بعد از گذاشتن Pooler برای `DATABASE_URL` هنوز خطا بود، متن خطای جدید را بفرستید (گاهی نام کاربری URI pooler با فرمت `postgres.PROJECT_REF` است و باید دقیقاً از پنل کپی شود).

### صفحه سفید یا «خطای سرور»

- **Logs** همان deployment در Vercel را ببینید.
- مطمئن شوید `prisma migrate deploy` روی همان دیتابیس اجرا شده است.

### چت بدون Supabase env

اگر `NEXT_PUBLIC_SUPABASE_*` ست نباشد، چت ممکن است به polling برود؛ برای تجربهٔ بهتر حتماً کلیدهای Supabase را در Vercel بگذارید.

### فراموشی `AUTH_SECRET`

در production باید مقدار قوی و تصادفی باشد؛ در غیر این صورت امنیت سشن پایین می‌آید.

### تلگرام: چت سایت و پاسخ ادمین از داخل تلگرام

برای اینکه **پیام کاربران در چت سایت** به تلگرام شما برسد و بتوانید با **Reply** روی همان پیام جواب را در سایت ثبت کنید:

1. همان envهای `TELEGRAM_BOT_TOKEN`، `TELEGRAM_ADMIN_CHAT_ID`، `TELEGRAM_WEBHOOK_SECRET` و **`NEXT_PUBLIC_APP_URL`** را در Vercel بگذارید.
2. روی دیتابیس production حتماً migration مربوط به فیلد `telegramBridgeMessageId` روی جدول `Message` اعمال شده باشد (`npx prisma migrate deploy`).
3. Webhook را دوباره با **`allowed_updates`** شامل پیام و callback تنظیم کنید (یک بار کافی است):

```bash
curl -sS -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_VERCEL_URL/api/telegram/review",
    "secret_token": "YOUR_SECRET",
    "allowed_updates": ["callback_query", "message"]
  }'
```

- برای **تایید/رد پرداخت** همان `callback_query` لازم است.
- برای **پاسخ چت از تلگرام** باید `message` هم فعال باشد.
- ادمین باید متن پاسخ را به‌صورت **Reply** روی پیامی که ربات فرستاده ارسال کند (Reply به پیام دیگر جواب ثبت نمی‌کند).

---

## مرجع سریع دستورات

```bash
# نصب و بیلد لوکال (برای بیلد کامل، DATABASE_URL و DIRECT_URL در .env لازم است)
npm install
npm run build

# اعمال migration دستی روی DB دوردست
export DATABASE_URL="..."
export DIRECT_URL="..."
npx prisma migrate deploy

# seed (در صورت نیاز)
npm run seed
```

---

## به‌روزرسانی بعدی پروژه

معمولاً با **push به branch اصلی**، Vercel دوباره build و deploy می‌کند؛ در بیلد، `prisma migrate deploy` هم اجرا می‌شود. اگر envهای دیتابیس روی Preview/Development خالی باشد، بیلد همان محیط ممکن است در مرحلهٔ migration خطا بدهد — برای آن محیطها یا env بگذارید یا در Vercel برای آن branch بیلد را غیرفعال کنید.

---

اگر بخشی از این راهنما با زیرساخت شما (مثلاً Postgres غیر از Supabase) فرق دارد، فقط بخش «رشته‌های اتصال» را با مستندات همان سرویس جایگزین کنید؛ بقیهٔ مراحل Vercel و Prisma یکسان است.
