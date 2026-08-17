import { describe, it, expect } from "vitest";
import { crushMessages, tryCompactJson } from "../../open-sse/rtk/smartCrush.js";

function makeRows(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({ id: i, name: `user_${i}`, email: `u${i}@example.com`, city: "HN" });
  }
  return rows;
}

describe("tryCompactJson", () => {
  it("compacts a homogeneous array of >=8 objects when smaller", () => {
    const json = JSON.stringify(makeRows(20));
    const out = tryCompactJson(json);
    expect(out).not.toBeNull();
    expect(out.length).toBeLessThan(json.length);
    expect(out).toContain("omni-tabular");
    expect(out).toContain("[20 rows]");
  });

  it("leaves small arrays alone", () => {
    const json = JSON.stringify(makeRows(3));
    expect(tryCompactJson(json)).toBeNull();
  });

  it("leaves non-json text alone", () => {
    expect(tryCompactJson("not json at all")).toBeNull();
  });
});

describe("crushMessages", () => {
  it("crushes a tool JSON array in place", () => {
    const rows = makeRows(20);
    const json = JSON.stringify(rows);
    const body = { messages: [{ role: "tool", content: json }] };
    const stats = crushMessages(body);
    expect(stats.hits.length).toBeGreaterThan(0);
    expect(body.messages[0].content).toContain("omni-tabular");
    expect(body.messages[0].content.length).toBeLessThan(json.length);
  });

  it("skips system messages", () => {
    const json = JSON.stringify(makeRows(20));
    const body = { messages: [{ role: "system", content: json }] };
    const stats = crushMessages(body);
    expect(stats).toBeNull();
    expect(body.messages[0].content).toBe(json);
  });

  it("skips cache_control-marked messages", () => {
    const json = JSON.stringify(makeRows(20));
    const body = {
      messages: [{ role: "tool", cache_control: { type: "ephemeral" }, content: json }],
    };
    const stats = crushMessages(body);
    expect(stats).toBeNull();
    expect(body.messages[0].content).toBe(json);
  });
});
