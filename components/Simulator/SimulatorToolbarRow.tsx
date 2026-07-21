"use client";

import SimulatorViewSwitcher, {
  type SimulatorView,
} from "./SimulatorViewSwitcher";
import SimulatorPlanSelector from "./SimulatorPlanSelector";

/**
 * The simulator's sticky toolbar, as one horizontal row.
 *
 * Two peers: the Canvas/Progress switcher and the plan selector. The selector
 * is deliberately not a third segment, because it is a different kind of
 * control. Both stay on both views: the Progress readouts are scoped to
 * whichever plan is loaded, so the plan has to be readable and switchable from
 * there too. At 390px the two stack, switcher first.
 */
export default function SimulatorToolbarRow({
  view,
  setView,
  planName,
  planIsDefault,
  hasChanges,
  planSelectorDisabled = false,
  onOpenPlans,
}: {
  view: SimulatorView;
  setView: (view: SimulatorView) => void;
  planName: string | null;
  planIsDefault: boolean;
  hasChanges: boolean;
  planSelectorDisabled?: boolean;
  onOpenPlans: () => void;
}) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
      data-sim-toolbar-row
    >
      <SimulatorViewSwitcher view={view} setView={setView} />
      <div className="sm:ml-auto min-w-0 sm:max-w-sm w-full sm:w-auto">
        <SimulatorPlanSelector
          planName={planName}
          isDefault={planIsDefault}
          hasChanges={hasChanges}
          disabled={planSelectorDisabled}
          onOpen={onOpenPlans}
        />
      </div>
    </div>
  );
}
