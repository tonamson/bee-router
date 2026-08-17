/**
 * Pure extract/normalize helpers for web-cookie providers (DeepSeek + Qwen).
 * Source under test: open-sse/lib/webCookieAuth.js
 */

import { describe, it, expect } from "vitest";
import {
  stripCookieInputPrefix,
  extractDeepSeekUserToken,
  buildQwenCookieHeader,
  extractQwenToken,
} from "open-sse/lib/webCookieAuth.js";

describe("stripCookieInputPrefix", () => {
  it("strips Cookie: prefix", () => {
    expect(stripCookieInputPrefix("Cookie: cna=1; token=xyz")).toBe("cna=1; token=xyz");
  });

  it("strips bearer prefix", () => {
    expect(stripCookieInputPrefix("bearer abc.jwt")).toBe("abc.jwt");
  });

  it("returns empty for blank input", () => {
    expect(stripCookieInputPrefix("")).toBe("");
    expect(stripCookieInputPrefix("   ")).toBe("");
  });
});

describe("extractDeepSeekUserToken", () => {
  it('unwraps JSON {"value":"..."}', () => {
    expect(extractDeepSeekUserToken('{"value":"abc"}')).toBe("abc");
  });

  it("strips userToken= prefix", () => {
    expect(extractDeepSeekUserToken("userToken=abc")).toBe("abc");
  });

  it("returns raw JWT as-is", () => {
    expect(extractDeepSeekUserToken("abc")).toBe("abc");
  });

  it("returns falsy for empty input", () => {
    expect(extractDeepSeekUserToken("")).toBeFalsy();
    expect(extractDeepSeekUserToken(null)).toBeFalsy();
    expect(extractDeepSeekUserToken(undefined)).toBeFalsy();
  });
});

describe("buildQwenCookieHeader", () => {
  it("returns full cookie blob verbatim", () => {
    expect(buildQwenCookieHeader("cna=1; token=xyz")).toBe("cna=1; token=xyz");
  });

  it("strips Cookie: prefix", () => {
    expect(buildQwenCookieHeader("Cookie: cna=1; token=xyz")).toBe("cna=1; token=xyz");
  });

  it("returns empty for bare token (no =)", () => {
    expect(buildQwenCookieHeader("barejwt")).toBe("");
  });
});

describe("extractQwenToken", () => {
  it("extracts token= from cookie blob", () => {
    expect(extractQwenToken("cna=1; token=xyz")).toBe("xyz");
  });

  it("returns bare token as-is", () => {
    expect(extractQwenToken("barejwt")).toBe("barejwt");
  });

  it("returns empty when blob has no token= pair", () => {
    expect(extractQwenToken("cna=1; ssxmod_itna=2")).toBe("");
  });
});
