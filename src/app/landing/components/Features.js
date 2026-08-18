"use client";

const FEATURES = [
  { 
    icon: "link", 
    title: "Unified AI Gateway", 
    desc: "Access OpenAI, Anthropic, Gemini, DeepSeek, and 50+ providers through a single high-performance API endpoint.", 
  },
  { 
    icon: "bolt", 
    title: "Lightning-Fast Routing", 
    desc: "Ultra-low latency proxy with instant model fallback, provider failover cascades, and load balancing.", 
  },
  { 
    icon: "savings", 
    title: "Token Saver & Warm Ping", 
    desc: "Intelligent prompt caching and automated window keep-warm pings to maximize your subscription quotas.", 
  },
  { 
    icon: "shield_lock", 
    title: "OAuth & Key Vault", 
    desc: "Seamlessly authenticate via OAuth or store API keys securely on your local device with zero cloud leaks.", 
  },
  { 
    icon: "dashboard_customize", 
    title: "Reactive Web Dashboard", 
    desc: "Modern visual interface with real-time request metrics, token counters, error graphs, and topology maps.", 
  },
  { 
    icon: "layers", 
    title: "Provider Combos", 
    desc: "Chain multiple AI models into intelligent fallback pipelines with custom rules, weights, and timeouts.", 
  },
  { 
    icon: "terminal", 
    title: "CLI & IDE Native", 
    desc: "Zero configuration drop-in for Claude Code, Cursor, Cline, OpenAI Codex, RooCode, and custom SDKs.", 
  },
  { 
    icon: "lock", 
    title: "100% Local & Private", 
    desc: "Runs entirely on your machine. All credentials, database records, and logs remain strictly on your local disk.", 
  },
];

export default function Features() {
  return (
    <section className="py-24 px-6" id="features">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC700]/10 border border-[#FFC700]/30 text-xs font-semibold text-[#FFC700] mb-4">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            Built for Developers
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-white">
            Engineered for Maximum Speed &amp; Reliability
          </h2>
          <p className="text-gray-400 max-w-2xl text-lg leading-relaxed">
            Everything you need to orchestrate and streamline your AI development stack with zero friction.
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

