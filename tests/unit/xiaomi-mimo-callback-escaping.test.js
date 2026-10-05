import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ handler: null, decryptCallback: vi.fn() }));
vi.mock("http", () => ({
  default: {
    createServer: (handler) => {
      state.handler = handler;
      return {
        on: vi.fn(),
        listen: (_port, _host, callback) => callback(),
        address: () => ({ port: 12345 }),
        close: vi.fn(),
      };
    },
  },
}));
vi.mock("../../src/lib/oauth/providers/xiaomi-mimo.js", () => ({ decryptCallback: state.decryptCallback }));

import {
  registerXiaomiMimoSession, startXiaomiMimoProxy, stopXiaomiMimoProxy,
} from "../../src/lib/oauth/utils/server.js";

beforeEach(() => {
  vi.useFakeTimers();
  state.decryptCallback.mockReset();
});
afterEach(() => {
  stopXiaomiMimoProxy();
  vi.useRealTimers();
});

describe("Xiaomi OAuth callback rendering", () => {
  it("escapes decryption error details before inserting them into the page", async () => {
    const message = '<img src=x onerror="alert(1)"> & failure';
    state.decryptCallback.mockReturnValue(Object.defineProperty({}, "sk", {
      get: () => { throw new Error(message); },
    }));
    registerXiaomiMimoSession({ state: "login-1", privateKeyDer: Buffer.from("private-fixture") });
    expect((await startXiaomiMimoProxy()).success).toBe(true);
    const response = { writeHead: vi.fn(), end: vi.fn() };
    await state.handler({ url: "/?u=encrypted-fixture", headers: {} }, response);
    expect(response.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
    const html = response.end.mock.calls[0][0];
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; failure");
    expect(html).not.toContain(message);
  });

  it("uses a stable BeeRouter label for new authorization keys", async () => {
    const { getKeyName } = await vi.importActual("../../src/lib/oauth/providers/xiaomi-mimo.js");
    expect(getKeyName()).toMatch(/^bee-router-xmd-[a-f0-9]{8}$/);
    expect(getKeyName()).toBe(getKeyName());
  });
});
