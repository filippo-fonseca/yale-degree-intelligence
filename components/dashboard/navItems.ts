import type { ComponentType } from "react";
import { FiBarChart2, FiUsers } from "react-icons/fi";
import { HiDocumentDuplicate } from "react-icons/hi";
import { RiProgress3Fill, RiAwardFill } from "react-icons/ri";
import { FaBuildingCircleCheck } from "react-icons/fa6";
import { MonitorCog } from "lucide-react";
import LogoIcon from "@/icons/LogoIcon";

export interface NavItem {
  id: string;
  icon: ComponentType<any>;
  label: string;
  disabled?: boolean;
  comingSoon?: boolean;
  /** Short chip shown for Class of 2030 (and similar) welcome nudges. */
  badge?: string;
}

/**
 * Dan advisor is hidden for the v3 launch. Flip to true to put the tab back;
 * useDashboardNav bounces anyone whose persisted tab still points at it.
 */
export const SHOW_DAN_ADVISOR = false;

export function createNavItems(
  majorsCount: number,
  certificatesCount: number,
  options?: { isBrandNew?: boolean },
): NavItem[] {
  const brandNewBadge = options?.isBrandNew ? "2030 can use!" : undefined;
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
      badge: brandNewBadge,
    },
    {
      id: "certificate",
      icon: RiAwardFill,
      label: certificatesCount === 1 ? "My certificate" : "My certificates",
    },
    {
      id: "simulator",
      icon: MonitorCog,
      label: "Simulator",
      badge: brandNewBadge,
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
    },
    ...(SHOW_DAN_ADVISOR
      ? [
          {
            id: "cleoai",
            icon: LogoIcon,
            label: "Dan",
            comingSoon: true,
          },
        ]
      : []),
    {
      id: "distributionals",
      icon: FaBuildingCircleCheck,
      label: "Distributionals",
    },
  ];
}
