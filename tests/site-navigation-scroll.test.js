const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const header = fs.readFileSync(path.join(root, "src/components/site/SiteHeader.vue"), "utf8");
const smartNavbar = fs.readFileSync(path.join(root, "src/composables/useSmartNavbar.js"), "utf8");
const base = fs.readFileSync(path.join(root, "styles/base.css"), "utf8");

test("the shared navbar reveals on upward scroll and stays available during interaction", () => {
    assert.match(header, /class="navbar navbar-smart-scroll"/);
    assert.match(smartNavbar, /direction === -1[\s\S]*directionOriginY - currentScrollY >= 3[\s\S]*showNavbar\(\)/);
    assert.match(smartNavbar, /direction === 1[\s\S]*currentScrollY - directionOriginY >= 14[\s\S]*is-scroll-hidden/);
    assert.match(smartNavbar, /menuOpen\.value[\s\S]*openDetails\(\)\.length/);
    assert.match(header, /@pointerdown="holdVisible"/);
    assert.match(header, /@click="holdVisible"/);
    assert.match(header, /@focusin="holdVisible"/);
});

test("the fixed navbar preserves document flow and cannot hide while open or focused", () => {
    assert.match(smartNavbar, /spacer\.value\.style\.height[\s\S]*--site-navbar-height/);
    assert.match(base, /\.navbar\.navbar-smart-scroll\s*\{[^}]*position:\s*fixed;[^}]*top:\s*0;[^}]*transition:\s*top/s);
    assert.match(base, /\.navbar\.navbar-smart-scroll\.is-scroll-hidden\s*\{[^}]*top:\s*calc\(\(var\(--site-navbar-height, 100px\) \+ 2px\) \* -1\);[^}]*pointer-events:\s*none/s);
    assert.match(base, /\.navbar\.navbar-smart-scroll\.menu-open,[\s\S]*\.navbar\.navbar-smart-scroll:focus-within\s*\{[^}]*top:\s*0;[^}]*pointer-events:\s*auto/s);
    assert.match(base, /\.site-navbar-spacer\s*\{[^}]*width:\s*100%/s);
});
