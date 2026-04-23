import { AdminPageHeader, AdminSectionCard, AdminPill } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { fetchTelegramWebhookInfo, getTelegramAdminChatIdNormalized, isTelegramConfigured } from "@/lib/telegram";

import { setWebhookFromAdminAction } from "./actions";

export const dynamic = "force-dynamic";

function formatUnix(unix: number | undefined) {
  if (!unix) {
    return null;
  }
  return new Date(unix * 1000).toLocaleString("fa-IR");
}

export default async function AdminTelegramPage() {
  await requireAdmin();

  const configured = isTelegramConfigured();
  const adminChatId = getTelegramAdminChatIdNormalized() ?? null;
  const info = await fetchTelegramWebhookInfo();

  const statusPill = configured
    ? info.ok
      ? <AdminPill label="تلگرام: فعال" />
      : <AdminPill label="تلگرام: خطا" />
    : <AdminPill label="تلگرام: تنظیم نشده" />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="تلگرام"
        title="اتصال تلگرام و وب‌هوک"
        description="اگر دکمه‌های تایید/رد در تلگرام عمل نمی‌کنند، از همین صفحه وضعیت وب‌هوک را چک و دوباره تنظیم کن."
        action={statusPill}
      />

      <AdminSectionCard
        title="تنظیم وب‌هوک"
        description="این دکمه وب‌هوک را روی همین دامنه (production) ست می‌کند و allowed_updates را روی callback_query و message می‌گذارد."
      >
        <form action={setWebhookFromAdminAction} className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-brand-sm">
            تنظیم/آپدیت وب‌هوک
          </button>
          <div className="text-xs text-faint">
            نکته: اگر روی Vercel «Deployment Protection» فعال باشد، تلگرام به وب‌هوک دسترسی ندارد.
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="وضعیت فعلی" description="این اطلاعات مستقیم از getWebhookInfo تلگرام خوانده می‌شود.">
        <div className="grid gap-3 text-sm">
          <Row label="TELEGRAM_ADMIN_CHAT_ID" value={adminChatId ?? "—"} />
          <Row label="Webhook URL" value={info.ok ? (info.url ?? "—") : "—"} />
          <Row label="Pending updates" value={info.ok ? String(info.pending_update_count ?? 0) : "—"} />
          <Row label="Allowed updates" value={info.ok ? (info.allowed_updates?.join(", ") ?? "—") : "—"} />
          <Row label="Last error" value={info.ok ? (info.last_error_message ?? "—") : (info.error ?? "—")} />
          <Row label="Last error date" value={info.ok ? (formatUnix(info.last_error_date) ?? "—") : "—"} />
        </div>
      </AdminSectionCard>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stroke bg-inset px-4 py-3">
      <div className="text-faint">{label}</div>
      <div className="font-mono text-xs text-ink" dir="ltr">
        {value}
      </div>
    </div>
  );
}

