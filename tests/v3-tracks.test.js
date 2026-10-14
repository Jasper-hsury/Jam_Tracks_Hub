const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const view = read("src/views/TracksView.vue");

test("Tracks no longer renders the scroll windmill decoration", () => {
  assert.doesNotMatch(view, /track-scroll-windmill|track-scroll-five-blade|<Teleport/);
});
