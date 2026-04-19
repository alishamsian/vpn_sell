# فروش VPN

یک وب‌اپ آماده‌ی فروش VPN که با `Next.js App Router`، `TypeScript`، `Prisma`، `PostgreSQL` و `TailwindCSS` ساخته شده است.

## امکانات

- فروش تکی اکانت‌های آماده VPN
- جلوگیری از فروش تکراری با تراکنش `Serializable`
- API خرید در `POST /api/buy`
- پنل ادمین برای ساخت پلن، ورود موجودی و مشاهده وضعیت
- صفحه اصلی با موجودی زنده، حالت بارگذاری و کپی کانفیگ
- اسکریپت seed برای ورود داده‌ی نمونه

## تکنولوژی‌ها

- Next.js (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL / Supabase-compatible database
- TailwindCSS

## راه‌اندازی

1. وابستگی‌ها را نصب کنید:

```bash
npm install
```

2. فایل محیطی را کپی کنید و آدرس دیتابیس را داخل آن بگذارید:

```bash
cp .env.example .env
```

3. PostgreSQL را اجرا کنید.

اگر Docker نصب است:

```bash
docker compose up -d
```

اگر Docker ندارید، PostgreSQL را دستی نصب کنید و مطمئن شوید با مقدار `DATABASE_URL` داخل `.env` در دسترس است.

4. Prisma Client را بسازید و migration را اجرا کنید:

```bash
npx prisma migrate dev --name init
```

5. داده‌ی نمونه را وارد کنید:

```bash
npm run seed
```

6. برنامه را اجرا کنید:

```bash
npm run dev
```

سپس `http://localhost:3000` را باز کنید.

## روند خرید

منطق خرید در `lib/purchase.ts` پیاده‌سازی شده است:

1. وجود پلن بررسی می‌شود
2. اولین اکانت موجود آن پلن خوانده می‌شود
3. داخل تراکنش `Serializable`:
   - وضعیت اکانت از `available` به `sold` تغییر می‌کند
   - سفارش با `accountId` یکتا ساخته می‌شود
4. کانفیگ فروخته‌شده به کاربر برگردانده می‌شود

این روند جلوی فروش تکراری را می‌گیرد و ریسک race condition را در درخواست‌های هم‌زمان کم می‌کند.

## ساختار پروژه

```text
app/
  admin/
  api/buy/
components/
lib/
prisma/
```
