"use client";

import { useEffect, useState } from "react";

/**
 * Whether the guided tour is currently running.
 *
 * The tour spotlights real elements in the real app, which only works if the
 * app is not putting a modal in front of them. The Simulator opens its
 * "Welcome to your Yale Simulator" plan selector automatically for anyone with
 * no saved plans, which is exactly the person taking the tour, so the four
 * Simulator steps used to point at a dimmed board behind a dialog.
 *
 * A module-level flag rather than a prop: the tour lives in DashboardOverlays
 * and the Simulator is mounted several layers away under the tab panels, and
 * threading a boolean through every one of those components to answer a
 * question only two of them care about is worse than a small shared signal.
 */

const CHANGE_EVENT = "di-tour-active-change";

let tourActive = false;

export function isTourActive(): boolean {
  return tourActive;
}

export function setTourActive(active: boolean): void {
  if (tourActive === active) return;
  tourActive = active;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: active }));
}

/** Live view of the flag, for components that must react when it flips. */
export function useTourActive(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isTourActive());
    const onChange = (event: Event) => {
      setActive((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  return active;
}
