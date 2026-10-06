import DOMPurify from "isomorphic-dompurify";

// Only matches the tags we actually allow below — a plain-text value like
// "Bring a <front> sight" must NOT be treated as HTML (that previously
// suppressed paragraph-ization and lost the text's newlines).
const HTML_TAG_RE = /<\/?(p|br|strong|em|u|s|ul|ol|li|a|h[234]|blockquote|code)\b/i;

// DOMPurify allows `target` in ALLOWED_ATTR below but never adds `rel` on its
// own — without this hook, `target="_blank"` links are exploitable via
// reverse tabnabbing (the opened page gets `window.opener`).
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Normalizes a DB text field that may be EITHER legacy plain text (seed data,
 * blank-line separated) OR Tiptap HTML (written by admin RichTextInput) into
 * sanitized HTML safe for dangerouslySetInnerHTML.
 */
export function renderRichText(value: string | null | undefined): string {
  if (!value) return "";
  const looksLikeHtml = HTML_TAG_RE.test(value);
  const html = looksLikeHtml
    ? value
    : escapeHtml(value)
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
        .join("");
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "h2", "h3", "h4", "blockquote", "code"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/**
 * For one-line page_content values (headlines, taglines) rendered as a React
 * text node. Admin Site Content saves Tiptap HTML ("<p>Text &amp; more</p>"),
 * seed rows are plain text — collapse either to plain text. The result is
 * rendered as text (auto-escaped), never as HTML.
 */
export function toPlainText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
