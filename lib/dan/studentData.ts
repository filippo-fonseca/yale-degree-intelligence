import { adminDb } from "@/config/firebaseAdmin";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import type { StudentData } from "@/lib/dan/tools";

// Assembles the server-trusted student snapshot from Firestore. Shared by the
// Dan chat route and the per-user MCP server so both read the same source of
// truth (never anything the client sends). Server-only.
export async function buildStudentData(uid: string): Promise<{
  student: StudentData;
  snapshot: string;
  name: string | null;
}> {
  if (!adminDb) throw new Error("Admin SDK not configured");

  const [coursesSnap, userSnap] = await Promise.all([
    adminDb.collection("courses").where("userId", "==", uid).get(),
    adminDb.collection("users").doc(uid).get(),
  ]);

  const profile = userSnap.exists ? userSnap.data()! : {};
  const majors: string[] = profile.majors || [];

  const courses = coursesSnap.docs.map((d) => {
    const c = d.data();
    return {
      code: c.code as string,
      name: getCourseNameFromCode(c.code) || c.code,
      status: (c.status as string) || "completed",
      credits: (c.credits as number) ?? 1,
      distributionals: (c.distributionals as string[]) || [],
      skipped: c.skipped === true || c.status === "skipped",
    };
  });

  const completedCodes = courses
    .filter((c) => c.status === "completed")
    .map((c) => c.code);
  const inProgressCodes = courses
    .filter((c) => c.status === "in-progress")
    .map((c) => c.code);
  const skippedCodes = courses.filter((c) => c.skipped).map((c) => c.code);

  const student: StudentData = {
    majors,
    completedCodes,
    inProgressCodes,
    skippedCodes,
    courses: courses.map(({ code, name, status, credits, distributionals }) => ({
      code,
      name,
      status,
      credits,
      distributionals,
    })),
  };

  const snapshot =
    `Student majors: ${majors.length ? majors.join(" + ") : "Undeclared"}` +
    `${majors.length > 1 ? " (double major)" : ""}. ` +
    `Courses: ${completedCodes.length} completed, ${inProgressCodes.length} in-progress, ` +
    `${skippedCodes.length} skipped. Grad year: ${profile.graduationYear || "unknown"}. ` +
    `Use tools for any specifics.`;

  return { student, snapshot, name: profile.name || null };
}
