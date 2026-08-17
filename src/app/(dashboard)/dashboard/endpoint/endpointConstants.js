export const WENYAN_LOCALES = ["zh-CN", "zh-TW"];

export const TUNNEL_BENEFITS = [
  { icon: "public", title: "Access Anywhere", desc: "Use your API from any network" },
  { icon: "group", title: "Share Endpoint", desc: "Share URL with team members" },
  { icon: "code", title: "Use in Cursor/Cline", desc: "Connect AI tools remotely" },
  { icon: "lock", title: "Encrypted", desc: "End-to-end TLS via Cloudflare" },
];

export const TUNNEL_PING_INTERVAL_MS = 2000;
export const TUNNEL_PING_MAX_MS = 300000;
export const STATUS_POLL_FAST_MS = 5000;
export const STATUS_POLL_SLOW_MS = 30000;
export const REACHABLE_MISS_THRESHOLD = 5;
export const CLIENT_PING_FAST_MS = 10000;
export const CLIENT_PING_SLOW_MS = 60000;
export const CLIENT_PING_TIMEOUT_MS = 5000;

export const CAVEMAN_LEVELS = [
  { id: "lite", label: "Lite", desc: "Cut filler in history + keep grammar on reply" },
  { id: "full", label: "Full", desc: "Cut articles in history + fragments on reply" },
  { id: "ultra", label: "Ultra", desc: "Max history cut + telegraphic reply" },
  { id: "wenyan-lite", label: "文 Lite", desc: "Classical Chinese, light history + reply cut", wenyan: true },
  { id: "wenyan", label: "文 Full", desc: "Maximum 文言文 on history + reply", wenyan: true },
  { id: "wenyan-ultra", label: "文 Ultra", desc: "Extreme classical cut on history + reply", wenyan: true },
];

export const PONYTAIL_LEVELS = [
  { id: "lite", label: "Lite", desc: "Build asked, name lazier option" },
  { id: "full", label: "Full", desc: "Ladder enforced: stdlib/native first" },
  { id: "ultra", label: "Ultra", desc: "YAGNI extremist, deletion first" },
];
