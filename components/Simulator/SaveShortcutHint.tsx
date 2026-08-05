"use client";

import { useEffect, useState } from "react";

/**
 * The quick-save shortcut as a keycap, so the Save buttons advertise it
 * instead of hiding it in a tooltip. Renders the Mac glyph first and corrects
 * itself after mount: the server cannot know the platform, and most of our
 * users are on Macs, so the flash of a wrong hint is the rare case.
 *
 * Colour comes from the caller via className; the keycap itself only knows
 * its shape.
 */
export default function SaveShortcutHint({
  className = "",
}: {
  className?: string;
}) {
  const [mac, setMac] = useState(true);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/i.test(navigator.platform));
  }, []);

  return (
    <kbd
      aria-hidden
      className={`rounded-[4px] border px-1 py-0.5 font-sans text-[10px] font-semibold leading-none ${className}`}
    >
      {mac ? "⌘S" : "Ctrl+S"}
    </kbd>
  );
}
