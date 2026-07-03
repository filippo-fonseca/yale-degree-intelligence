import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebaseAdmin";
import { isAdminEmail } from "@/lib/admin";
import { gradePoints } from "@/lib/constants";

type AnyRecord = Record<string, any>;

const toDateValue = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value instanceof Date) return value;
  return null;
};

const round = (value: number, digits = 1) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;

const sortEntries = (data: Record<string, number>, limit?: number) => {
  const entries = Object.entries(data)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return typeof limit === "number" ? entries.slice(0, limit) : entries;
};

async function requireAdmin(req: NextRequest) {
  if (!adminAuth) return null;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
    if (isAdminEmail(decoded.email)) return decoded;

    const user = await adminAuth.getUser(decoded.uid);
    return isAdminEmail(user.email) ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    usersSnap,
    coursesSnap,
    friendsPublicSnap,
    friendsSnap,
    conversationsSnap,
  ] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("courses").get(),
    adminDb.collection("friends_public_data").get(),
    adminDb.collection("friends").get(),
    adminDb.collection("conversations").get(),
  ]);

  const users: AnyRecord[] = usersSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as AnyRecord),
  }));
  const courses: AnyRecord[] = coursesSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as AnyRecord),
  }));
  const friendsPublic = friendsPublicSnap.docs.map((doc) => doc.data() as AnyRecord);
  const conversations = conversationsSnap.docs.map((doc) => doc.data() as AnyRecord);

  const coursesByUser: Record<string, AnyRecord[]> = {};
  const courseStatusCounts: Record<string, number> = {};
  const departmentCounts: Record<string, number> = {};
  const departmentCredits: Record<string, number> = {};
  const gradeDistribution: Record<string, number> = {};
  const distributionalCounts: Record<string, number> = {};
  let totalCredits = 0;
  let completedCourses = 0;
  let inProgressCourses = 0;
  let skippedCourses = 0;
  let gradedCourses = 0;
  let totalGradePoints = 0;
  let gradedCredits = 0;

  for (const course of courses) {
    const uid = course.userId || "unknown";
    if (!coursesByUser[uid]) coursesByUser[uid] = [];
    coursesByUser[uid].push(course);

    const status = course.skipped ? "skipped" : course.status || "unknown";
    courseStatusCounts[status] = (courseStatusCounts[status] || 0) + 1;
    if (status === "completed") completedCourses += 1;
    if (status === "in-progress") inProgressCourses += 1;
    if (status === "skipped") skippedCourses += 1;

    const credits = typeof course.credits === "number" ? course.credits : 0;
    if (!course.skipped) totalCredits += credits;

    const dept = typeof course.code === "string" ? course.code.split(" ")[0] : "Unknown";
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    departmentCredits[dept] = (departmentCredits[dept] || 0) + credits;

    if (course.grade && gradePoints[course.grade] !== undefined && !course.skipped) {
      gradedCourses += 1;
      gradedCredits += credits;
      totalGradePoints += gradePoints[course.grade] * (credits || 1);
      gradeDistribution[course.grade] = (gradeDistribution[course.grade] || 0) + 1;
    }

    for (const dist of course.distributionals || []) {
      distributionalCounts[dist] = (distributionalCounts[dist] || 0) + 1;
    }
  }

  const majorCounts: Record<string, number> = {};
  const majorSlotsByUser: number[] = [];
  const graduationYearCounts: Record<string, number> = {};
  let profileCompleteUsers = 0;
  let usersWithBio = 0;
  let tutorialSeen = 0;
  let welcomeSeen = 0;
  let danWriteEnabled = 0;

  for (const user of users) {
    const majors = Array.isArray(user.majors) ? user.majors : [];
    majorSlotsByUser.push(majors.length);
    if (majors.length > 0 && user.graduationYear) profileCompleteUsers += 1;
    if (typeof user.bio === "string" && user.bio.trim()) usersWithBio += 1;
    if (user.hasSeenTutorial) tutorialSeen += 1;
    if (user.hasSeenV3Welcome) welcomeSeen += 1;
    if (user.danWriteActionsEnabled) danWriteEnabled += 1;
    if (user.graduationYear) {
      const label = String(user.graduationYear);
      graduationYearCounts[label] = (graduationYearCounts[label] || 0) + 1;
    }
    for (const major of majors) {
      majorCounts[major] = (majorCounts[major] || 0) + 1;
    }
  }

  const coursesPerUser = Object.values(coursesByUser).map((items) => items.length);
  const usersWithCourses = coursesPerUser.length;
  const totalUsers = users.length;
  const totalMajorSlots = majorSlotsByUser.reduce((sum, count) => sum + count, 0);
  const friendsEnabledUsers = friendsPublic.filter((doc) => doc.enabled).length;
  const totalMessages = conversations.reduce(
    (sum, convo) => sum + (Array.isArray(convo.messages) ? convo.messages.length : 0),
    0,
  );

  const recentUsers = users
    .map((user) => {
      const updatedAt = toDateValue(user.updatedAt);
      return {
        id: user.id,
        displayName: user.displayName || user.email?.split("@")[0] || "Unknown",
        email: user.email || null,
        majors: Array.isArray(user.majors) ? user.majors : [],
        graduationYear: user.graduationYear || null,
        courseCount: coursesByUser[user.id]?.length || 0,
        updatedAt: updatedAt?.toISOString() || null,
      };
    })
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 12);

  const heaviestCourseLoads = Object.entries(coursesByUser)
    .map(([uid, items]) => {
      const profile = users.find((user) => user.id === uid);
      return {
        id: uid,
        displayName: profile?.displayName || profile?.email?.split("@")[0] || uid,
        email: profile?.email || null,
        courseCount: items.length,
      };
    })
    .sort((a, b) => b.courseCount - a.courseCount)
    .slice(0, 8);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    overview: {
      totalUsers,
      usersWithCourses,
      usersWithoutCourses: Math.max(totalUsers - usersWithCourses, 0),
      totalCourses: courses.length,
      completedCourses,
      inProgressCourses,
      skippedCourses,
      gradedCourses,
      totalCredits: round(totalCredits, 1),
      totalMajorSlots,
      averageCoursesPerUser: round(courses.length / Math.max(totalUsers, 1), 1),
      averageCoursesPerActiveUser: round(courses.length / Math.max(usersWithCourses, 1), 1),
      averageMajorsPerUser: round(totalMajorSlots / Math.max(totalUsers, 1), 2),
      averageCreditsPerActiveUser: round(totalCredits / Math.max(usersWithCourses, 1), 1),
      averageGpaAcrossGradedCourses: round(totalGradePoints / Math.max(gradedCredits, 1), 2),
      profileCompletionRate: round((profileCompleteUsers / Math.max(totalUsers, 1)) * 100, 1),
      friendsEnabledUsers,
      friendsEnabledRate: round((friendsEnabledUsers / Math.max(totalUsers, 1)) * 100, 1),
      friendshipCount: friendsSnap.size,
      conversationCount: conversationsSnap.size,
      averageMessagesPerConversation: round(totalMessages / Math.max(conversationsSnap.size, 1), 1),
      usersWithBio,
      tutorialSeen,
      welcomeSeen,
      danWriteEnabled,
    },
    distributions: {
      courseStatuses: sortEntries(courseStatusCounts),
      graduationYears: sortEntries(graduationYearCounts),
      majors: sortEntries(majorCounts, 12),
      departmentsByCourses: sortEntries(departmentCounts, 12),
      departmentsByCredits: sortEntries(departmentCredits, 12),
      grades: sortEntries(gradeDistribution),
      distributionals: sortEntries(distributionalCounts),
    },
    users: {
      recent: recentUsers,
      heaviestCourseLoads,
    },
  });
}
