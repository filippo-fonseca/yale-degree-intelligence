import { describe, expect, it } from "vitest";
import { distributionalResolverFor } from "@/lib/utils/effectiveDistributionals";

describe("distributionalResolverFor", () => {
  it("prefers a student's stored tags for their own courses", () => {
    const resolve = distributionalResolverFor([
      { code: "ZZZZ 9990", distributionals: ["L4"] },
    ]);
    expect(resolve("ZZZZ 9990")).toEqual(["L4"]);
  });

  it("returns no tags for an unknown code the student does not have", () => {
    const resolve = distributionalResolverFor([]);
    expect(resolve("ZZZZ 9991")).toEqual([]);
  });
});
