import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useDashboardNav(cleoaiUnreachable: boolean) {
  const [activeTab, setActiveTab] = useLocalStorage(
    "dashboardActiveTab",
    "upload",
  );

  const [simulatorNavCheck, setSimulatorNavCheck] = useState<
    ((callback: () => void) => void) | null
  >(null);

  // The simulator registers a FUNCTION as the nav check. Passing it straight
  // into the state setter would make React call it as an updater (with the
  // previous state as its "proceed" argument), so wrap it.
  const registerSimulatorNavCheck = useCallback(
    (check: ((callback: () => void) => void) | null) => {
      setSimulatorNavCheck(() => check);
    },
    [],
  );

  const handleTabChange = (newTab: string) => {
    if (activeTab === "simulator" && simulatorNavCheck) {
      simulatorNavCheck(() => {
        setActiveTab(newTab);
      });
    } else {
      setActiveTab(newTab);
    }
  };

  // Bounce anyone whose persisted tab still points at a tab they cannot reach
  // (Dan is hidden for the v3 launch) so they do not land on an empty pane.
  useEffect(() => {
    if (cleoaiUnreachable && activeTab === "cleoai") {
      setActiveTab("upload");
    }
  }, [cleoaiUnreachable, activeTab, setActiveTab]);

  return {
    activeTab,
    setActiveTab,
    handleTabChange,
    simulatorNavCheck,
    registerSimulatorNavCheck,
  };
}
