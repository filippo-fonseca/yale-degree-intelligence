import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

// Onboarding flags stored on the user's Firestore profile. These gate one-time
// UI like the v3 welcome modal and the guided tour so they don't re-appear.
export type UserFlag = "hasSeenTutorial" | "hasSeenV3Welcome";

export async function setUserFlag(
  uid: string,
  flag: UserFlag,
  value: boolean = true,
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    { [flag]: value, updatedAt: new Date() },
    { merge: true },
  );
}
