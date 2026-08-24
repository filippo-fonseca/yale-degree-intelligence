"use client";

import { useEffect, useState } from "react";

/**
 * The app's one sound: a pop, on tab changes and on dropping a course in the
 * Simulator. It is on by default, because it is the thing that makes the
 * Simulator feel physical, and off is a click away for anyone in a library.
 *
 * The preference is per-device rather than per-account: whether you want
 * noise depends on where you are sitting, not on who you are, and a student
 * on a shared library machine should not have their phone's setting follow
 * them. That means localStorage, and it means every read has to survive the
 * storage being unavailable (private windows, blocked site data).
 */

const STORAGE_KEY = "di-sound-effects";
const CHANGE_EVENT = "di-sound-effects-change";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Storage can be unavailable. The setting is a nicety, not state we can
    // fail a user over, so the in-memory notification below still fires and
    // the choice holds for this page.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: enabled }));
}

/**
 * Play the pop, unless the user has muted it.
 *
 * Never rejects: autoplay policy blocks audio until the page has been
 * interacted with, and a blocked sound must not surface as an error.
 */
export function playPop(volume = 1): void {
  if (typeof window === "undefined" || !isSoundEnabled()) return;
  try {
    const audio = new Audio("/audio/pop.mp3");
    audio.volume = volume;
    void audio.play().catch(() => null);
  } catch {
    // No Audio constructor, or the file failed to load. Silence is fine.
  }
}

/** Live view of the preference, for the settings toggle. */
export function useSoundEnabled(): [boolean, (enabled: boolean) => void] {
  // Starts true on both server and first client render, then corrects in an
  // effect: reading localStorage during render would hydrate-mismatch.
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());

    const onChange = (event: Event) => {
      setEnabled((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(CHANGE_EVENT, onChange);

    // Another tab changing the setting.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setEnabled(isSoundEnabled());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return [enabled, setSoundEnabled];
}
