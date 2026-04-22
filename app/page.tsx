import { Headphones, Layers, Package, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { PlanList } from "@/components/plan-list";
import { getSession } from "@/lib/auth";
import { getPlansWithInventory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  let plans: Awaited<ReturnType<typeof getPlansWithInventory>> = [];
  let plansLoadError: string | null = null;

  try {
    plans = await getPlansWithInventory();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    plansLoadError = message;
    console.error("[HomePage] getPlansWithInventory failed:", error);
  }

  const totalInventory = plans.reduce((sum, plan) => sum + plan.remainingCount, 0);

  return (
    <div className="space-y-10">
      {plansLoadError ? (
        <div
          className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          <div className="font-semibold">بارگذاری پلن‌ها از دیتابیس ناموفق بود</div>
          <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
            معمولاً روی Vercel یکی از این موارد است:{" "}
            <span className="font-medium">DATABASE_URL</span> اشتباه یا خالی، آدرس pooler Supabase (پورت 6543) نبودن، یا{" "}
            <span className="font-medium">migration</span>ها روی دیتابیس production اجرا نشده‌اند.
          </p>
          <p className="mt-2 font-mono text-xs opacity-90" dir="ltr">
            {plansLoadError}
          </p>
        </div>
      ) : null}
      <section className="card-surface relative overflow-hidden px-5 py-8 shadow-soft sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_left,rgba(56,189,248,0.08),transparent_24%),linear-gradient(135deg,rgba(239,246,255,0.6),transparent_45%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-center">
          <div className="hero-stagger space-y-5">
            <span className="pill-brand">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-cyan" aria-hidden />
              VPN Alish — خرید مطمئن، ثبت سفارش شفاف، تحویل بعد از تایید
            </span>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-[1.65rem] font-semibold leading-[1.35] tracking-tight text-ink sm:text-4xl sm:leading-tight lg:text-5xl">
                پلن مناسب خودت را انتخاب کن، رسید را ثبت کن و کانفیگ را امن تحویل بگیر.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-prose sm:text-base sm:leading-8 lg:text-lg">
                موجودی واقعی نمایش داده می‌شود، سفارش با کد اختصاصی ثبت می‌شود و بعد از تایید
                پرداخت، کانفیگ فقط برای همان سفارش داخل پنل کاربری تحویل داده می‌شود.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="#plans" className="btn-brand min-w-[10.5rem]">
                مشاهده پلن‌ها
              </Link>
              <Link href={session ? "/dashboard" : "/register"} className="btn-outline">
                {session ? "پیگیری سفارش‌ها" : "شروع خرید"}
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <TrustBadge icon={Layers} value={`${plans.length}`} label="پلن فعال" />
              <TrustBadge icon={Package} value={`${totalInventory}`} label="اکانت آماده" />
              <TrustBadge icon={Headphones} value="آنلاین" label="بررسی سفارش" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-card border border-sky-900/10 bg-[linear-gradient(145deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] p-5 text-white motion-safe:animate-fade-in sm:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_24%)]" />
            <div className="relative">
            <div className="text-sm font-medium text-sky-200">خلاصه روند خرید</div>
            <div className="mt-5 space-y-4">
              <SimpleStep title="۱. انتخاب پلن">پلن مناسب را انتخاب می‌کنی.</SimpleStep>
              <SimpleStep title="۲. ثبت سفارش">سیستم یک کد سفارش برایت می‌سازد.</SimpleStep>
              <SimpleStep title="۳. ثبت رسید">رسید کارت‌به‌کارت را از پنل ثبت می‌کنی.</SimpleStep>
              <SimpleStep title="۴. تحویل کانفیگ">بعد از تایید ادمین، کانفیگ را تحویل می‌گیری.</SimpleStep>
            </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 motion-safe:animate-fade-in md:grid-cols-3">
        <FeatureCard
          title="موجودی واقعی"
          description="فقط پلن‌هایی نمایش داده می‌شوند که واقعا اکانت آماده دارند."
        />
        <FeatureCard
          title="سفارش قابل پیگیری"
          description="هر سفارش کد اختصاصی دارد و وضعیت آن از داخل پنل کاربری دیده می‌شود."
        />
        <FeatureCard
          title="تحویل امن"
          description="بعد از تایید پرداخت، یک اکانت مشخص فقط به همان سفارش تخصیص داده می‌شود."
        />
      </section>

      <div className="motion-safe:animate-fade-in motion-safe:delay-100">
        <PlanList
          plans={plans}
          currentUser={session ? { name: session.name } : null}
        />
      </div>

      <section className="card-surface motion-safe:animate-fade-in p-6 sm:p-8">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">سوالات پرتکرار</h2>
          <p className="mt-2 text-sm leading-7 text-prose">
            این بخش قبل از خرید، روند سفارش و تحویل را شفاف می‌کند تا نیاز به سوال تکراری کمتر
            شود.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <div key={item.question} className="card-surface rounded-3xl p-5">
              <h3 className="text-base font-semibold text-ink">{item.question}</h3>
              <p className="mt-3 text-sm leading-7 text-prose">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="card-surface relative overflow-hidden p-6 transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-sky-600/50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_26%)]" />
      <div className="relative">
      <div className="mb-4 h-1.5 w-12 rounded-full bg-[linear-gradient(90deg,rgba(14,165,233,0.95),rgba(56,189,248,0.65))]" />
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-prose">{description}</p>
      </div>
    </div>
  );
}

