// Inline styles for the campaign's own elements, from the brand.
//
// The sanitizer drops every style attribute an author wrote, and a <style>
// block is not honoured everywhere (Gmail's apps drop it for non-Gmail
// accounts), so a branded mail styles headings, links, quotes, rules and
// images inline here — on the SANITIZED tree, with values that come from the
// brand, never from the campaign. The text part never sees these attributes.

import type { Brand } from "./render-brand";
import type { HtmlNode } from "./sanitize";

export function contentStyles(b: Brand): Record<string, string> {
  const p = b.light;
  return {
    h1: `font-family:${b.font};font-size:28px;line-height:1.25;font-weight:normal;color:${p.accent};margin:0 0 16px;`,
    h2: `font-family:${b.font};font-size:22px;line-height:1.3;font-weight:normal;color:${p.accent};margin:28px 0 12px;`,
    h3: `font-family:${b.font};font-size:14px;line-height:1.4;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:${p.muted};margin:24px 0 8px;`,
    a: `color:${p.accent};text-decoration:underline;`,
    blockquote: `margin:20px 0;padding:4px 0 4px 16px;border-left:3px solid ${p.rule};color:${p.muted};font-style:italic;`,
    hr: `border:0;border-top:1px solid ${p.rule};margin:28px 0;`,
    img: "display:block;max-width:100%;height:auto;border:0;border-radius:6px;",
  };
}

export function styleTree(nodes: HtmlNode[], b: Brand): HtmlNode[] {
  const styles = contentStyles(b);
  const walk = (list: HtmlNode[]): HtmlNode[] =>
    list.map((n) => {
      if (n.type === "text") return n;
      const style = styles[n.tag];
      return { ...n, attrs: style ? [...n.attrs, ["style", style]] : n.attrs, children: walk(n.children) };
    });
  return walk(nodes);
}
