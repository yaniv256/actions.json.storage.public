import assert from "node:assert/strict";
import fs from "node:fs";

const map = JSON.parse(
  fs.readFileSync(
    new URL("../sites/trello.com/board/actions.json", import.meta.url),
    "utf8",
  ),
);

const geometryClicks = [];
for (const action of map.tools) {
  for (const step of action.workflow?.steps ?? []) {
    if (
      step.primitive === "pointer.click" &&
      JSON.stringify(step.args ?? {}).includes("bounding_box")
    ) {
      geometryClicks.push(`${action.name}:${step.id}`);
    }
  }
}

assert.deepEqual(
  geometryClicks,
  [],
  "Trello mutations must consume identity-bound clickable_center values, not reconstruct identity from geometry",
);

console.log("Trello pointer mutations contain no geometry-as-identity joins");
