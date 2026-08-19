import { APP_VERSION } from "@/shared/constants/version.js";

export function getAppVersion() {
  return APP_VERSION;
}

export function timestampSlug(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
