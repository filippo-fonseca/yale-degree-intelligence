"use client";

import { useCallback } from "react";
import { useDismissibleFlag } from "@/lib/useDismissibleFlag";

/**
 * The "2030 can use!" chips on the sidebar.
 *
 * They exist to tell a first-year that a tab is worth opening without a
 * transcript. Once they have opened it, the chip has done its job and every
 * further sighting is noise, so each tab's chip retires the first time that
 * tab is visited, independently of the others.
 *
 * localStorage rather than the profile, per useDismissibleFlag's note: losing
 * one on a new device shows a chip again, which beats a Firestore write for a
 * cosmetic nudge.
 */

const NUDGE_TABS = ["major", "certificate", "simulator"] as const;
export type NudgeTab = (typeof NUDGE_TABS)[number];

export function useNavNudges(isBrandNew: boolean) {
  // One hook call per tab, in a fixed order: the list is a constant, so this
  // is not a conditional hook.
  const major = useDismissibleFlag("nav-nudge:major");
  const certificate = useDismissibleFlag("nav-nudge:certificate");
  const simulator = useDismissibleFlag("nav-nudge:simulator");

  const flags = { major, certificate, simulator };

  /** Chips stay hidden until the flags have been read, so none of them flash. */
  const unvisited = new Set(
    NUDGE_TABS.filter((tab) => flags[tab].ready && flags[tab].show),
  );

  const markVisited = useCallback(
    (tabId: string) => {
      if ((NUDGE_TABS as readonly string[]).includes(tabId)) {
        flags[tabId as NudgeTab].dismiss();
      }
    },
    // The flag objects are stable per key apart from their state, and dismiss
    // is itself memoised, so keying on the three dismissers is enough.
    [flags.major.dismiss, flags.certificate.dismiss, flags.simulator.dismiss], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    /** Tabs whose chip should still show, for a brand-new account. */
    nudgeTabs: isBrandNew ? unvisited : new Set<NudgeTab>(),
    markVisited,
  };
}
