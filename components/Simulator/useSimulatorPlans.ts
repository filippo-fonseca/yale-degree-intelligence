import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Course } from "@/lib/types";
import { codesReferToSameCourse } from "@/lib/courseCatalog";
import { ManualRequirementEntry } from "@/lib/majors";
import toast from "react-hot-toast";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { Plan, Semester } from "./simulatorTypes";

export interface UseSimulatorPlansOptions {
  user: { uid: string } | null | undefined;
  semesters: Semester[];
  setSemesters: React.Dispatch<React.SetStateAction<Semester[]>>;
  simulatorManualReqs: ManualRequirementEntry[];
  setSimulatorManualReqs: React.Dispatch<
    React.SetStateAction<ManualRequirementEntry[]>
  >;
  remainingCourses: Course[];
  completedCourses: Course[];
  setAvailableCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  onRegisterNavCheck?: (fn: ((cb: () => void) => void) | null) => void;
}

export function useSimulatorPlans({
  user,
  semesters,
  setSemesters,
  simulatorManualReqs,
  setSimulatorManualReqs,
  remainingCourses,
  completedCourses,
  setAvailableCourses,
  onRegisterNavCheck,
}: UseSimulatorPlansOptions) {
  const [savedPlans, setSavedPlans] = useState<Plan[]>([]);
  const [planName, setPlanName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedPlanToOverwrite, setSelectedPlanToOverwrite] = useState<
    number | null
  >(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDistributionals, setShowDistributionals] = useState(false);
  const [showGrades, setShowGrades] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);
  const [distribAutoAllocate, setDistribAutoAllocate] = useState(true);
  const [distribOverrides, setDistribOverrides] = useState<
    Record<string, string>
  >({});

  const initialSemestersRef = useRef<Semester[]>([]);
  const initialManualReqsRef = useRef<ManualRequirementEntry[]>([]);
  const initialTogglesRef = useRef<{ dist: boolean; grades: boolean }>({
    dist: false,
    grades: false,
  });
  const planLoadedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasChangesRef = useRef(false);
  const currentPlanNameRef = useRef<string | null>(null);

  const loadedPlanIndex = useMemo(
    () =>
      currentPlanName === null
        ? -1
        : savedPlans.findIndex((p) => p.name === currentPlanName),
    [currentPlanName, savedPlans],
  );
  const loadedPlanIsDefault =
    loadedPlanIndex >= 0 && !!savedPlans[loadedPlanIndex]?.isDefault;

  const loadPlanData = useCallback(
    (plan: Plan) => {
      planLoadedRef.current = true;
      setSemesters(plan.semesters);
      setSimulatorManualReqs(plan.manualRequirements ?? []);
      initialSemestersRef.current = JSON.parse(
        JSON.stringify(plan.semesters),
      ) as Semester[];
      initialManualReqsRef.current = JSON.parse(
        JSON.stringify(plan.manualRequirements ?? []),
      ) as ManualRequirementEntry[];

      setShowDistributionals(plan.showDistributionals ?? false);
      setShowGrades(plan.showGrades ?? false);
      initialTogglesRef.current = {
        dist: plan.showDistributionals ?? false,
        grades: plan.showGrades ?? false,
      };

      const usedCodes = new Set<string>();
      plan.semesters.forEach((sem) =>
        sem.courses.forEach((course) => usedCodes.add(course.code)),
      );

      setAvailableCourses(
        remainingCourses.filter(
          (c) =>
            !usedCodes.has(c.code) &&
            !completedCourses.some((cc) =>
              codesReferToSameCourse(cc.code, c.code),
            ),
        ),
      );

      setCurrentPlanName(plan.name);
      setHasChanges(false);
      try {
        if (user)
          window.localStorage.setItem(`di-sim-recent-${user.uid}`, plan.name);
      } catch {
        // ignore
      }
    },
    [
      user,
      remainingCourses,
      completedCourses,
      setSemesters,
      setSimulatorManualReqs,
      setAvailableCourses,
    ],
  );

  const confirmDiscardChanges = useCallback(
    (message: string): boolean => {
      if (!hasChanges) return true;
      return window.confirm(message);
    },
    [hasChanges],
  );

  const savePlan = useCallback(async () => {
    if (!user || !planName.trim()) return;
    try {
      const savedName = planName.trim();
      const isDefault =
        selectedPlanToOverwrite !== null
          ? (savedPlans[selectedPlanToOverwrite]?.isDefault ?? false)
          : savedPlans.length === 0;
      const newPlan: Plan = {
        name: savedName,
        semesters,
        manualRequirements: simulatorManualReqs,
        createdAt: new Date().toISOString(),
        isDefault,
        showDistributionals,
        showGrades,
      };

      const updatedPlans: Plan[] =
        selectedPlanToOverwrite !== null
          ? savedPlans.map((p, i) =>
              i === selectedPlanToOverwrite ? newPlan : p,
            )
          : [...savedPlans, newPlan];

      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true },
      );
      setSavedPlans(updatedPlans);
      loadPlanData(newPlan);

      setPlanName("");
      setSelectedPlanToOverwrite(null);
      setShowSaveModal(false);
      toast.success(`Plan "${savedName}" saved!`);
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Failed to save plan");
    }
  }, [
    user,
    planName,
    selectedPlanToOverwrite,
    savedPlans,
    semesters,
    simulatorManualReqs,
    showDistributionals,
    showGrades,
    loadPlanData,
  ]);

  const loadPlan = useCallback(
    (planIndex: number) => {
      if (planIndex < 0 || planIndex >= savedPlans.length) return;
      if (
        !confirmDiscardChanges(
          "You have unsaved changes. Discard them and load this plan?",
        )
      ) {
        return;
      }
      const plan = savedPlans[planIndex];
      loadPlanData(plan);
      setShowPlansModal(false);
    },
    [savedPlans, confirmDiscardChanges, loadPlanData],
  );

  const setDefaultPlan = useCallback(
    async (planIndex: number) => {
      if (!user || planIndex < 0 || planIndex >= savedPlans.length) return;
      try {
        const updatedPlans = savedPlans.map((p, i) => ({
          ...p,
          isDefault: i === planIndex,
        }));
        await setDoc(
          doc(db, "users", user.uid),
          { savedPlans: updatedPlans },
          { merge: true },
        );
        setSavedPlans(updatedPlans);
        toast.success(
          `"${savedPlans[planIndex].name}" is now your default plan`,
        );
      } catch (error) {
        console.error("Error setting default plan:", error);
        toast.error("Failed to set default plan");
      }
    },
    [user, savedPlans],
  );

  const deletePlan = useCallback(
    async (planIndex: number) => {
      if (!user || planIndex < 0 || planIndex >= savedPlans.length) return;
      const name = savedPlans[planIndex].name;
      if (!window.confirm(`Delete plan "${name}"? This cannot be undone.`)) {
        return;
      }
      try {
        const updatedPlans = savedPlans.filter((_, i) => i !== planIndex);
        await setDoc(
          doc(db, "users", user.uid),
          { savedPlans: updatedPlans },
          { merge: true },
        );
        setSavedPlans(updatedPlans);
      } catch (e) {
        console.error("Error deleting plan:", e);
      }
    },
    [user, savedPlans],
  );

  const resetSimulator = useCallback(() => {
    if (
      !confirmDiscardChanges(
        "You have unsaved changes. Clear the canvas and discard them?",
      )
    ) {
      return;
    }

    const clearedSemesters = semesters.map((sem) => ({
      ...sem,
      courses: sem.courses.filter(
        (c) => c.status === "completed" || c.status === "in-progress",
      ),
    }));

    setSemesters(clearedSemesters);
    setAvailableCourses(
      remainingCourses.filter(
        (rc) =>
          !completedCourses.some((cc) =>
            codesReferToSameCourse(cc.code, rc.code),
          ) &&
          rc.status === "not-taken",
      ),
    );
    setSimulatorManualReqs([]);
    setShowDistributionals(false);
    setShowGrades(false);
    initialSemestersRef.current = JSON.parse(
      JSON.stringify(clearedSemesters),
    ) as Semester[];
    initialManualReqsRef.current = [];
    initialTogglesRef.current = { dist: false, grades: false };
    setCurrentPlanName(null);
    planLoadedRef.current = false;
    setHasChanges(false);
  }, [
    confirmDiscardChanges,
    semesters,
    remainingCourses,
    completedCourses,
    setSemesters,
    setAvailableCourses,
    setSimulatorManualReqs,
  ]);

  useEffect(() => {
    if (!onRegisterNavCheck) return;
    onRegisterNavCheck((proceed) => {
      if (hasChanges) {
        if (
          window.confirm(
            "You have unsaved simulator changes. Leave without saving?",
          )
        ) {
          proceed();
        }
      } else {
        proceed();
      }
    });
    return () => onRegisterNavCheck(null);
  }, [onRegisterNavCheck, hasChanges]);

  useEffect(() => {
  }, [hasChanges]);

  useEffect(() => {
    currentPlanNameRef.current = currentPlanName;
  }, [currentPlanName]);

  useEffect(() => {
    if (initialSemestersRef.current.length === 0) return;

    const placementKey = (s: Semester, c: Course) =>
      `${s.id}:${c.code}:${c.grade ?? ""}:${[...(c.distributionals ?? [])]
        .sort()
        .join("+")}`;

    const currentPlacements = new Set(
      semesters.flatMap((s) =>
        s.courses
          .filter((c) => c.status === "not-taken")
          .map((c) => placementKey(s, c)),
      ),
    );
    const initialPlacements = new Set(
      initialSemestersRef.current.flatMap((s) =>
        s.courses
          .filter((c) => c.status === "not-taken")
          .map((c) => placementKey(s, c)),
      ),
    );

    const placementsChanged =
      currentPlacements.size !== initialPlacements.size ||
      Array.from(currentPlacements).some((p) => !initialPlacements.has(p)) ||
      Array.from(initialPlacements).some((p) => !currentPlacements.has(p));

    const currentManualReqsStr = JSON.stringify(simulatorManualReqs);
    const initialManualReqsStr = JSON.stringify(initialManualReqsRef.current);
    const manualReqsChanged = currentManualReqsStr !== initialManualReqsStr;

    const togglesChanged =
      showDistributionals !== initialTogglesRef.current.dist ||
      showGrades !== initialTogglesRef.current.grades;

    const changed = placementsChanged || manualReqsChanged || togglesChanged;

    setHasChanges(changed);
  }, [semesters, simulatorManualReqs, showDistributionals, showGrades]);

  useEffect(() => {
    if (!user) return;
    const loadSavedPlans = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists()
          ? (docSnap.data() as {
              savedPlans?: Plan[];
              distributionalAutoAllocate?: boolean;
              distributionalAllocations?: Record<string, string>;
            })
          : null;
        setDistribAutoAllocate(data?.distributionalAutoAllocate ?? true);
        setDistribOverrides(data?.distributionalAllocations ?? {});
        let plans = data?.savedPlans ?? [];
        if (plans.length > 0) {
          if (!plans.some((p) => p.isDefault)) {
            const newestName = [...plans].sort((a, b) =>
              (b.createdAt || "").localeCompare(a.createdAt || ""),
            )[0]?.name;
            plans = plans.map((p) => ({
              ...p,
              isDefault: p.name === newestName,
            }));
            await setDoc(docRef, { savedPlans: plans }, { merge: true });
          }
          setSavedPlans(plans);
          let recentName: string | null = null;
          try {
            recentName = window.localStorage.getItem(
              `di-sim-recent-${user.uid}`,
            );
          } catch {
            // ignore
          }
          const newest = [...plans].sort((a, b) =>
            (b.createdAt || "").localeCompare(a.createdAt || ""),
          )[0];
          const toLoad =
            plans.find((p) => p.name === recentName) ||
            plans.find((p) => p.isDefault) ||
            newest;
          if (toLoad) loadPlanData(toLoad);
        } else {
          setShowPlanSelector(true);
        }
        setPlansLoaded(true);
      } catch (e) {
        console.error("Error loading saved plans:", e);
        setPlansLoaded(true);
      }
    };
    loadSavedPlans();
  }, [user, loadPlanData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showPlanSelector) setShowPlanSelector(false);
        if (showSaveModal) {
          setShowSaveModal(false);
          setSelectedPlanToOverwrite(null);
          setPlanName("");
        }
        if (showPlansModal) setShowPlansModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPlanSelector, showSaveModal, showPlansModal]);

  return {
    savedPlans,
    planName,
    setPlanName,
    showSaveModal,
    setShowSaveModal,
    showPlansModal,
    setShowPlansModal,
    selectedPlanToOverwrite,
    setSelectedPlanToOverwrite,
    hasChanges,
    showDistributionals,
    setShowDistributionals,
    showGrades,
    setShowGrades,
    showPlanSelector,
    setShowPlanSelector,
    plansLoaded,
    currentPlanName,
    distribAutoAllocate,
    distribOverrides,
    loadedPlanIndex,
    loadedPlanIsDefault,
    initialSemestersRef,
    initialManualReqsRef,
    planLoadedRef,
    hasInitializedRef,
    hasChangesRef,
    currentPlanNameRef,
    loadPlanData,
    savePlan,
    loadPlan,
    setDefaultPlan,
    deletePlan,
    resetSimulator,
    confirmDiscardChanges,
  };
}
