"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A one-way "the user has seen / dismissed this" flag, kept in localStorage.
 *
 * Deliberately local rather than on the Firestore profile (see lib/userFlags.ts
 * for those). These flags gate cosmetic nudges: a "New" chip, a tip bar the
 * user closed. Losing one on a new device shows a chip again, which is a much
 * better trade than a write to the user document every time somebody dismisses
 * a hint. Anything that must follow the account belongs in userFlags.
 *
 * Reads happen in an effect rather than in the initial state, because
 * localStorage does not exist during the server render and reading it lazily
 * would make the first client render disagree with the server's HTML.
 * `ready` distinguishes "not dismissed" from "not yet known", so callers can
 * avoid flashing a chip that is about to disappear.
 */

const PREFIX = "di-dismissed:";

export function useDismissibleFlag(key: string) {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setDismissed(
        window.localStorage.getItem(`${PREFIX}${key}`) === "1",
      );
    } catch {
      // Private mode / storage disabled: treat as not dismissed.
    }
    setReady(true);
  }, [key]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(`${PREFIX}${key}`, "1");
    } catch {
      // Non-fatal: it just reappears next session.
    }
  }, [key]);

  /** Visible only once we know, so a dismissed nudge never flashes on load. */
  const show = ready && !dismissed;

  return { dismissed, ready, show, dismiss };
}
