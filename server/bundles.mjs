// Loads bundles.json (compiled from vault/ by scripts/compile-vault.mjs) once at startup.
// Never hand-edit bundles.json and never hard-code bundle ids here: its contents grow as the
// vault grows, so everything here is generic lookups over whatever the file currently contains.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PATH = join(dirname(fileURLToPath(import.meta.url)), "bundles.json");

export function loadBundles(path = DEFAULT_PATH) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  const byId = new Map(data.bundles.map((b) => [b.id, b]));
  return {
    version: data.version,
    bundles: data.bundles,
    byId,
    get(id) {
      return byId.get(id);
    },
    // clinical = history + exam bundles, operative = op-* bundles.
    forMode(mode) {
      return mode === "operative"
        ? data.bundles.filter((b) => b.kind.startsWith("op-"))
        : data.bundles.filter((b) => b.kind === "history" || b.kind === "exam");
    },
    // field key "<bundleId>.<itemId>" -> { bundle, item } or null if stale (bundle/item no longer exists).
    field(fieldKey) {
      const dot = fieldKey.indexOf(".");
      if (dot === -1) return null;
      const bundle = byId.get(fieldKey.slice(0, dot));
      if (!bundle) return null;
      const item = bundle.items.find((i) => i.id === fieldKey.slice(dot + 1));
      return item ? { bundle, item } : null;
    },
  };
}
