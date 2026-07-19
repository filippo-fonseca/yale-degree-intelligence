"use client";

import { useEffect, useState } from "react";

export function useMajorViewPreferences() {
  const [showInProgressStats, setShowInProgressStats] = useState(false);
  const [view, setView] = useState<"board" | "heatmap">("board");
  const [mobileColumn, setMobileColumn] = useState<
    "remaining" | "inProgress" | "completed"
  >("remaining");

  useEffect(() => {
    const saved = window.localStorage.getItem("myMajorView");
    if (saved === "board" || saved === "heatmap") setView(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("myMajorView", view);
  }, [view]);

  return {
    showInProgressStats,
    setShowInProgressStats,
    view,
    setView,
    mobileColumn,
    setMobileColumn,
  };
}
