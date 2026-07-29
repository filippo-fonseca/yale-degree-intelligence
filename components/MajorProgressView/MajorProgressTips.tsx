"use client";

import { InfoCard } from "../ui/InfoCard";
import MajorTipModal, {
  MajorTipHelpButton,
  resetMajorTipSeen,
} from "./MajorTipModal";

export default function MajorProgressTips({
  forceMajorTipOpen,
  setForceMajorTipOpen,
}: {
  forceMajorTipOpen: boolean;
  setForceMajorTipOpen: (open: boolean) => void;
}) {
  return (
    <>
      <MajorTipHelpButton
        onClick={() => {
          resetMajorTipSeen("myMajorTipModalShown");
          setForceMajorTipOpen(true);
        }}
      />

      <MajorTipModal
        storageKey="myMajorTipModalShown"
        autoOpenOnMount
        forceOpen={forceMajorTipOpen}
        onDismiss={() => setForceMajorTipOpen(false)}
      />

      <div className="p-1" data-tour="major-manual-tip">
        <InfoCard
          autoHide
          previewText="A few tips on how to navigate this page. It's complex at first, we get it!"
        >
          Pro tip: Click on each course for actions and more info. Also, while
          our infrastructure is robust, sometimes there are cases where we
          weren't able to garner all plausible options for a given requirement;
          this is why we have enabled manual course fulfillment. Just click on
          the "Fulfill manually" button for that requirement and add a course
          from your transcript; we'll automatically count it towards your major
          progress and requirements stats. This also applies, for example, for
          interdepartmental courses and/or exceptions that your DUS has perhaps
          given you permission to use for a certain requirement, etc. Our
          platform is modular!
        </InfoCard>
      </div>
    </>
  );
}