function TrustBadge({ icon: Icon, label, value }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stroke bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] px-4 py-4 transition hover:border-sky-200 hover:bg-panel motion-reduce:transition-none dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.9),rgba(15,23,42,0.95))] dark:hover:border-sky-600/50 dark:hover:bg-elevated/50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_30%)]" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel/90 text-cyan-700 shadow-sm ring-1 ring-stroke/80 dark:text-cyan-300">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</div>
          <div className="mt-1 text-xs text-faint">{label}</div>
        </div>
      </div>
    </div>
  );
}

function SimpleStep({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.05))] p-4 transition hover:border-white/20 hover:bg-panel/[0.08] motion-reduce:transition-none">
      <div className="font-medium text-white">{title}</div>
      <p className="mt-1 text-sm leading-7 text-slate-300">{children}</p>
    </div>
  );
}

const faqItems = [
  {
    question: "بعد از پرداخت چه اتفاقی می‌افتد؟",
    answer:
      "بعد از ثبت رسید، پرداخت شما توسط ادمین بررسی می‌شود و به محض تایید، کانفیگ از داخل پنل کاربری همان سفارش نمایش داده می‌شود.",
  },
  {
    question: "اگر پرداخت رد شود چه می‌شود؟",
    answer:
      "اگر اطلاعات رسید ناقص یا نامعتبر باشد، دلیل رد شدن داخل سفارش ثبت می‌شود و همان‌جا می‌توانید رسید جدید ارسال کنید.",
  },
  {
    question: "اگر موجودی پلن تمام شده باشد چه می‌شود؟",
    answer:
      "اگر پرداخت تایید شود ولی اکانت آماده موجود نباشد، سفارش شما در صف تحویل می‌ماند و به محض اضافه شدن موجودی، سیستم به‌صورت خودکار آن را تحویل می‌دهد.",
  },
  {
    question: "کانفیگ را از کجا دریافت می‌کنم؟",
    answer:
      "همه کانفیگ‌ها فقط از داخل داشبورد و صفحه جزئیات سفارش قابل مشاهده، کپی و دریافت هستند و برای هر سفارش به‌صورت اختصاصی نمایش داده می‌شوند.",
  },
  {
    question: "اگر نزدیک پایان اشتراک باشم چطور متوجه شوم؟",
    answer:
      "داخل داشبورد و صفحه سفارش، تاریخ انقضا و هشدار نزدیک پایان اشتراک نمایش داده می‌شود تا بتوانید قبل از قطع شدن، سفارش تمدید ثبت کنید.",
  },
  {
    question: "اگر سوال یا مشکل داشته باشم از کجا پیگیری کنم؟",
    answer:
      "برای هر سفارش گفت‌وگوی اختصاصی در نظر گرفته شده است و از همان صفحه سفارش می‌توانید با پشتیبانی در ارتباط باشید و روند را پیگیری کنید.",
  },
] as const;
