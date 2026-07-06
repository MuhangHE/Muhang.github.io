import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPrefix } from "../lib/posts.mjs";

test("nextPrefix: empty list -> 1", () => {
  assert.equal(nextPrefix([]), 1);
});
test("nextPrefix: max leading number + 1", () => {
  assert.equal(nextPrefix(["1_a", "9_weekly_report_4", "3_b"]), 10);
});
test("nextPrefix: ignores folders without numeric prefix", () => {
  assert.equal(nextPrefix(["assests", "2_x", "notanumber"]), 3);
});
