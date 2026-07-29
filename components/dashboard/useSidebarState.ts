import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useSidebarState() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useLocalStorage<boolean>(
    "di-sidebar-pinned",
    true,
  );
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered;

  return {
    sidebarOpen,
    setSidebarOpen,
    sidebarPinned,
    setSidebarPinned,
    sidebarHovered,
    setSidebarHovered,
    sidebarExpanded,
  };
}
