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
}

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
    {
      id: "distributionals",
      icon: FaBuildingCircleCheck,
      label: "Distributionals",
    },
  ];
}
