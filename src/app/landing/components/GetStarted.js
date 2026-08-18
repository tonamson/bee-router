"use client";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { APP_CONFIG } from "@/shared/constants/config";

export default function GetStarted() {
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = (text) => {
    copy(text, "landing");
  };

  return (
    <section className="py-24 px-6 bg-[#0D0E12]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          {/* Left: Steps */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC700]/10 border border-[#FFC700]/30 text-xs font-semibold text-[#FFC700] mb-4">
              <span className="material-symbols-outlined text-[14px]">speed</span>
              Quick Start
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-white">
              Get Started in 30 Seconds
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Launch BeeRouter, connect your provider accounts via the web console, and start routing AI requests instantaneously.
            </p>
            
            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <div className="flex-none w-9 h-9 rounded-xl bg-[#FFC700]/15 border border-[#FFC700]/30 text-[#FFC700] flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-lg text-white">Launch BeeRouter</h4>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                    Run the npx command to boot the gateway server and web console with zero configuration.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-none w-9 h-9 rounded-xl bg-[#FFC700]/15 border border-[#FFC700]/30 text-[#FFC700] flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-lg text-white">Connect Providers</h4>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                    Authenticate via 1-click OAuth (Codex, Claude, GitHub, Qwen) or paste your API keys.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-none w-9 h-9 rounded-xl bg-[#FFC700]/15 border border-[#FFC700]/30 text-[#FFC700] flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-lg text-white">Route AI Requests</h4>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                    Point Claude Code, Cursor, Cline, or your apps to <code className="text-[#FFC700] font-mono text-xs bg-[#16181F] px-1.5 py-0.5 rounded border border-[#282B37]">http://localhost:20128/v1</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Code block */}
          <div className="flex-1 w-full">
            <div className="rounded-2xl overflow-hidden bg-[#12141A] border border-[#282B37] shadow-2xl">
              {/* Terminal header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#16181F] border-b border-[#282B37]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>
                <div className="text-xs text-gray-400 font-mono">bash — BeeRouter</div>
                <div className="w-12" />
              </div>
              
              {/* Terminal content */}
              <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
                <div 
                  className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-[#16181F] border border-[#282B37] group cursor-pointer hover:border-[#FFC700]/50 transition-colors"
                  onClick={() => handleCopy("npx bee-router")}
                  title="Click to copy"
                >
                  <span className="text-[#FFC700] font-bold">$</span>
                  <span className="text-white font-bold">npx bee-router</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded bg-[#282B37] text-gray-300 group-hover:text-[#FFC700] group-hover:bg-[#FFC700]/10 transition-colors">
                    {copied === "landing" ? "✓ Copied" : "Copy"}
                  </span>
                </div>
                
                <div className="text-gray-300 mb-6 space-y-1 text-xs">
                  <p><span className="text-[#FFC700] font-bold">&gt;</span> Starting BeeRouter v{APP_CONFIG?.version || "0.1.0"}...</p>
                  <p><span className="text-[#FFC700] font-bold">&gt;</span> Server running on <span className="text-sky-400 underline">http://localhost:20128</span></p>
                  <p><span className="text-[#FFC700] font-bold">&gt;</span> Web Dashboard: <span className="text-sky-400 underline">http://localhost:20128/dashboard</span></p>
                  <p className="text-emerald-400 font-bold"><span className="text-emerald-400">&gt;</span> Hive status: Ready to route requests! ✓</p>
                </div>
                
                <div className="text-xs text-gray-500 mb-3 border-t border-[#282B37] pt-4 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#FFC700]">database</span>
                  Encrypted Local SQLite Vault
                </div>
                
                <div className="text-gray-400 text-xs font-mono bg-[#0D0E12] p-3 rounded-lg border border-[#282B37]">
                  <span className="text-gray-500">macOS/Linux:</span> ~/.bee-router/db/data.sqlite<br />
                  <span className="text-gray-500">Windows:    </span> %APPDATA%/bee-router/db/data.sqlite
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

