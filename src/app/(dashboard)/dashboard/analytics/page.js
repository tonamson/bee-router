import Link from "next/link";
import { Card } from "@/shared/components";

const ITEMS = [
  {
    href: "/dashboard/analytics/keys",
    icon: "key",
    title: "API Keys",
    desc: "Per-key requests, tokens, cost, and model/provider breakdown",
  },
  {
    href: "/dashboard/analytics/token-save",
    icon: "savings",
    title: "Token Save",
    desc: "Payload compression (Token Save) and provider cache-read — not the same number",
  },
  {
    href: "/dashboard/analytics/pricing",
    icon: "attach_money",
    title: "Pricing",
    desc: "Per-model $/1M rates used for Usage cost and Token Save $",
  },
];

export default function AnalyticsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-tight text-text-main">Analytics & Insights Hub</h2>
        <p className="text-xs text-text-muted">
          Deep-dive into API key consumption, token compression savings, and provider pricing models.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="group block">
            <Card
              padding="md"
              className="h-full flex flex-col justify-between border-border/80 hover:border-brand-500/40 hover:shadow-[0_0_20px_rgba(255,199,0,0.12)] transition-all duration-200"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="size-9 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-text-subtle group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all">
                    arrow_forward
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-main group-hover:text-brand-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
