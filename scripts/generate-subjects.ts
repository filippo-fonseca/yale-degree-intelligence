import fs from "fs";
import path from "path";

// Path to the directory with *_reqs.json files
const reqsDir = path.join(__dirname, "..", "app", "lib", "data", "reqs");
const outputFile = path.join(__dirname, "..", "lib", "subjects.json");

const majors: { [code: string]: string } = {};

for (const file of fs.readdirSync(reqsDir).filter(f => f.endsWith("_reqs.json"))) {
  const data = JSON.parse(fs.readFileSync(path.join(reqsDir, file), "utf8"));
  for (const key of Object.keys(data)) {
    const major = data[key];
    if (major.id && major.name) {
      majors[major.id] = major.name;
    }
  }
}

fs.writeFileSync(outputFile, JSON.stringify(majors, null, 2));
// console.log("subjects.json generated successfully!");
