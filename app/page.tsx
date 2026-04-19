import { PlanList } from "@/components/plan-list";
import { getPlansWithInventory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const plans = await getPlansWithInventory();

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            فروشگاه آماده فروش VPN
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            اکانت‌های آماده VPN را امن، تکی و بدون فروش تکراری بفروش.
          </h1>
          <p className="text-base leading-7 text-slate-600 sm:text-lg">
            هر خرید به‌صورت اتمیک اولین اکانت موجود را رزرو می‌کند، سفارش می‌سازد و کانفیگ
            را فوری تحویل می‌دهد.
          </p>
        </div>
      </section>

      <PlanList plans={plans} />
    </div>
  );
}
