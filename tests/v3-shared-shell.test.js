const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const themes = read("styles/themes.css");
const themeToggle = read("src/components/site/ThemeToggle.vue");

test("theme toggle keeps its accessible checkbox and swaps the lamp for moon and sun icons", () => {
  assert.match(themeToggle, /class="theme-toggle-input"/);
  assert.match(themeToggle, /:aria-label="ariaLabel"/);
  assert.match(themeToggle, /<svg v-if="isLight" class="v3-theme-icon"/);
  assert.match(themeToggle, /<svg v-else class="v3-theme-icon"/);
  assert.doesNotMatch(themeToggle, /theme-toggle-icon-bulb|theme-toggle-icon-rays/);
});

test("header is flat paper with a double ink rule and square controls", () => {
  assert.match(themes, /html\[data-theme\] \.navbar \{\s*background-color: rgba\(var\(--paper-rgb\), 0\.96\);\s*border-bottom: 3px double var\(--ink\);\s*box-shadow: none;/);
  assert.match(themes, /html\[data-theme\] \.navbar \.logo \{[^}]*font-family: var\(--font-serif\);[^}]*font-weight: 400;/);
  assert.match(themes, /html\[data-theme\] \.navbar \.language-switch-button \{[^}]*border: 1px solid var\(--ink\);[^}]*border-radius: 0;/);
  assert.match(themes, /html\[data-theme\] \.navbar \.nav-menu-button \{[^}]*border-radius: 0;/);
});

test("drawer controls keep at least 44px touch targets", () => {
  assert.match(themes, /@media \(max-width: 1180px\) \{\s*html\[data-theme\] \.navbar \.nav-links \{[^}]*background: var\(--paper\);[\s\S]*?\.nav-language-toggle \{[^}]*width: 46px;[^}]*height: 46px;/);
  assert.match(themes, /@media \(min-width: 1181px\) \{[\s\S]*?\.nav-language-toggle \{[^}]*width: 44px;[^}]*height: 44px;/);
});

test("footer is a flat paper row with an ink top rule", () => {
  assert.match(themes, /html\[data-theme\] \.footer \{[^}]*background: var\(--paper\);[^}]*border-top: 1px solid var\(--ink\);[^}]*display: flex;/);
});
