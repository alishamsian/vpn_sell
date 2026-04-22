import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPill,
  AdminSectionCard,
  AdminTableEmptyState,
} from "@/components/admin/admin-ui";
import { BarsList, DonutChart, MiniLegend, SparkLine } from "@/components/admin/admin-report-charts";
import { formatPrice } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { getAdminReports } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();
  const reports = await getAdminReports();
  const kpis = reports.kpis;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="گزارش‌ها"
        title="گزارش‌ها و سلامت سیستم"
        description="تصویر کامل از فروش، سفارش‌ها، پرداخت‌ها، رشد کاربران و وضعیت موجودی. این صفحه برای تصمیم‌گیری سریع و پیدا کردن گلوگاه‌ها طراحی شده است."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(kpis.windowDays)} روز اخیر`} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="درآمد ۳۰ روز اخیر"
          value={formatPrice(kpis.totalRevenueWindow)}
          tone={kpis.totalRevenueWindow > 0 ? "success" : "default"}
          hint={`میانگین ارزش سفارش: ${formatPrice(kpis.avgOrderValueWindow)}`}
        />
        <AdminMetricCard
          label="سفارش‌های امروز"
          value={new Intl.NumberFormat("fa-IR").format(kpis.ordersToday)}
          hint={`کل سفارش‌ها در ۳۰ روز: ${new Intl.NumberFormat("fa-IR").format(kpis.totalOrdersWindow)}`}
        />
        <AdminMetricCard
          label="موجودی قابل فروش"
          value={new Intl.NumberFormat("fa-IR").format(kpis.availableAccounts)}
          tone={kpis.availableAccounts <= 10 ? "warning" : "default"}
          hint={`کل اکانت‌ها: ${new Intl.NumberFormat("fa-IR").format(kpis.totalAccounts)}`}
        />
        <AdminMetricCard
          label="کاربران"
          value={new Intl.NumberFormat("fa-IR").format(kpis.totalUsers)}
          hint={`کل پلن‌ها: ${new Intl.NumberFormat("fa-IR").format(kpis.totalPlans)}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          title="روند سفارش‌ها (۳۰ روز اخیر)"
          description="تعداد سفارش‌های ثبت‌شده در هر روز. اگر افت ناگهانی دیدید معمولاً مشکل پرداخت یا موجودی است."
          action={
            <MiniLegend
              items={[
                { label: "کل", value: new Intl.NumberFormat("fa-IR").format(kpis.totalOrdersWindow), tone: "sky" },
              ]}
            />
          }
        >
          <SparkLine data={reports.series.orders} tone="sky" />
        </AdminSectionCard>

        <AdminSectionCard
          title="روند درآمد (۳۰ روز اخیر)"
          description="جمع درآمد سفارش‌های Fulfilled یا پرداخت‌های Approved (به‌عنوان درآمد تحقق‌یافته)."
          action={
            <MiniLegend
              items={[
                { label: "امروز", value: formatPrice(kpis.revenueTodayToman), tone: "emerald" },
                { label: "۳۰ روز", value: formatPrice(kpis.totalRevenueWindow), tone: "emerald" },
              ]}
            />
          }
        >
          <SparkLine data={reports.series.revenue} tone="emerald" />
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="وضعیت پرداخت‌ها" description="تقسیم‌بندی پرداخت‌ها برای مدیریت صف بررسی.">
          <DonutChart
            items={[
              { label: "در انتظار بررسی", value: kpis.paymentStatusCounts.PENDING, tone: "amber" },
              { label: "تأیید شده", value: kpis.paymentStatusCounts.APPROVED, tone: "emerald" },
              { label: "رد شده", value: kpis.paymentStatusCounts.REJECTED, tone: "rose" },
            ]}
          />
        </AdminSectionCard>

        <AdminSectionCard title="وضعیت سفارش‌ها" description="کجا گیر داریم؟ بیشترین سهم معمولاً گلوگاه را نشان می‌دهد.">
          <DonutChart
            items={[
              { label: "منتظر پرداخت", value: kpis.orderStatusCounts.PENDING_PAYMENT, tone: "slate" },
              { label: "در انتظار بررسی رسید", value: kpis.orderStatusCounts.PAYMENT_SUBMITTED, tone: "amber" },
              { label: "منتظر اکانت", value: kpis.orderStatusCounts.WAITING_FOR_ACCOUNT, tone: "sky" },
              { label: "تحویل‌شده", value: kpis.orderStatusCounts.FULFILLED, tone: "emerald" },
            ]}
          />
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          title="پلن‌های با موجودی کم"
          description="پلن‌هایی که موجودی آن‌ها به سه عدد یا کمتر رسیده است."
        >
          {reports.lowStockPlans.length === 0 ? (
            <AdminTableEmptyState label="پلنی با موجودی بحرانی وجود ندارد." />
          ) : (
            <div className="space-y-3">
              {reports.lowStockPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/40"
                >
                  <div>
                    <div className="font-semibold text-amber-950 dark:text-amber-100">{plan.name}</div>
                    <div className="mt-1 text-xs text-amber-800 dark:text-amber-200">{formatPrice(plan.price)}</div>
                  </div>
                  <div className="text-amber-900 dark:text-amber-100">
                    موجودی: {new Intl.NumberFormat("fa-IR").format(plan.remainingCount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="پلن‌های پرتقاضا (کلی)"
          description="بر اساس مجموع اکانت‌های ثبت‌شده برای هر پلن (از ابتدا)."
        >
          {reports.topPlans.length === 0 ? (
            <AdminTableEmptyState label="هنوز پلنی ثبت نشده است." />
          ) : (
            <div className="space-y-3">
              {reports.topPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stroke bg-inset px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-semibold text-ink">{plan.name}</div>
                    <div className="mt-1 text-xs text-prose">{formatPrice(plan.price)}</div>
                  </div>
                  <div className="text-prose">
                    کل اکانت‌ها: {new Intl.NumberFormat("fa-IR").format(plan.totalCount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          title="پرفروش‌ها در ۳۰ روز اخیر"
          description="بر اساس تعداد سفارش‌های ثبت‌شده برای هر پلن."
        >
          {reports.topPlansWindow.byOrders.length === 0 ? (
            <AdminTableEmptyState label="برای بازه‌ی انتخاب‌شده داده‌ای ثبت نشده است." />
          ) : (
            <BarsList
              items={reports.topPlansWindow.byOrders.map((row) => ({
                label: row.planName,
                value: row.ordersCount,
                tone: "sky",
              }))}
              valueLabel={(value) => `${new Intl.NumberFormat("fa-IR").format(value)} سفارش`}
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="درآمد به تفکیک پلن (۳۰ روز اخیر)"
          description="کمک می‌کند بفهمیم چه پلن‌هایی بیشترین سهم درآمد را دارند."
        >
          {reports.topPlansWindow.byRevenue.length === 0 ? (
            <AdminTableEmptyState label="برای بازه‌ی انتخاب‌شده داده‌ای ثبت نشده است." />
          ) : (
            <BarsList
              items={reports.topPlansWindow.byRevenue.map((row) => ({
                label: row.planName,
                value: row.revenueToman,
                tone: "emerald",
              }))}
              valueLabel={(value) => formatPrice(value)}
            />
          )}
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          title="رشد کاربران (۳۰ روز اخیر)"
          description="ثبت‌نام کاربران جدید در هر روز."
        >
          <SparkLine data={reports.series.users} tone="slate" />
        </AdminSectionCard>

        <AdminSectionCard
          title="کیفیت عملیات"
          description="چند شاخص کاربردی برای تصمیم‌گیری سریع."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminMetricCard
              label="میانگین زمان تحویل (۳۰ روز اخیر)"
              value={formatDurationSeconds(kpis.avgFulfillmentSeconds)}
              hint="از ثبت سفارش تا Fulfilled"
            />
            <AdminMetricCard
              label="اکانت‌های فروخته‌شده"
              value={new Intl.NumberFormat("fa-IR").format(kpis.soldAccounts)}
              hint="از ابتدا"
            />
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="آخرین رویدادهای پرداخت"
        description="لاگ‌های ممیزی پرداخت برای ردیابی سریع اقدامات سیستم و ادمین."
      >
        {reports.recentAuditLogs.length === 0 ? (
          <AdminTableEmptyState label="هنوز رویدادی ثبت نشده است." />
        ) : (
          <div className="space-y-3">
            {reports.recentAuditLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink">{log.message}</div>
                  <div className="mt-1 text-xs text-faint">
                    سفارش: {log.payment.order.id} | کاربر: {log.payment.order.user.name} | پلن:{" "}
                    {log.payment.order.plan.name}
                  </div>
                </div>
                <div className="text-xs text-faint">{formatDateTime(log.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="آخرین اعلان‌های کاربران"
        description="پیام‌های سیستمی که برای کاربران ثبت شده است."
      >
        {reports.recentNotifications.length === 0 ? (
          <AdminTableEmptyState label="هنوز اعلانی ثبت نشده است." />
        ) : (
          <div className="space-y-3">
            {reports.recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-stroke bg-inset px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-ink">{notification.title}</div>
                  <div className="text-xs text-faint">{formatDateTime(notification.createdAt)}</div>
                </div>
                <div className="mt-2 text-sm leading-6 text-prose">{notification.message}</div>
                <div className="mt-2 text-xs text-faint">
                  کاربر: {notification.user.name}
                  {notification.orderId ? ` | سفارش: ${notification.orderId}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function formatDurationSeconds(value: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return "—";
  }
  const minutes = Math.round(value / 60);
  if (minutes < 60) {
    return `${new Intl.NumberFormat("fa-IR").format(minutes)} دقیقه`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${new Intl.NumberFormat("fa-IR").format(hours)} ساعت`;
  }
  const days = Math.round(hours / 24);
  return `${new Intl.NumberFormat("fa-IR").format(days)} روز`;
}
