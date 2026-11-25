// The frame every campaign's HTML part is sent in.
//
// Mail clients are not browsers: many drop <style>, some drop <head>, several
// rewrite colours in dark mode. So the layout leans on what survives all of
// them — a presentation table, inline styles on the frame, system fonts, no
// remote resources (no web fonts, no images of its own) — and adds a small
// <style> block only as an improvement where it is honoured (link colour, a
// dark scheme for clients that announce one).
//
// Colours come from the brand (render-brand.ts): the neutral default palette
// unless the site configured its own. A brand may add a text wordmark above
// the content (text, not an image: image proxies may not reach the site) and a
// card: when the palette's `card` differs from its `page`, the content sits on
// a bordered card and the footer is centred below it. Every palette that gets
// here has passed the WCAG 2.2 AA check in render-brand.ts.

import { DEFAULT_BRAND } from "./render-brand";
import type { Brand } from "./render-brand";
import { escapeHtml } from "./render-entities";

export interface LayoutInput {
  lang: string; // the <html lang>, the recipient's language
  title: string; // the subject
  content: string; // sanitized HTML
  footer: string; // the footer's HTML (unsubscribe link)
  brand?: Brand | null; // null or absent = DEFAULT_BRAND
  home?: string; // the site's origin, the wordmark's link
}

function style(b: Brand): string {
  const d = b.dark;
  return [
    ":root{color-scheme:light dark;supported-color-schemes:light dark}",
    `a{color:${b.light.accent}}`,
    "@media (prefers-color-scheme:dark){",
    `.nl-bg{background:${d.page}!important}`,
    `.nl-card{background:${d.card}!important;border-color:${d.rule}!important}`,
    `.nl-text{color:${d.text}!important}`,
    `.nl-foot{color:${d.muted}!important;border-color:${d.rule}!important}`,
    `.nl-bg a,.nl-text h1,.nl-text h2{color:${d.accent}!important}`,
    `.nl-text h3,.nl-text blockquote{color:${d.muted}!important}`,
    `.nl-text hr,.nl-text blockquote{border-color:${d.rule}!important}`,
    "}",
    "img{max-width:100%;height:auto}",
  ].join("");
}

function header(b: Brand, home: string | undefined): string {
  if (!b.name) return "";
  const mark = `font-family:${b.font};font-size:34px;line-height:1.2;color:${b.light.accent};text-decoration:none;`;
  const name = escapeHtml(b.name);
  const inner = home ? `<a href="${escapeHtml(home)}" style="${mark}">${name}</a>` : `<span style="${mark}">${name}</span>`;
  return `<tr><td align="center" style="padding:8px 0 20px;">${inner}</td></tr>\n`;
}

export function layout(p: LayoutInput): string {
  const b = p.brand ?? DEFAULT_BRAND;
  const l = b.light;
  const card = l.card !== l.page;
  const box = card ? `background:${l.card};padding:28px 24px;border:1px solid ${l.rule};border-radius:8px;` : "";
  const foot = card ? "padding:20px 8px 0;text-align:center;" : `padding-top:16px;margin-top:24px;border-top:1px solid ${l.rule};text-align:left;`;
  return (
    `<!doctype html>\n<html lang="${escapeHtml(p.lang)}" dir="ltr">\n<head>\n` +
    `<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<meta name="color-scheme" content="light dark">\n<meta name="supported-color-schemes" content="light dark">\n` +
    `<title>${escapeHtml(p.title)}</title>\n<style>${style(b)}</style>\n</head>\n` +
    `<body class="nl-bg" style="margin:0;padding:0;background:${l.page};">\n` +
    `<table role="presentation" class="nl-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${l.page};">` +
    `<tr><td align="center" style="padding:24px ${card ? 12 : 16}px;">\n` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">\n` +
    header(b, p.home) +
    `<tr><td class="nl-text${card ? " nl-card" : ""}" style="${box}font-family:${b.font};font-size:16px;line-height:1.6;color:${l.text};text-align:left;">\n` +
    `${p.content}\n</td></tr>\n` +
    `<tr><td class="nl-foot" style="${foot}font-family:${b.font};font-size:13px;line-height:1.5;color:${l.muted};">\n${p.footer}\n</td></tr>\n` +
    `</table>\n</td></tr></table>\n</body>\n</html>\n`
  );
}
