export default {
  id: "qwen-web",
  priority: 211,
  alias: "qwen-web",
  aliases: ["qwen-web"],
  uiAlias: "qwen-web",
  display: {
    name: "Qwen Web (Free)",
    icon: "auto_awesome",
    color: "#615CED",
    textIcon: "QW",
    website: "https://chat.qwen.ai",
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Paste the FULL Cookie header from chat.qwen.ai (cna, ssxmod_itna, token, …). Token-only paste is blocked by WAF.",
  transport: {
    baseUrl: "https://chat.qwen.ai/api/v2/chat/completions",
    format: "openai",
    authType: "cookie",
  },
  models: [
    { id: "qwen3.7-max", name: "Qwen3.7 Max" },
    { id: "qwen3.7-plus", name: "Qwen3.7 Plus" },
    { id: "qwen3.6-plus", name: "Qwen3.6 Plus" },
    { id: "qwen3.8-max-preview", name: "Qwen3.8 Max Preview" },
  ],
};
