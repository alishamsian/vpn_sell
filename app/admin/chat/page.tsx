import Link from "next/link";

import { AdminPageHeader, AdminPill, AdminSectionCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminChatConversations } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  await requireAdmin();
  const conversations = await getAdminChatConversations();

  const inbox = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string | null;
      phone: string | null;
      unread: number;
      lastMessageAt: string | null;
      lastMessagePreview: string | null;
    }
  >();

  for (const conversation of conversations) {
    const existing = inbox.get(conversation.user.id);
    const lastMessageAt = conversation.lastMessageAt;
    const unread = conversation.unreadByAdmin;

    if (!existing) {
      inbox.set(conversation.user.id, {
        userId: conversation.user.id,
        name: conversation.user.name,
        email: conversation.user.email,
        phone: conversation.user.phone,
        unread,
        lastMessageAt,
        lastMessagePreview: conversation.lastMessagePreview,
      });
      continue;
    }

    existing.unread += unread;
    const existingDate = existing.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : 0;
    const nextDate = lastMessageAt ? new Date(lastMessageAt).getTime() : 0;
    if (nextDate >= existingDate) {
      existing.lastMessageAt = lastMessageAt;
      existing.lastMessagePreview = conversation.lastMessagePreview;
    }
  }

  const items = Array.from(inbox.values()).sort((a, b) => {
    if (b.unread !== a.unread) return b.unread - a.unread;
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="پیام‌رسان ادمین"
        title="Inbox کاربران"
        description="هر کاربر یک صفحه اختصاصی دارد و گفت‌وگوهای عمومی/سفارش‌محور داخل همان صفحه به‌صورت زیرمجموعه نمایش داده می‌شوند."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(items.length)} کاربر`} />}
      />

      <AdminSectionCard title="لیست کاربران" description="برای مشاهده و پاسخ‌دادن، وارد صفحه هر کاربر شوید.">
        <div className="grid gap-2">
          {items.map((item) => (
            <Link
              key={item.userId}
              href={`/admin/chat/users/${item.userId}`}
              className="rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm text-prose transition hover:bg-elevated hover:text-ink"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-ink">{item.name}</div>
                  <div className="text-xs text-faint">
                    {(item.email ?? item.phone ?? "-") +
                      (item.lastMessageAt ? ` · آخرین پیام: ${new Date(item.lastMessageAt).toLocaleString("fa-IR")}` : "")}
                  </div>
                  {item.lastMessagePreview ? (
                    <div className="text-xs text-faint line-clamp-1">{item.lastMessagePreview}</div>
                  ) : null}
                </div>
                {item.unread > 0 ? (
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white dark:bg-elevated dark:text-ink">
                    {new Intl.NumberFormat("fa-IR").format(item.unread)} خوانده‌نشده
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stroke bg-inset px-4 py-10 text-center text-sm text-faint">
              هنوز هیچ گفت‌وگویی ثبت نشده است.
            </div>
          ) : null}
        </div>
      </AdminSectionCard>
    </div>
  );
}
