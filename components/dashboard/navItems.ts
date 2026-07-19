import type { ComponentType } from "react";
import { FiBarChart2, FiUsers } from "react-icons/fi";
import { HiDocumentDuplicate } from "react-icons/hi";
import { RiProgress3Fill } from "react-icons/ri";
import { FaBuildingCircleCheck } from "react-icons/fa6";
import { MonitorCog } from "lucide-react";
import LogoIcon from "@/icons/LogoIcon";

export interface NavItem {
  id: string;
  icon: ComponentType<any>;
  label: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export function createNavItems(
  majorsCount: number,
): NavItem[] {
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
    },
    {
      id: "simulator",
      icon: MonitorCog,
      label: "Simulator",
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
      id: "cleoai",
      icon: LogoIcon,
      label: "Dan",
      comingSoon: true,
    },
    {
      id: "distributionals",
      icon: FaBuildingCircleCheck,
      label: "Distributionals",
    },
  ];
}
