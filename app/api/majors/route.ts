import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

// Ensure this runs server-side only
export async function GET() {
  const reqsDir = path.join(process.cwd(), "data", "reqs");
  const majors: { [code: string]: string } = {};

  // Find all *_reqs.json files
  const files = (await fs.readdir(reqsDir)).filter(f => f.endsWith("_reqs.json"));

  for (const file of files) {
    const filePath = path.join(reqsDir, file);
    const data = JSON.parse(await fs.readFile(filePath, "utf8"));

    for (const key of Object.keys(data)) {
      const major = data[key];
      if (major.id && major.name) {
        majors[major.id] = major.name;
      }
    }
  }

  return NextResponse.json(majors);
}
