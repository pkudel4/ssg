// The branded mail frame (render-brand.ts, render-style.ts, the brand path of
// render-layout.ts): env parsing, the AA guard, inline content styles, the
// wordmark and card.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_DARK, DEFAULT_LIGHT, FONTS, brandOf, contrastRatio, parsePalette, readable } from "../src/render-brand.ts";
import { renderMessage, siteOf } from "../src/render.ts";
import { layout } from "../src/render-layout.ts";
import { sanitizeHtml } from "../src/sanitize.ts";
import type { HtmlNode } from "../src/sanitize.ts";
import { styleTree } from "../src/render-style.ts";

const LIGHT = "page=#fff8e1 card=#ffffff text=#3e2723 muted=#5d4037 accent=#bf360c rule=#efb78e";
const DARK = "page=#1c1411,card=#2a1f1b,text=#f3e9e2,muted=#d7ccc8,accent=#ffab91,rule=#5d4037";
const ENV = { NEWSLETTER_SITE_URL: "https://example.com", NEWSLETTER_MAIL_BRAND: " Mała <Piekarnia> ", NEWSLETTER_MAIL_FONT: "Serif", NEWSLETTER_MAIL_COLORS: LIGHT, NEWSLETTER_MAIL_COLORS_DARK: DARK };
const TOKEN = "A".repeat(43);
const content = (body: string) => ({ subject: "Hi", body, bodyFormat: "markdown" as const, textOverride: null });

test("contrastRatio: WCAG endpoints and symmetry", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#777777", "#777777"), 1);
  assert.equal(contrastRatio("#bf360c", "#ffffff"), contrastRatio("#ffffff", "#bf360c"));
  assert.ok(readable(DEFAULT_LIGHT) && readable(DEFAULT_DARK));
});

test("parsePalette: merges over defaults, rejects malformed, unknown or unreadable input", () => {
  assert.deepEqual(parsePalette(undefined, DEFAULT_LIGHT), DEFAULT_LIGHT);
  assert.deepEqual(parsePalette("accent=#BF360C", DEFAULT_LIGHT), { ...DEFAULT_LIGHT, accent: "#bf360c" });
  assert.equal(parsePalette("accent=#bf360", DEFAULT_LIGHT), null); // short hex
  assert.equal(parsePalette("accent", DEFAULT_LIGHT), null); // no value
  assert.equal(parsePalette("link=#bf360c", DEFAULT_LIGHT), null); // unknown key
  assert.equal(parsePalette("muted=#bbbbbb", DEFAULT_LIGHT), null); // 1.9:1 on white
  assert.equal(parsePalette("page=#3e2723", DEFAULT_LIGHT), null); // text unreadable on the page
});

test("brandOf: null when unset; name trimmed and capped; font; bad palettes fall back", () => {
  assert.equal(brandOf({}), null);
  assert.equal(brandOf({ NEWSLETTER_MAIL_BRAND: "  " }), null);
  const b = brandOf({ NEWSLETTER_MAIL_BRAND: "x".repeat(100), NEWSLETTER_MAIL_COLORS: "text=#ffffff", NEWSLETTER_MAIL_COLORS_DARK: "nonsense" });
  assert.equal(b?.name, "x".repeat(80));
  assert.equal(b?.font, FONTS.sans);
  assert.deepEqual(b?.light, DEFAULT_LIGHT);
  assert.deepEqual(b?.dark, DEFAULT_DARK);
  const only = brandOf({ NEWSLETTER_MAIL_FONT: "serif" });
  assert.equal(only?.name, null);
  assert.equal(only?.font, FONTS.serif);
});

test("siteOf: carries the brand only when one is configured", () => {
  assert.equal(siteOf({ NEWSLETTER_SITE_URL: "https://example.com" })?.brand, undefined);
  assert.equal(siteOf({ ...ENV, NEWSLETTER_SITE_URL: "http://example.com" }), null);
  assert.equal(siteOf(ENV)?.brand?.light.accent, "#bf360c");
});

test("styleTree: brand styles on content elements only, tree not mutated", () => {
  const brand = brandOf(ENV)!;
  const tree = sanitizeHtml('<h1>T</h1><h2>S</h2><h3>K</h3><p><a href="https://example.com/x">x</a></p><blockquote>q</blockquote><hr><img src="https://example.com/i.jpg" alt="i">');
  const styled = new Map<string, boolean>();
  const walk = (nodes: HtmlNode[]): void => {
    for (const n of nodes) if (n.type === "el") (styled.set(n.tag, n.attrs.some(([k]) => k === "style")), walk(n.children));
  };
  walk(styleTree(tree, brand));
  for (const tag of ["h1", "h2", "h3", "a", "blockquote", "hr", "img"]) assert.equal(styled.get(tag), true, tag);
  assert.equal(styled.get("p"), false);
  assert.doesNotMatch(JSON.stringify(tree), /style/);
});

test("branded mail: wordmark, card, serif, inline styles, dark scheme; text part unstyled", () => {
  const r = renderMessage(content("# Tort\n\n[Przepis](https://example.com/tort/)"), { email: "", language: "pl", token: TOKEN }, siteOf(ENV)!);
  assert.match(r.html, /<a href="https:\/\/example\.com" style="font-family:Georgia[^"]*color:#bf360c;[^"]*">Mała &lt;Piekarnia&gt;<\/a>/);
  assert.match(r.html, /class="nl-text nl-card" style="background:#ffffff;padding:28px 24px;border:1px solid #efb78e;border-radius:8px;font-family:Georgia/);
  assert.match(r.html, /<h1 style="font-family:Georgia[^"]*color:#bf360c;/);
  assert.match(r.html, /<a href="https:\/\/example\.com\/tort\/" style="color:#bf360c;text-decoration:underline;">Przepis<\/a>/);
  assert.match(r.html, /<a href="https:\/\/example\.com\/api\/newsletter\/unsubscribe\?token=A{43}" style="color:#bf360c;/);
  assert.match(r.html, /\.nl-card\{background:#2a1f1b!important;border-color:#5d4037!important\}/);
  assert.match(r.html, /class="nl-foot" style="padding:20px 8px 0;text-align:center;/);
  assert.doesNotMatch(r.text, /style|Georgia/);
  assert.doesNotMatch(r.html.replace(/https:\/\/example\.com[^"]*/g, ""), /https?:|url\(|@import|<link|<script/i);
});

test("layout: a brand without a home link shows the wordmark as text; no card when card = page", () => {
  const html = layout({ lang: "pl", title: "t", content: "c", footer: "f", brand: { ...brandOf(ENV)!, light: DEFAULT_LIGHT } });
  assert.match(html, /<span style="font-family:Georgia[^"]*">Mała &lt;Piekarnia&gt;<\/span>/);
  assert.match(html, /class="nl-text" style="font-family:Georgia/);
  assert.match(html, /border-top:1px solid #dadce0/);
});

test("the wrangler.toml example palettes parse and meet AA", () => {
  const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  const example = (name: string) => toml.match(new RegExp(`^# ${name} = "([^"]*)"`, "m"))?.[1];
  assert.ok(parsePalette(example("NEWSLETTER_MAIL_COLORS"), DEFAULT_LIGHT), "light example");
  assert.ok(parsePalette(example("NEWSLETTER_MAIL_COLORS_DARK"), DEFAULT_DARK), "dark example");
});
