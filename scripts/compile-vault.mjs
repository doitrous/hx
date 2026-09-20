// Compiles vault/ (the source of truth) into server/bundles.json. Exits 1 with a list of problems if any note is invalid.
// Run: node scripts/compile-vault.mjs          Note format: vault/Project/Note format.md
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, basename, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const VAULT = join(ROOT, "vault");
const CONTENT_DIRS = ["History", "Examination", "Operative"];
const KINDS = ["history", "exam", "op-core", "op-event", "op-procedure"];
const TYPES = /^(text|presence|duration|bp|number( .+)?)$/;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (e.isDirectory()) out.push(...await walk(join(dir, e.name)));
    else if (e.name.endsWith(".md")) out.push(join(dir, e.name));
  }
  return out;
}

function parseNote(file, raw, errors) {
  const where = relative(VAULT, file);
  const err = (m) => errors.push(`${where}: ${m}`);
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return err("missing frontmatter"), null;
  const fm = Object.fromEntries(m[1].split("\n").filter((l) => /^\w+:/.test(l)).map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim().replace(/^"(.*)"$/, "$1")]));
  const section = (name) => (m[2].split(/^## /m).find((s) => s.startsWith(name)) || "").split("\n").slice(1).filter((l) => l.startsWith("- ")).map((l) => l.slice(2).split("::").map((x) => x.trim()));

  for (const k of ["id", "kind", "system", "about"]) if (!fm[k]) err(`frontmatter needs ${k}`);
  if (fm.id && !/^[a-z][a-z0-9_]*$/.test(fm.id)) err(`bad id "${fm.id}"`);
  if (fm.kind && !KINDS.includes(fm.kind)) err(`kind must be one of ${KINDS.join(", ")}`);
  const trigger = !fm.trigger || fm.trigger === "always" ? null : fm.trigger;

  const items = section("Items").map(([label, phrase, type = "text"]) => {
    if (!label) err("empty item");
    if (!TYPES.test(type)) err(`item "${label}": bad type "${type}"`);
    return { id: slug(label), label, phrase: phrase || label.toLowerCase(), type };
  });
  if (!items.length) err("needs at least one item under ## Items");

  const related = section("Related").map(([link, label, phrase, reason]) => {
    const target = link?.match(/^\[\[([^\]|#]+)/)?.[1];
    if (!target) err(`Related line must start with [[Note name]]: "${link}"`);
    if (!reason) err(`Related "${target}": needs label :: phrase :: reason`);
    return { target, label, phrase, reason };
  });
  return { file, name: basename(file, ".md"), fm, trigger, items, related };
}

const errors = [];
const notes = [];
for (const d of CONTENT_DIRS) for (const f of await walk(join(VAULT, d))) {
  const n = parseNote(f, await readFile(f, "utf8"), errors);
  if (n) notes.push(n);
}
const byName = new Map();
for (const n of notes) { if (byName.has(n.name)) errors.push(`${n.name}: two notes share this file name; names must be unique across the vault`); byName.set(n.name, n); }
const ids = new Set();
const bundles = notes.map((n) => {
  if (ids.has(n.fm.id)) errors.push(`${n.name}: duplicate id ${n.fm.id}`);
  ids.add(n.fm.id);
  const items = [...n.items];
  for (const r of n.related) {
    const t = byName.get(r.target);
    if (!t) { errors.push(`${n.name}: Related link [[${r.target}]] has no matching note`); continue; }
    // A connection is a real screening question in this bundle that points at the linked bundle.
    items.push({ id: `link_${t.fm.id}`, label: r.label, phrase: r.phrase, type: "presence", link: t.fm.id, reason: r.reason });
  }
  const seen = new Set();
  for (const i of items) { if (seen.has(i.id)) errors.push(`${n.name}: duplicate item "${i.label}"`); seen.add(i.id); }
  return { id: n.fm.id, title: n.fm.title || n.name, kind: n.fm.kind, system: n.fm.system, trigger: n.trigger, about: n.fm.about, status: n.fm.status || "draft", items };
}).sort((a, b) => a.id.localeCompare(b.id));

// LENIENT=1 (used by agents working in parallel) still writes the valid bundles when someone else's note is broken.
const lenient = process.env.LENIENT === "1";
if (errors.length) { console.error(errors.join("\n")); console.error(`\n${errors.length} problem(s).${lenient ? " LENIENT: writing anyway." : " Nothing written."}`); if (!lenient) process.exit(1); }
const version = createHash("sha256").update(JSON.stringify(bundles)).digest("hex").slice(0, 12);
const out = process.env.OUT || join(ROOT, "server", "bundles.json"); // OUT=/tmp/x.json compiles to a private file
await mkdir(join(ROOT, "server"), { recursive: true });
await writeFile(out, JSON.stringify({ version, bundles }, null, 1));
const n = (k) => bundles.filter((b) => b.kind.startsWith(k)).length;
console.log(`ok ${version}: ${bundles.length} bundles (${n("history")} history, ${n("exam")} exam, ${n("op")} operative), ${bundles.reduce((s, b) => s + b.items.length, 0)} items, ${bundles.reduce((s, b) => s + b.items.filter((i) => i.link).length, 0)} connections, ${bundles.filter((b) => b.status === "draft").length} drafts, ${bundles.filter((b) => b.status === "checked").length} checked`);
