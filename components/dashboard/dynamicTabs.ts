import dynamic from "next/dynamic";
import { createElement } from "react";

export const TabFallback = () =>
  createElement(
    "div",
    {
      className:
        "flex items-center justify-center py-24 text-sm text-gray-400 dark:text-gray-500",
    },
    "Loading…",
  );

export const MyCoursesView = dynamic(() => import("@/components/MyCoursesView"), {
  ssr: false,
  loading: TabFallback,
});
export const StatsView = dynamic(() => import("@/components/StatsView"), {
  ssr: false,
  loading: TabFallback,
});
export const MajorProgressView = dynamic(
  () => import("@/components/MajorProgressView"),
  { ssr: false, loading: TabFallback },
);
export const CertificateProgressView = dynamic(
  () => import("@/components/CertificateProgressView"),
  { ssr: false, loading: TabFallback },
);
export const DistributionalsView = dynamic(
  () => import("@/components/DistributionalProgress"),
  { ssr: false, loading: TabFallback },
);
export const FriendsTab = dynamic(() => import("@/components/FriendsTab/FriendsTab"), {
  ssr: false,
  loading: TabFallback,
});
export const Simulator = dynamic(() => import("@/components/Simulator/Simulator"), {
  ssr: false,
  loading: TabFallback,
});
export const CleoAITab = dynamic(() => import("@/components/CleoAITab/CleoAITab"), {
  ssr: false,
  loading: TabFallback,
});
export const MajorSelectionFlow = dynamic(
  () => import("@/components/MajorSelectionFlow"),
  { ssr: false },
);
