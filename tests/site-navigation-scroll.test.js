const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const site = fs.readFileSync(path.join(root, "scripts/site.js"), "utf8");
const base = fs.readFileSync(path.join(root, "styles/base.css"), "utf8");

test("the shared navbar reveals on upward scroll and stays available during interaction", () => {
    assert.match(site, /navbar\.classList\.add\("navbar-smart-scroll"\)/);
    assert.match(site, /direction === -1[\s\S]*directionOriginY - currentScrollY >= 3[\s\S]*showNavbar\(\)/);
    assert.match(site, /direction === 1[\s\S]*currentScrollY - directionOriginY >= 14[\s\S]*is-scroll-hidden/);
    assert.match(site, /menu-open[\s\S]*details\[open\]/);
    assert.match(site, /navbar\.addEventListener\("pointerdown", holdNavbarVisible\)/);
    assert.match(site, /navbar\.addEventListener\("click", holdNavbarVisible\)/);
    assert.match(site, /navbar\.addEventListener\("focusin", holdNavbarVisible\)/);
});

test("the fixed navbar preserves document flow and cannot hide while open or focused", () => {
    assert.match(site, /navbarSpacer\.style\.height[\s\S]*--site-navbar-height/);
    assert.match(base, /\.navbar\.navbar-smart-scroll\s*\{[^}]*position:\s*fixed;[^}]*top:\s*0;[^}]*transition:\s*top/s);
    assert.match(base, /\.navbar\.navbar-smart-scroll\.is-scroll-hidden\s*\{[^}]*top:\s*calc\(\(var\(--site-navbar-height, 100px\) \+ 2px\) \* -1\);[^}]*pointer-events:\s*none/s);
    assert.match(base, /\.navbar\.navbar-smart-scroll\.menu-open,[\s\S]*\.navbar\.navbar-smart-scroll:focus-within\s*\{[^}]*top:\s*0;[^}]*pointer-events:\s*auto/s);
    assert.match(base, /\.site-navbar-spacer\s*\{[^}]*width:\s*100%/s);
});
