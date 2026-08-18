"use client";

import { useState } from "react";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { APP_CONFIG } from "@/shared/constants/config";

const QUICKSTART_TABS = [
  {
    id: "cli",
    label: "CLI (Global / npx)",
    icon: "terminal",
    lang: "bash",
    code: `# Install globally and start
npm install -g @tonamson2/bee-router
bee-router

# Or run directly via npx
npx @tonamson2/bee-router`,
    description: "Starts the gateway. Dashboard is at http://localhost:20128/dashboard.",
  },
  {
    id: "curl",
    label: "cURL",
    icon: "code",
    lang: "bash",
    code: `curl http://localhost:20128/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-local" \\
  -d '{
    "model": "my-combo",
    "messages": [{"role": "user", "content": "Hello BeeRouter!"}]
  }'`,
    description: "POST /v1/chat/completions. model is a provider/model id or a combo name you created.",
  },
  {
    id: "nodejs",
    label: "Node.js / TypeScript",
    icon: "javascript",
    lang: "typescript",
    code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:20128/v1", // Point directly to BeeRouter
  apiKey: "sk-local",                 // Local token or configured provider key
});

const response = await client.chat.completions.create({
  model: "my-combo",                   // combo name or provider/model id
  messages: [{ role: "user", content: "Write a high-performance LRU cache in TS" }],
});

console.log(response.choices[0].message.content);`,
    description: "Official openai SDK. Change baseURL; leave the rest of the calls as-is.",
  },
  {
    id: "python",
    label: "Python",
    icon: "code_blocks",
    lang: "python",
    code: `from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:20128/v1",  # Point to BeeRouter
    api_key="sk-local",
)

response = client.chat.completions.create(
    model="my-combo",
    messages=[{"role": "user", "content": "Explain raft distributed consensus"}],
)

print(response.choices[0].message.content)`,
    description: "Same OpenAI Python client. Works with anything that takes a custom base_url.",
  },
  {
    id: "clitools",
    label: "Claude Code & IDEs",
    icon: "integration_instructions",
    lang: "bash",
    code: `# Claude Code CLI integration
export ANTHROPIC_BASE_URL="http://localhost:20128/v1"
claude

# Cursor / Cline / RooCode (VS Code settings)
# Set "Base URL": http://localhost:20128/v1`,
    description: "Connect Claude Code, Cursor, Cline, or RooCode to dozens of models seamlessly.",
  },
];

export default function GetStarted() {
  const { copied, copy } = useCopyToClipboard();
  const [activeTab, setActiveTab] = useState(QUICKSTART_TABS[0].id);

  const activeSnippet = QUICKSTART_TABS.find((t) => t.id === activeTab) || QUICKSTART_TABS[0];

  const handleCopy = (text) => {
    copy(text, `tab-${activeTab}`);
  };

  return (
    <section className="py-24 px-6 bg-[#0D0E12]" id="quickstart">
      <div className="max-w-7xl mx-auto">
        <div className="mb-14 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC700]/10 border border-[#FFC700]/30 text-xs font-semibold text-[#FFC700] mb-4">
            <span className="material-symbols-outlined text-[14px]">speed</span>
            Developer Quickstart
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-white">
            Point the client at this host
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Start BeeRouter, add a provider in the dashboard, set the client base URL to http://localhost:20128/v1. Combos and format translation apply after that.
          </p>
        </div>

        {/* 3 Step Workflow Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-[#16181F] border border-[#282B37] flex flex-col gap-3 group hover:border-[#FFC700]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#FFC700]/10 border border-[#FFC700]/30 text-[#FFC700] flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-bold text-lg text-white">Start BeeRouter</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Run <code className="text-[#FFC700] font-mono text-xs bg-[#0D0E12] px-1.5 py-0.5 rounded border border-[#282B37]">npx @tonamson2/bee-router</code> or install globally via npm.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#16181F] border border-[#282B37] flex flex-col gap-3 group hover:border-[#FFC700]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#FFC700]/10 border border-[#FFC700]/30 text-[#FFC700] flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-bold text-lg text-white">Connect Accounts</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Authenticate via 1-click OAuth (Codex, Claude, GitHub Copilot) or store your provider API keys in the local vault.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#16181F] border border-[#282B37] flex flex-col gap-3 group hover:border-[#FFC700]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#FFC700]/10 border border-[#FFC700]/30 text-[#FFC700] flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-bold text-lg text-white">Route Anywhere</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Point your SDK, Claude Code, or Cursor to <code className="text-[#FFC700] font-mono text-xs bg-[#0D0E12] px-1.5 py-0.5 rounded border border-[#282B37]">http://localhost:20128/v1</code>.
            </p>
          </div>
        </div>

        {/* Code Snippet Box with Tabs */}
        <div className="rounded-2xl overflow-hidden bg-[#12141A] border border-[#282B37] shadow-2xl">
          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#282B37] bg-[#16181F] px-4 pt-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
              {QUICKSTART_TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#1F222B] text-[#FFC700] border border-[#FFC700]/40 shadow-sm"
                        : "text-gray-400 hover:text-white hover:bg-[#1A1D26]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handleCopy(activeSnippet.code)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-gray-300 hover:text-white bg-[#1F222B] hover:bg-[#282B37] border border-[#282B37] transition-all cursor-pointer mb-2"
              title="Copy code snippet"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied === `tab-${activeTab}` ? "check" : "content_copy"}
              </span>
              <span>{copied === `tab-${activeTab}` ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          {/* Snippet Code Area */}
          <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto bg-[#0D0E12]">
            <div className="flex sm:hidden justify-end mb-2">
              <button
                onClick={() => handleCopy(activeSnippet.code)}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium text-gray-300 bg-[#16181F] border border-[#282B37]"
              >
                <span>{copied === `tab-${activeTab}` ? "✓ Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="text-gray-300 whitespace-pre">
              <code>{activeSnippet.code}</code>
            </pre>
          </div>

          {/* Snippet Footer Info */}
          <div className="px-6 py-3 bg-[#16181F] border-t border-[#282B37] flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-400 gap-2">
            <span>{activeSnippet.description}</span>
            <span className="font-mono text-gray-500 text-[11px]">
              Local Proxy Port: <strong className="text-white">20128</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
