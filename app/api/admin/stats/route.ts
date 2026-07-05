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

  // The true user total lives in Firebase Auth, not the Firestore `users`
  // collection (many auth users never create a profile doc). Count ALL auth
  // users via listUsers, which caps at 1000 per page, so loop on the page
  // token until it's exhausted. If listUsers fails for any reason, degrade
  // gracefully to the Firestore profile count rather than 500-ing the endpoint.
  const profilesCreated = users.length;
  let authUserCount = profilesCreated;
  try {
    let count = 0;
    let pageToken: string | undefined = undefined;
    do {
      const result = await adminAuth.listUsers(1000, pageToken);
      count += result.users.length;
      pageToken = result.pageToken;
    } while (pageToken);
    authUserCount = count;
  } catch (error) {
    console.error("Failed to list Firebase Auth users; falling back to Firestore profile count:", error);
    authUserCount = profilesCreated;
  }

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
    const hasBio = typeof user.bio === "string" && user.bio.trim().length > 0;
    // "Profile complete" is a single coherent completeness measure: the user
    // has at least one major AND a graduation year AND a non-empty bio. The
    // resulting profileCompletionRate below is this count over profilesCreated
    // (you can't have a complete Firestore profile without a doc), so the
    // number and its subtext are self-consistent.
    if (majors.length > 0 && user.graduationYear && hasBio) profileCompleteUsers += 1;
    if (hasBio) usersWithBio += 1;
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
  // Headline user total is the true Firebase Auth count; per-user aggregations
  // below stay driven by the Firestore `users` docs (profilesCreated), since
  // those are the only users we have profile/course data for.
  const totalUsers = authUserCount;
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

  // Signups bucketed by ISO week (Monday start, UTC) for a users-over-time
  // chart. Prefer createdAt; fall back to updatedAt for legacy docs written
  // before createdAt existed. Docs with no usable timestamp are skipped. The
  // timeline is densified so every week between the first and last populated
  // week is emitted (count 0 for empty weeks) for an evenly-spaced time axis;
  // the span is clamped to avoid emitting an absurd number of weeks if legacy
  // timestamps are wildly out of range.
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const MAX_WEEKS = 260; // ~5 years of weekly points; clamp densification here.

  // Monday-00:00:00 UTC of the week containing `date`, as ms since epoch.
  const weekStartUtcMs = (date: Date): number => {
    const d = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const dow = d.getUTCDay(); // 0=Sun..6=Sat
    const diffToMonday = (dow + 6) % 7; // days since Monday
    return d.getTime() - diffToMonday * 24 * 60 * 60 * 1000;
  };
  const isoWeekKey = (ms: number): string =>
    new Date(ms).toISOString().slice(0, 10); // "YYYY-MM-DD"

  const weeklyNewUsers = new Map<number, number>();
  for (const user of users) {
    const stamp = toDateValue(user.createdAt) || toDateValue(user.updatedAt);
    if (!stamp) continue;
    const ms = weekStartUtcMs(stamp);
    weeklyNewUsers.set(ms, (weeklyNewUsers.get(ms) || 0) + 1);
  }

  let usersOverTime: { weekStart: string; count: number; cumulative: number }[] = [];
  if (weeklyNewUsers.size > 0) {
    const populated = Array.from(weeklyNewUsers.keys()).sort((a, b) => a - b);
    let firstWeek = populated[0];
    const lastWeek = populated[populated.length - 1];
    // Clamp the densified range so we never emit more than MAX_WEEKS points.
    if ((lastWeek - firstWeek) / MS_PER_WEEK + 1 > MAX_WEEKS) {
      firstWeek = lastWeek - (MAX_WEEKS - 1) * MS_PER_WEEK;
    }
    let cumulativeUsers = 0;
    // Users that fall before the clamped window still count toward cumulative.
    for (const ms of populated) {
      if (ms < firstWeek) cumulativeUsers += weeklyNewUsers.get(ms) || 0;
    }
    for (let ms = firstWeek; ms <= lastWeek; ms += MS_PER_WEEK) {
      const count = weeklyNewUsers.get(ms) || 0;
      cumulativeUsers += count;
      usersOverTime.push({ weekStart: isoWeekKey(ms), count, cumulative: cumulativeUsers });
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    overview: {
      totalUsers,
      profilesCreated,
      usersWithCourses,
      importedCoursesRate: round((usersWithCourses / Math.max(profilesCreated, 1)) * 100, 1),
      usersWithoutCourses: Math.max(profilesCreated - usersWithCourses, 0),
      totalCourses: courses.length,
      completedCourses,
      inProgressCourses,
      skippedCourses,
      gradedCourses,
      totalCredits: round(totalCredits, 1),
      totalMajorSlots,
      averageCoursesPerUser: round(courses.length / Math.max(profilesCreated, 1), 1),
      averageCoursesPerActiveUser: round(courses.length / Math.max(usersWithCourses, 1), 1),
      averageMajorsPerUser: round(totalMajorSlots / Math.max(profilesCreated, 1), 2),
      averageCreditsPerActiveUser: round(totalCredits / Math.max(usersWithCourses, 1), 1),
      averageGpaAcrossGradedCourses: round(totalGradePoints / Math.max(gradedCredits, 1), 2),
      profileCompletionRate: round((profileCompleteUsers / Math.max(profilesCreated, 1)) * 100, 1),
      friendsEnabledUsers,
      friendsEnabledRate: round((friendsEnabledUsers / Math.max(profilesCreated, 1)) * 100, 1),
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
    usersOverTime,
  });
}
