import { readFile, readdir, lstat, access } from "node:fs/promises";
import { resolve, dirname, relative, sep } from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const root = resolve("site");
const html = await readFile(resolve(root, "index.html"), "utf8");
assert.match(html, /<html lang="en">/);
assert.match(html, /name="viewport"/);
assert.match(html, /id="planner"/);
for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  const url = match[1];
  if (/^https:\/\//.test(url)) continue;
  assert(
    !url.startsWith("/"),
    `Origin-root URL breaks project hosting: ${url}`,
  );
  const target = resolve(root, url.split(/[?#]/)[0]);
  assert(
    !relative(root, target).startsWith(`..${sep}`),
    `Asset escapes site/: ${url}`,
  );
  await access(target);
}
async function inspect(dir) {
  for (const name of await readdir(dir)) {
    const path = resolve(dir, name);
    const stat = await lstat(path);
    assert(!stat.isSymbolicLink(), `Published symlink: ${path}`);
    if (stat.isDirectory()) await inspect(path);
  }
}
await inspect(root);
for (const name of await readdir(resolve(root, "js"))) {
  if (!name.endsWith(".js")) continue;
  const path = resolve(root, "js", name),
    content = await readFile(path, "utf8");
  const checked = spawnSync(process.execPath, ["--check", path], {
    encoding: "utf8",
  });
  assert.equal(checked.status, 0, checked.stderr);
  for (const match of content.matchAll(
    /(?:from\s+|new URL\(\s*)["']([^"']+)["']/g,
  )) {
    if (match[1].startsWith("."))
      await access(resolve(dirname(path), match[1].split(/[?#]/)[0]));
  }
}
for (const file of [
  "README.md",
  "docs/requirements.md",
  "docs/model.md",
  "docs/assumptions.md",
  "docs/architecture.md",
  "docs/roadmap.md",
  "docs/deployment.md",
]) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(match[1]) || match[1].startsWith("#")) continue;
    await access(resolve(dirname(file), match[1].split("#")[0]));
  }
}
console.log(
  "Static packaging and documentation links passed. Financial engine tests run next.",
);
