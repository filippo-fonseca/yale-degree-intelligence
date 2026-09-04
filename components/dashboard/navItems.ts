import type { ComponentType } from "react";
import { FiBarChart2, FiUsers } from "react-icons/fi";
import { HiDocumentDuplicate } from "react-icons/hi";
import { RiProgress3Fill, RiAwardFill } from "react-icons/ri";
import { FaBuildingCircleCheck } from "react-icons/fa6";
import { MonitorCog } from "lucide-react";

export interface NavItem {
  id: string;
  icon: ComponentType<any>;
  label: string;
  disabled?: boolean;
  comingSoon?: boolean;
  /** Short chip shown for Class of 2030 (and similar) welcome nudges. */
  badge?: string;
  /** Small count bubble (unread notifications); hidden when 0 or undefined. */
  bubbleCount?: number;
}

export function createNavItems(
  majorsCount: number,
  certificatesCount: number,
  options?: {
    /** Tabs whose "2030 can use!" chip has not been retired by a visit yet. */
    nudgeTabs?: ReadonlySet<string>;
    showCertificatesNew?: boolean;
    /** Unread friend-activity notifications, bubbled on the Friends tab. */
    friendsBubbleCount?: number;
  },
): NavItem[] {
  const nudge = (tabId: string) =>
    options?.nudgeTabs?.has(tabId) ? "2030 can use!" : undefined;
  return [
    {
      id: "upload",
      icon: HiDocumentDuplicate,
      label: "My courses",
      disabled: false,
    },
    {
      id: "major",
      icon: RiProgress3Fill,
      label: majorsCount > 1 ? "My majors" : "My major",
      badge: nudge("major"),
    },
    {
      // Always plural. The tab is where you pick up certificates as much as
      // where you track them, so it read oddly as "My certificate" for anyone
      // holding exactly one, and it flickered between labels on add/remove.
      id: "certificate",
      icon: RiAwardFill,
      label: "My certificates",
      // Falls back to the 2030 nudge if that is running, so a single slot never
      // has to show two chips.
      badge: nudge("certificate") ?? (options?.showCertificatesNew ? "New" : undefined),
    },
    {
      id: "simulator",
      icon: MonitorCog,
      label: "Simulator",
      badge: nudge("simulator"),
    },
    {
      id: "stats",
      icon: FiBarChart2,
      label: "Academic stats",
    },
    {
      id: "friends",
      icon: FiUsers,
      label: "Friends",
      bubbleCount: options?.friendsBubbleCount,
    },
    {
      id: "distributionals",
      icon: FaBuildingCircleCheck,
      label: "Distributionals",
    },
  ];
}
