// The look of the mail frame: an optional wordmark, a font family and a light
// and a dark palette, read from the environment so a site can match its own
// brand without touching code. With none of the variables set, brandOf returns
// null and the frame is the neutral default (DEFAULT_LIGHT / DEFAULT_DARK).
//
//   NEWSLETTER_MAIL_BRAND        the wordmark above the content, linked to the site
//   NEWSLETTER_MAIL_FONT         "serif" or "sans" (default "sans")
//   NEWSLETTER_MAIL_COLORS       "page=#fff8e1 card=#ffffff text=#3e2723 …" (light)
//   NEWSLETTER_MAIL_COLORS_DARK  the same keys for clients in dark mode
//
// A palette names any of PALETTE_KEYS; the keys it leaves out keep their
// default. A palette that is malformed, or whose text colours fall under the
// WCAG 2.2 AA ratio of 4.5:1 against the card or the page, is ignored as a
// whole: a typo must never send thousands of unreadable mails.

export interface Palette {
  page: string; // around the card, and behind the wordmark and the footer
  card: string; // behind the content; equal to `page` = no card drawn
  text: string; // body text
  muted: string; // the footer
  accent: string; // wordmark, headings, links
  rule: string; // card border, horizontal rules, quote bar (decorative, no ratio)
}

export interface Brand {
  name: string | null;
  font: string; // a CSS font-family stack
  light: Palette;
  dark: Palette;
}

export const PALETTE_KEYS = ["page", "card", "text", "muted", "accent", "rule"] as const;

// Google palette, checked against WCAG 2.2 AA (render.test.ts has the ratios).
export const DEFAULT_LIGHT: Palette = { page: "#ffffff", card: "#ffffff", text: "#202124", muted: "#5f6368", accent: "#1967d2", rule: "#dadce0" };
export const DEFAULT_DARK: Palette = { page: "#202124", card: "#202124", text: "#e8eaed", muted: "#bdc1c6", accent: "#8ab4f8", rule: "#5f6368" };

export const FONTS = {
  sans: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans','Noto Sans Devanagari',Arial,sans-serif",
  serif: "Georgia,'Times New Roman',Times,serif",
} as const;

export const DEFAULT_BRAND: Brand = { name: null, font: FONTS.sans, light: DEFAULT_LIGHT, dark: DEFAULT_DARK };

export interface BrandEnv {
  NEWSLETTER_MAIL_BRAND?: string;
  NEWSLETTER_MAIL_FONT?: string;
  NEWSLETTER_MAIL_COLORS?: string;
  NEWSLETTER_MAIL_COLORS_DARK?: string;
}

const HEX = /^#[0-9a-f]{6}$/;
const MIN_RATIO = 4.5;

// contrastRatio is the WCAG 2.2 contrast ratio of two #rrggbb colours.
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// readable: every colour that carries text meets AA on both backgrounds.
export function readable(p: Palette): boolean {
  return (["text", "muted", "accent"] as const).every((fg) => contrastRatio(p[fg], p.card) >= MIN_RATIO && contrastRatio(p[fg], p.page) >= MIN_RATIO);
}

// parsePalette reads "key=#rrggbb …" (spaces or commas between pairs) over
// the defaults; null when a pair is malformed, a key unknown or AA fails.
export function parsePalette(raw: string | undefined, defaults: Palette): Palette | null {
  const out: Palette = { ...defaults };
  for (const pair of (raw ?? "").split(/[\s,]+/).filter(Boolean)) {
    const [key, value = ""] = pair.split("=");
    const colour = value.toLowerCase();
    if (!(PALETTE_KEYS as readonly string[]).includes(key) || !HEX.test(colour)) return null;
    out[key as keyof Palette] = colour;
  }
  return readable(out) ? out : null;
}

// brandOf returns the configured brand, or null when nothing is configured.
export function brandOf(env: BrandEnv): Brand | null {
  const name = (env.NEWSLETTER_MAIL_BRAND ?? "").trim().slice(0, 80);
  const font = (env.NEWSLETTER_MAIL_FONT ?? "").trim().toLowerCase();
  const light = env.NEWSLETTER_MAIL_COLORS?.trim();
  const dark = env.NEWSLETTER_MAIL_COLORS_DARK?.trim();
  if (!name && !font && !light && !dark) return null;
  return {
    name: name || null,
    font: font === "serif" ? FONTS.serif : FONTS.sans,
    light: parsePalette(light, DEFAULT_LIGHT) ?? DEFAULT_LIGHT,
    dark: parsePalette(dark, DEFAULT_DARK) ?? DEFAULT_DARK,
  };
}
