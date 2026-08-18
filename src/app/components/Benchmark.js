"use client";

const BENCHMARKS = [
  {
    category: "When a provider returns 429",
    direct: "Client error or your own retry loop",
    cloudGateway: "Vendor policy plus an extra hop",
    beeRouter: "Next model or account in the combo",
    winner: "beeRouter",
    highlight: "Fallback is configured once in the dashboard",
  },
  {
    category: "Where the process runs",
    direct: "Your app talks to each vendor",
    cloudGateway: "Traffic leaves the building",
    beeRouter: "Loopback process on this host",
    winner: "beeRouter",
    highlight: "No required hosted control plane",
  },
  {
    category: "Token use",
    direct: "Full prompt every time",
    cloudGateway: "Vendor cache if they offer it",
    beeRouter: "Optional tool-result compression + keep-warm",
    winner: "beeRouter",
    highlight: "Savings depend on your traffic",
  },
  {
    category: "Credentials",
    direct: "Keys in env or each client",
    cloudGateway: "Keys stored by a third party",
    beeRouter: "SQLite under ~/.bee-router",
    winner: "beeRouter",
    highlight: "Cloud sync is opt-in",
  },
  {
    category: "Clients",
    direct: "One base URL per vendor",
    cloudGateway: "Often a custom SDK",
    beeRouter: "OpenAI /v1, Claude messages, Gemini /v1beta, CloudCode /v1internal",
    winner: "beeRouter",
    highlight: "Dashboard has one-click CLI profiles",
  },
];

export default function Benchmark() {
  return (
    <section className="py-24 px-6 bg-[#0D0E12] border-t border-[#282B37]" id="benchmarks">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC700]/10 border border-[#FFC700]/30 text-xs font-semibold text-[#FFC700] mb-4">
            <span className="material-symbols-outlined text-[14px]">analytics</span>
            Compared to doing it yourself
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-white">
            Same clients. One local hop.
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            BeeRouter is a process on localhost, not a hosted proxy. That is the product: translation, fallback, and credentials without sending keys to us.
          </p>
        </div>

        {/* Benchmark Comparison Table */}
        <div className="rounded-2xl border border-[#282B37] bg-[#12141A] shadow-2xl overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#282B37] bg-[#16181F] text-xs font-semibold text-gray-400">
                  <th className="py-4 px-6">METRIC / FEATURE</th>
                  <th className="py-4 px-6">DIRECT API CALLS</th>
                  <th className="py-4 px-6">REMOTE CLOUD GATEWAYS</th>
                  <th className="py-4 px-6 text-[#FFC700] bg-[#FFC700]/5 font-bold">
                    BEEROUTER (LOCAL GATEWAY)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#282B37] font-mono text-xs">
                {BENCHMARKS.map((b, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-[#16181F]/50 transition-colors"
                  >
                    <td className="py-4 px-6 font-sans font-bold text-white text-sm">
                      {b.category}
                      <div className="text-[11px] font-mono text-gray-500 font-normal mt-0.5">
                        {b.highlight}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {b.direct}
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {b.cloudGateway}
                    </td>
                    <td className="py-4 px-6 text-[#FFC700] font-bold bg-[#FFC700]/5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#FFC700]">
                          verified
                        </span>
                        {b.beeRouter}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Highlights Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#16181F] border border-[#282B37] flex flex-col gap-2">
            <div className="text-3xl font-black text-[#FFC700]">localhost</div>
            <div className="font-bold text-white text-sm">Process location</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              Gateway and dashboard bind on this machine. Default port 20128.
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#16181F] border border-[#282B37] flex flex-col gap-2">
            <div className="text-3xl font-black text-emerald-400">Combo</div>
            <div className="font-bold text-white text-sm">Failover</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              Next model or account in the list when the current hop returns 429 or 5xx.
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#16181F] border border-[#282B37] flex flex-col gap-2">
            <div className="text-3xl font-black text-[#FFC700]">RTK</div>
            <div className="font-bold text-white text-sm">Token saver</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              Optional compression of tool results. Off by default per request flags.
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#16181F] border border-[#282B37] flex flex-col gap-2">
            <div className="text-3xl font-black text-sky-400">SQLite</div>
            <div className="font-bold text-white text-sm">On disk</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              Keys, OAuth tokens, and settings under ~/.bee-router. Cloud sync is opt-in.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
