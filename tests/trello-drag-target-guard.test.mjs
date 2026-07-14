import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const map = JSON.parse(
  readFileSync(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);
const drag = map.tools.find((candidate) => candidate.name === "trello.card.drag_between_lists");
assert.ok(drag, "missing trello.card.drag_between_lists");

const animatedDrag = drag.workflow.steps.find((step) => step.id === "animatedDrag");
assert.ok(animatedDrag, "drag workflow must contain animatedDrag");
assert.match(
  animatedDrag.when ?? "",
  /findCard.*clickable_center\.x.*findDestList.*clickable_center\.x/,
  "animated drag must be gated on both resolved coordinates",
);
assert.match(
  drag.workflow.output,
  /'drag_ready'/,
  "drag output must expose whether coordinates were resolved before dispatch",
);

console.log("trello drag target guard contract passed");
