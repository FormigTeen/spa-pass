/**
 * The E-Chat remote's stylesheet, confined to the widget's own subtree.
 *
 * The remote links its CSS only from its standalone page, so a federated host
 * receives the widget's markup with none of its styling — unpadded text on the
 * container's left edge, no bubbles, no type.
 *
 * Adopting that stylesheet as it comes is not an option either: it is an
 * unlayered Tailwind v3 build, preflight included, and unlayered rules beat
 * this app's layered Tailwind v4 utilities on every class name the two share.
 * `.inset-0` alone re-pins any panel of ours to all four edges, and
 * `.font-medium` there names a font family, so it restyles our headings.
 *
 * Hence: fetch it, point the `@font-face` paths back at the remote and leave
 * those unscoped (an at-rule cannot live inside `@scope`, and registering a
 * family is harmless), then confine every style rule to `ECHAT_SCOPE`.
 *
 * A browser without `@scope` drops the whole block: the widget arrives plain,
 * the way it does today, and this app is still left alone.
 */

const REMOTE_BASE = "https://echat.cvlb.tech/_mfe/chat/";

/** Put this on the element the widget mounts into — and on nothing else. */
export const ECHAT_SCOPE = "echat-scope";

const FONT_FACE = /@font-face\s*\{[^}]*\}/g;

/** Root-relative asset paths resolve against this app otherwise, and 404. */
const absoluteAssets = (css: string) =>
  css.replace(/url\((["']?)\/(?!\/)/g, `url($1${new URL(REMOTE_BASE).origin}/`);

const fetchText = async (url: string | URL) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.text();
};

const load = async () => {
  // The filename carries a build hash, so it is read off the remote's own page
  // rather than pinned here.
  const page = await fetchText(`${REMOTE_BASE}index.mfe.html`);
  const href = page.match(
    /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/,
  )?.[1];
  if (!href) throw new Error("the E-Chat remote publishes no stylesheet");

  const css = absoluteAssets(await fetchText(new URL(href, REMOTE_BASE)));
  const fonts = css.match(FONT_FACE)?.join("\n") ?? "";

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(
    `${fonts}\n@scope (.${ECHAT_SCOPE}) {\n${css.replace(FONT_FACE, "")}\n}`,
  );
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
};

let pending: Promise<void> | undefined;

/** Idempotent: the sheet is fetched and adopted once per page. */
export const loadEChatStyles = () => (pending ??= load());
