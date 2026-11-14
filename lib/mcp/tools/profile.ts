import { z } from "zod";
import { majorRequirements } from "@/lib/majors";
import { certificateRequirements } from "@/lib/certificates";
import { ALLOC_REQ_CODES } from "@/lib/distributionalAllocation";
import type { UserDoc } from "../store";
import { programName } from "../format";
import { normalizeCode } from "./shared";
import { ToolError, defineTool, writeAnnotations } from "./types";
import { dryRunField, performWrite } from "./write";

/** Matches the Settings bio field. */
export const BIO_MAX = 200;
export const MAX_MAJORS = 2;
export const MAX_CERTIFICATES = 3;

function sameList(a: string[] | undefined, b: string[]) {
  return JSON.stringify(a ?? []) === JSON.stringify(b);
}

export const updateProfile = defineTool({
  name: "update_profile",
  title: "Update majors, certificates, graduation year or bio",
  description:
    "Changes the student's declared programs (up to 2 majors, 3 certificates; ids from list_programs), graduation year or bio. Lists replace the current ones, so pass the full list. Changing programs changes every progress number; confirm with the student.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    majors: z.array(z.string()).min(1).max(MAX_MAJORS).optional(),
    certificates: z.array(z.string()).max(MAX_CERTIFICATES).optional(),
    graduation_year: z.number().int().optional(),
    bio: z.string().max(BIO_MAX).optional(),
    ...dryRunField,
  },
  run: (ctx, args) =>
    performWrite(ctx, "update_profile", args.dry_run, async () => {
      const user = await ctx.store.getUser();
      const patch: Partial<UserDoc> = {};
      const changes: string[] = [];
      if (args.majors) {
        const unknown = args.majors.filter((id) => !majorRequirements[id]);
        if (unknown.length) throw new ToolError(`Unknown major ids: ${unknown.join(", ")}. Call list_programs.`);
        const next = Array.from(new Set(args.majors));
        if (!sameList(user?.majors, next)) {
          patch.majors = next;
          changes.push(`majors to ${next.map((id) => programName("major", id)).join(" and ")}`);
        }
      }
      if (args.certificates) {
        const unknown = args.certificates.filter((id) => !certificateRequirements[id]);
        if (unknown.length) throw new ToolError(`Unknown certificate ids: ${unknown.join(", ")}. Call list_programs.`);
        const next = Array.from(new Set(args.certificates));
        if (!sameList(user?.certificates, next)) {
          patch.certificates = next;
          changes.push(
            next.length ? `certificates to ${next.map((id) => programName("certificate", id)).join(", ")}` : "no certificates",
          );
        }
      }
      if (args.graduation_year !== undefined) {
        const year = ctx.now().getFullYear();
        if (args.graduation_year < year - 1 || args.graduation_year > year + 8) {
          throw new ToolError(`Graduation year must be between ${year - 1} and ${year + 8}.`);
        }
        if (args.graduation_year !== user?.graduationYear) {
          patch.graduationYear = args.graduation_year;
          changes.push(`graduation year to ${args.graduation_year}`);
        }
      }
      if (args.bio !== undefined && args.bio.trim() !== (user?.bio ?? "")) {
        patch.bio = args.bio.trim();
        changes.push("bio");
      }
      return {
        changed: changes.length > 0,
        summary: changes.length ? `Changed ${changes.join(", ")}` : "the profile already matches",
        detail: { fields: Object.keys(patch) },
        apply: async () => ctx.store.updateUser(patch),
      };
    }),
});

export const setDistributionalPreferences = defineTool({
  name: "set_distributional_preferences",
  title: "Set how distributional credits are allocated",
  description:
    "A course tagged with two distributionals (say Hu and WR) counts toward only one. auto_allocate lets the app choose; manual_allocations pins course codes to a requirement (Hu, So, Sc, QR, WR), with null removing a pin. english_satisfies_language makes ENGL 120 count toward the language requirement for students schooled mainly in another language.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    auto_allocate: z.boolean().optional(),
    manual_allocations: z
      .record(z.string(), z.union([z.string(), z.null()]))
      .optional()
      .describe('e.g. {"ENGL 1200": "WR", "HIST 1010": null}. Merged into the existing pins.'),
    english_satisfies_language: z.boolean().optional(),
    ...dryRunField,
  },
  run: (ctx, args) =>
    performWrite(
      ctx,
      "set_distributional_preferences",
      args.dry_run,
      async () => {
        const user = await ctx.store.getUser();
        const patch: Partial<UserDoc> = {};
        const changes: string[] = [];
        const currentAuto = user?.distributionalAutoAllocate ?? true;
        if (args.auto_allocate !== undefined && args.auto_allocate !== currentAuto) {
          patch.distributionalAutoAllocate = args.auto_allocate;
          changes.push(args.auto_allocate ? "automatic allocation on" : "automatic allocation off");
        }
        if (args.manual_allocations) {
          const next = { ...(user?.distributionalAllocations ?? {}) };
          for (const [rawCode, req] of Object.entries(args.manual_allocations)) {
            const { code } = normalizeCode(rawCode);
            if (req === null) delete next[code];
            else if (!ALLOC_REQ_CODES.includes(req)) {
              throw new ToolError(`"${req}" isn't an allocatable requirement. Use one of ${ALLOC_REQ_CODES.join(", ")}.`);
            } else next[code] = req;
          }
          if (JSON.stringify(next) !== JSON.stringify(user?.distributionalAllocations ?? {})) {
            patch.distributionalAllocations = next;
            changes.push("manual allocations");
          }
        }
        if (
          args.english_satisfies_language !== undefined &&
          args.english_satisfies_language !== (user?.englishSatisfiesLanguage === true)
        ) {
          patch.englishSatisfiesLanguage = args.english_satisfies_language;
          changes.push(`ENGL 120 counts toward ${args.english_satisfies_language ? "language" : "WR"}`);
        }
        return {
          changed: changes.length > 0,
          summary: changes.length ? `Set ${changes.join(", ")}` : "preferences already match",
          apply: async () => ctx.store.updateUser(patch),
        };
      },
      { touchesCourses: false },
    ),
});

export const setPrereqOverride = defineTool({
  name: "set_prereq_override",
  title: "Mark a prerequisite as handled",
  description:
    "Silences the app's missing-prerequisite warning for a course (the student has permission or equivalent background). overridden=false brings the warning back.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: { code: z.string(), overridden: z.boolean().default(true), ...dryRunField },
  run: (ctx, args) =>
    performWrite(
      ctx,
      "set_prereq_override",
      args.dry_run,
      async () => {
        const { code } = normalizeCode(args.code);
        const current = (await ctx.store.getUser())?.prereqOverrides ?? [];
        const has = current.includes(code);
        const next = args.overridden ? (has ? current : [...current, code]) : current.filter((c) => c !== code);
        return {
          changed: next.length !== current.length,
          summary: args.overridden ? `Silenced the prerequisite warning on ${code}` : `Restored the prerequisite warning on ${code}`,
          apply: async () => ctx.store.updateUser({ prereqOverrides: next }),
        };
      },
      { touchesCourses: false },
    ),
});

export const PROFILE_WRITE_TOOLS = [updateProfile, setDistributionalPreferences, setPrereqOverride];
