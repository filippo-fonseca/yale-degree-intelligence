/**
 * Copy text to the clipboard, falling back to a hidden textarea and
 * execCommand("copy") where the async Clipboard API is missing or refuses
 * (embedded browsers, permission policies, non-secure origins).
 *
 * `anchor` is where the fallback textarea goes. Pass the clicked element so the
 * textarea sits inside any open modal rather than at the end of <body>.
 * Resolves to whether the copy is believed to have worked.
 */
export async function copyText(value: string, anchor?: HTMLElement | null): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the textarea route
  }
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  area.style.pointerEvents = "none";
  const host = anchor?.parentElement ?? document.body;
  const previous = document.activeElement as HTMLElement | null;
  host.appendChild(area);
  try {
    area.focus();
    area.select();
    area.setSelectionRange(0, value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    previous?.focus?.();
  }
}
