import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useDashboardNav() {
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

  // The AI advisor tab is gone. Anyone whose persisted tab still points at it
  // gets bounced to My courses instead of landing on an empty pane.
  useEffect(() => {
    if (activeTab === "cleoai") {
      setActiveTab("upload");
    }
  }, [activeTab, setActiveTab]);

  return {
    activeTab,
    setActiveTab,
    handleTabChange,
    simulatorNavCheck,
    registerSimulatorNavCheck,
  };
}
