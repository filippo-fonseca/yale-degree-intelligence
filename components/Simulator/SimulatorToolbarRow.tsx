"use client";

import { AnimatePresence } from "framer-motion";
import SimulatorViewSwitcher, {
  type SimulatorView,
} from "./SimulatorViewSwitcher";
import SimulatorPlanSelector from "./SimulatorPlanSelector";
import SimulatorQuickSave, { type QuickSaveState } from "./SimulatorQuickSave";

/**
 * The simulator's sticky toolbar, as two stacked rows that read as a hierarchy.
 *
 * Row one is the plan: the selector leads and takes the width, with quick save
 * appearing beside it the moment the canvas drifts from the stored plan. The
 * plan is the overarching structure, so it sits above everything it governs.
 * Row two is the pair of views onto that plan, deliberately smaller. Both rows
 * stay on both views, because the Progress readouts are scoped to whichever
 * plan is loaded and have to be readable and switchable from there too.
 *
 * Two compact rows, not two toolbars: the whole thing is about a hundred pixels
 * tall, and the pool below it measures the real height rather than guessing.
 */
export default function SimulatorToolbarRow({
  view,
  setView,
  showProgressNew = false,
  planName,
  planIsDefault,
  hasChanges,
  planSelectorDisabled = false,
  onOpenPlans,
  showQuickSave,
  quickSaveState,
  onQuickSave,
}: {
  view: SimulatorView;
  setView: (view: SimulatorView) => void;
  showProgressNew?: boolean;
  planName: string | null;
  planIsDefault: boolean;
  hasChanges: boolean;
  planSelectorDisabled?: boolean;
  onOpenPlans: () => void;
  /** Mounts the quick save button; the parent gates it on session and dirt. */
  showQuickSave: boolean;
  quickSaveState: QuickSaveState;
  onQuickSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5" data-sim-toolbar-row>
      <div className="flex items-center gap-2" data-sim-toolbar-plan-row>
        <div className="flex-1 min-w-0">
          <SimulatorPlanSelector
            planName={planName}
            isDefault={planIsDefault}
            hasChanges={hasChanges}
            disabled={planSelectorDisabled}
            onOpen={onOpenPlans}
          />
        </div>
        <AnimatePresence initial={false}>
          {showQuickSave && (
            <SimulatorQuickSave state={quickSaveState} onSave={onQuickSave} />
          )}
        </AnimatePresence>
      </div>
      <div data-sim-toolbar-view-row>
        <SimulatorViewSwitcher
          view={view}
          setView={setView}
          showProgressNew={showProgressNew}
        />
      </div>
    </div>
  );
}
