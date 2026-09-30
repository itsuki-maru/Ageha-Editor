import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./collect-release-artifacts.mjs", import.meta.url));

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), "ageha-release-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bundle = join(root, "bundle");
  mkdirSync(bundle);
  for (const [name, contents] of Object.entries(files)) {
    const file = join(bundle, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, contents);
  }
  return {
    root,
    run: (extensions) => {
      const result = spawnSync(process.execPath, [script], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, BUNDLE_PATH: bundle, BUNDLE_EXTENSIONS: extensions },
      });
      if (result.error) throw result.error;
      return result;
    },
  };
}

for (const extensions of [[".AppImage", ".deb"], [".dmg"], [".exe", ".msi"]]) {
  test(`collects ${extensions.join(" / ")} installers, preserving names and contents`, (t) => {
    const files = Object.fromEntries(
      extensions.map((ext) => [`nested/Ageha Editor${ext}`, `installer${ext}`]),
    );
    const sample = fixture(t, { ...files, "ignored.txt": "not an installer" });
    const result = sample.run(extensions.join(","));
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      readdirSync(join(sample.root, "release-pkg")).sort(),
      extensions.map((ext) => `Ageha Editor${ext}`).sort(),
    );
    for (const ext of extensions) {
      assert.equal(
        readFileSync(join(sample.root, "release-pkg", `Ageha Editor${ext}`), "utf8"),
        `installer${ext}`,
      );
    }
  });
}

test("rejects a missing installer format even when another format exists", (t) => {
  const result = fixture(t, { "setup.exe": "installer" }).run(".exe,.msi");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing installer type: \.msi/);
});

test("rejects empty installers", (t) => {
  const result = fixture(t, { "setup.exe": "" }).run(".exe");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Empty installer/);
});

test("rejects filename collisions when flattening bundle directories", (t) => {
  const result = fixture(t, { "a/setup.exe": "first", "b/setup.exe": "second" }).run(".exe");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Duplicate installer filename/);
});
