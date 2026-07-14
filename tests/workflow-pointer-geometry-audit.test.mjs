import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sites");

function actionMaps(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return actionMaps(target);
    return entry.name === "actions.json" ? [target] : [];
  });
}

const violations = [];
const declaredExceptions = [];

for (const filename of actionMaps(root)) {
  const map = JSON.parse(fs.readFileSync(filename, "utf8"));
  for (const action of map.tools ?? []) {
    const geometryClicks = (action.workflow?.steps ?? []).filter(
      (step) =>
        step.primitive === "pointer.click" &&
        JSON.stringify(step.args ?? {}).includes("bounding_box"),
    );
    if (geometryClicks.length === 0) continue;

    const exception = action.x_actions?.geometry_identity_exception;
    if (
      exception?.status === "investigation_required" &&
      typeof exception.reason === "string" &&
      exception.reason.length > 40 &&
      typeof exception.investigation === "string" &&
      exception.investigation.endsWith(".md")
    ) {
      declaredExceptions.push(`${action.name}:${geometryClicks.map((step) => step.id).join(",")}`);
      continue;
    }

    violations.push(`${path.relative(root, filename)}:${action.name}:${geometryClicks.map((step) => step.id).join(",")}`);
  }
}

assert.deepEqual(
  violations,
  [],
  "Pointer clicks may not derive mutation identity from bounding boxes without an explicit investigation-required exception",
);
assert.deepEqual(
  declaredExceptions,
  [],
  "Resolved geometry-identity exceptions must be removed from both maps and the audit baseline",
);

console.log("Public workflow geometry-identity audit passed with no exceptions");
