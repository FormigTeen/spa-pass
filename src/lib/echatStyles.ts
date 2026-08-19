/**
 * The E-Chat remote's stylesheet, confined to the widget's own subtree and
 * opened up to a palette this app can set.
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
 *
 * Who owns which half: the widget owns its structure. The class names inside it
 * are the remote's build output — a host rule aimed at them is a rule aimed at
 * someone else's private names, and it breaks on their next refactor. What this
 * app owns instead is the palette and the faces, through the tokens below.
 */

const REMOTE_BASE = "https://echat.cvlb.tech/_mfe/chat/";

/** Put this on the element the widget mounts into — and on nothing else. */
export const ECHAT_SCOPE = "echat-scope";

/**
 * The widget's palette, as tokens. Set any of them on the scope element (or
 * anywhere above it) to re-theme the conversation; set none and it stays the
 * colour the remote drew it.
 *
 * Values are **RGB channels**, not hex: Tailwind compiled the palette into
 * `rgb(150 0 20 / var(--tw-bg-opacity))`, and only the channels can move
 * without taking the per-utility opacity with them.
 */
export const ECHAT_PALETTE = {
  "--echat-brand-rgb": "150 0 20",
  "--echat-brand-deep-rgb": "132 4 21",
  "--echat-brand-soft-rgb": "232 101 122",
  "--echat-ink-rgb": "29 28 25",
  "--echat-ink-soft-rgb": "38 36 32",
  "--echat-cream-rgb": "250 236 199",
  "--echat-leaf-rgb": "47 158 94",
  "--echat-leaf-soft-rgb": "127 216 160",
} as const;

/**
 * The four faces, likewise. On React Native a weight *is* a family, which is
 * why each one is its own token rather than a single family plus a weight.
 */
export const ECHAT_FACES = {
  "--echat-font-regular": "PlusJakartaSans_400Regular",
  "--echat-font-medium": "PlusJakartaSans_500Medium",
  "--echat-font-semibold": "PlusJakartaSans_600SemiBold",
  "--echat-font-bold": "PlusJakartaSans_700Bold",
} as const;

const FONT_FACE = /@font-face\s*\{[^}]*\}/g;

/** Root-relative asset paths resolve against this app otherwise, and 404. */
const absoluteAssets = (css: string) =>
  css.replace(/url\((["']?)\/(?!\/)/g, `url($1${new URL(REMOTE_BASE).origin}/`);

const tokenised = (css: string) => {
  const palette = Object.entries(ECHAT_PALETTE).reduce(
    (out, [token, channels]) =>
      // The lookahead keeps `29 28 25` from also matching inside `29 28 255`.
      out.replace(
        new RegExp(`rgb\\(${channels}(?=[\\s)/])`, "g"),
        `rgb(var(${token}, ${channels})`,
      ),
    css,
  );

  return Object.entries(ECHAT_FACES).reduce(
    (out, [token, family]) =>
      out.replace(
        new RegExp(`font-family: ${family}`, "g"),
        `font-family: var(${token}, ${family})`,
      ),
    palette,
  );
};

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
  // Registering the families is global; naming them is not, so the faces are
  // tokenised only inside the scope.
  const fonts = css.match(FONT_FACE)?.join("\n") ?? "";
  const scoped = tokenised(css.replace(FONT_FACE, ""));

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`${fonts}\n@scope (.${ECHAT_SCOPE}) {\n${scoped}\n}`);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
};

let pending: Promise<void> | undefined;

/** Idempotent: the sheet is fetched and adopted once per page. */
export const loadEChatStyles = () => (pending ??= load());
