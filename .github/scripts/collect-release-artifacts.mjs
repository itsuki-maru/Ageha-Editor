import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";

const { BUNDLE_PATH, BUNDLE_EXTENSIONS } = process.env;
if (!BUNDLE_PATH || !BUNDLE_EXTENSIONS) {
  throw new Error("BUNDLE_PATH and BUNDLE_EXTENSIONS are required");
}

const extensions = BUNDLE_EXTENSIONS.split(",");
const installers = readdirSync(BUNDLE_PATH, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && extensions.includes(extname(entry.name)))
  .map((entry) => join(entry.parentPath, entry.name));

for (const extension of extensions) {
  if (!installers.some((file) => extname(file) === extension)) {
    throw new Error(`Missing installer type: ${extension}`);
  }
}

const names = new Set();
for (const file of installers) {
  if (statSync(file).size === 0) {
    throw new Error(`Empty installer: ${file}`);
  }
  const name = basename(file);
  if (names.has(name)) {
    throw new Error(`Duplicate installer filename: ${name}`);
  }
  names.add(name);
}

mkdirSync("release-pkg", { recursive: true });
for (const file of installers) {
  copyFileSync(file, join("release-pkg", basename(file)));
  console.log(`Collected ${basename(file)}`);
}
