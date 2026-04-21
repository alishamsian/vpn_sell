import Link from "next/link";

import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPill,
  AdminQuickLink,
  AdminSectionCard,
} from "@/components/admin/admin-ui";
import { PaymentReviewList } from "@/components/admin/payment-review-list";
import { formatDuration, formatPrice, formatUserLimit } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview, getAdminPayments, getPlansWithInventory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const plans = await getPlansWithInventory();
  const overview = await getAdminOverview();
  const payments = await getAdminPayments();
  const topPlans = [...plans].sort((left, right) => right.remainingCount - left.remainingCount).slice(0, 4);
  const criticalPlans = plans.filter((plan) => plan.remainingCount <= 2).slice(0, 4);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="مرکز مدیریت"
        title="ادمین‌پنل حرفه‌ای فروش و پشتیبانی"
        description="از اینجا می‌توانید وضعیت عملیاتی فروشگاه را ببینید، پرداخت‌ها را بررسی کنید، موجودی را مدیریت کنید و به گفتگوهای کاربران پاسخ بدهید."
        action={<AdminPill label={`موجودی آماده: ${new Intl.NumberFormat("fa-IR").format(overview.availableAccounts)}`} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="در انتظار بررسی"
          value={toPersianNumber(overview.pendingPayments)}
          tone="warning"
          hint="رسیدهایی که نیاز به تایید یا رد دارند"
        />
        <AdminMetricCard
          label="پیام خوانده‌نشده"
          value={toPersianNumber(overview.unreadAdminChats)}
          tone="default"
          hint="پیام‌های جدید کاربران در مرکز گفتگو"
        />
        <AdminMetricCard
          label="کاربران"
          value={toPersianNumber(overview.usersCount)}
          tone="default"
          hint="کل حساب‌های ثبت‌شده در سامانه"
        />
        <AdminMetricCard
          label="منتظر اکانت"
          value={toPersianNumber(overview.waitingForAccountOrders)}
          tone="danger"
          hint="پرداخت تایید شده ولی هنوز اکانت تخصیص نیافته"
        />
        <AdminMetricCard
          label="پرداخت تاییدشده"
          value={toPersianNumber(overview.approvedPayments)}
          tone="success"
        />
        <AdminMetricCard
          label="پرداخت ردشده"
          value={toPersianNumber(overview.rejectedPayments)}
          tone="danger"
        />
        <AdminMetricCard
          label="پلن‌ها"
          value={toPersianNumber(overview.totalPlans)}
          tone="default"
        />
        <AdminMetricCard
          label="کل اکانت‌ها"
          value={toPersianNumber(overview.totalAccounts)}
          tone="default"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminQuickLink
          href="/admin/payments"
          title="مرکز پرداخت‌ها"
          description="تمام رسیدها، تاریخچه بررسی و تایید یا رد سریع پرداخت‌ها را در یک صفحه مدیریت کن."
        />
        <AdminQuickLink
          href="/admin/catalog"
          title="پلن‌ها و موجودی"
          description="پلن جدید بساز، موجودی را بررسی کن و اکانت‌های آماده را گروهی وارد کن."
        />
        <AdminQuickLink
          href="/admin/chat"
          title="صندوق گفت‌وگوها"
          description="همه گفتگوهای کاربران را مثل یک inbox حرفه‌ای ببین و پاسخ بده."
        />
        <AdminQuickLink
          href="/admin/reports"
          title="گزارش و مانیتورینگ"
          description="گزارش‌های عملیاتی، کاهش موجودی و لاگ‌های پرداخت را متمرکز دنبال کن."
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <AdminSectionCard
          title="آخرین پرداخت‌های نیازمند اقدام"
          description="رسیدهای تازه را سریع بررسی کنید تا زمان تحویل به کاربر کم شود."
          action={
            <Link
              href="/admin/payments"
              className="inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              مشاهده همه پرداخت‌ها
            </Link>
          }
        >
          <PaymentReviewList
            payments={[
              ...payments.filter((payment) => payment.status === "PENDING"),
              ...payments.filter((payment) => payment.status !== "PENDING"),
            ]}
            limit={3}
          />
        </AdminSectionCard>

        <div className="space-y-6">
          <AdminSectionCard
            title="وضعیت پلن‌ها"
            description="نمای سریع از مهم‌ترین پلن‌ها برای تصمیم‌گیری سریع‌تر."
            action={<AdminPill label={`${toPersianNumber(plans.length)} پلن`} />}
          >
            <div className="grid gap-3">
              {topPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{plan.name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {formatPrice(plan.price)} | {formatDuration(plan.durationDays)} |{" "}
                        {formatUserLimit(plan.maxUsers)}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      موجودی: {toPersianNumber(plan.remainingCount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="هشدارهای عملیاتی"
            description="پلن‌هایی که موجودی آن‌ها نیاز به توجه فوری دارد."
            action={
              <Link
                href="/admin/catalog"
                className="text-sm font-medium text-sky-700 transition hover:text-sky-800"
              >
                مدیریت موجودی
              </Link>
            }
          >
            <div className="grid gap-3">
              {criticalPlans.length > 0 ? (
                criticalPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-amber-950">{plan.name}</span>
                    <span className="text-amber-800">
                      فقط {toPersianNumber(plan.remainingCount)} اکانت باقی مانده
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  فعلا هشدار فوری برای موجودی پلن‌ها ندارید.
                </div>
              )}
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
}

function toPersianNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}
