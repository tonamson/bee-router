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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-1 sm:px-0">
      <p className="text-sm text-text-muted">
        Cost and compression analytics. Settings stay on Token Saver.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="block">
            <Card padding="sm" className="hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[22px]">{item.icon}</span>
                <div>
                  <h2 className="text-sm font-semibold">{item.title}</h2>
                  <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
