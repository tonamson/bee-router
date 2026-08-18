"use client";

const FEATURES = [
  {
    icon: "link",
    title: "One /v1 surface",
    desc: "OpenAI, Anthropic, Gemini, DeepSeek, and 40+ other providers sit behind a single OpenAI-compatible API.",
  },
  {
    icon: "bolt",
    title: "Combo fallback",
    desc: "If one account or model fails, the next in the combo runs. No client-side retry logic required.",
  },
  {
    icon: "savings",
    title: "Token saver",
    desc: "Optional in-place compression of tool results, plus keep-warm pings so subscription windows stay open.",
  },
  {
    icon: "shield_lock",
    title: "OAuth and API keys",
    desc: "Sign in with provider OAuth or paste keys. Tokens refresh locally; nothing is uploaded unless you enable sync.",
  },
  {
    icon: "dashboard_customize",
    title: "Operations dashboard",
    desc: "Live request logs, token usage, quota bars, and per-connection health on localhost:20128/dashboard.",
  },
  {
    icon: "layers",
    title: "Format translation",
    desc: "Claude, Gemini, CloudCode, Codex, and Cursor payloads convert through a documented translator — not a black box.",
  },
  {
    icon: "terminal",
    title: "CLI and IDE setup",
    desc: "One-click profiles for Claude Code, Codex, Cursor, Cline, and Antigravity (agy). Point the tool at this host.",
  },
  {
    icon: "lock",
    title: "Local SQLite store",
    desc: "State lives under ~/.bee-router. The process is yours. No required cloud account to route traffic.",
  },
];

export default function Features() {
  return (
    <section className="py-24 px-6" id="features">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC700]/10 border border-[#FFC700]/30 text-xs font-semibold text-[#FFC700] mb-4">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            What it actually does
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-white">
            Routing, credentials, and observability in one process
          </h2>
          <p className="text-gray-400 max-w-2xl text-lg leading-relaxed">
            Built for people who already have Claude Code, Cursor, or an SDK and need one place to attach providers.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature) => (
            <div 
              key={feature.title}
              className="p-6 rounded-2xl bg-[#16181F] border border-[#282B37] hover:border-[#FFC700]/50 hover:bg-[#1A1D26] hover:shadow-[0_0_25px_rgba(255,199,0,0.15)] hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#FFC700]/10 border border-[#FFC700]/20 flex items-center justify-center mb-5 text-[#FFC700] group-hover:scale-110 group-hover:bg-[#FFC700]/20 group-hover:shadow-[0_0_15px_rgba(255,199,0,0.3)] transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">{feature.icon}</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-white group-hover:text-[#FFC700] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

