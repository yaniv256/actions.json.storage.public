import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const map = JSON.parse(
  readFileSync(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);

const byName = (name) => {
  const action = map.tools.find((candidate) => candidate.name === name);
  assert.ok(action, `missing ${name}`);
  return action;
};

const description = byName("trello.card.description.set");
const descriptionSteps = new Map(
  description.workflow.steps.map((step) => [step.id, step]),
);
const replaceDescription = descriptionSteps.get("replaceDescription");
const pasteNewDescription = descriptionSteps.get("pasteNewDescription");

assert.ok(
  replaceDescription,
  "description.set must replace editor content in one atomic workflow step",
);
assert.equal(
  replaceDescription.primitive,
  "text.insert",
  "description replacement must use text.insert's atomic replace contract",
);
assert.equal(replaceDescription.args?.mode, "replace");
assert.match(
  replaceDescription.when ?? "",
  /findPlaceholder/,
  "atomic replacement is the populated-description path",
);
assert.ok(
  pasteNewDescription,
  "an empty Trello description needs the editor-accepted paste insertion path",
);
assert.equal(pasteNewDescription.primitive, "clipboard.paste");
assert.match(pasteNewDescription.when ?? "", /findPlaceholder/);
assert.equal(
  descriptionSteps.has("selectExistingDescription"),
  false,
  "description.set must not split select-all from insertion",
);
assert.equal(
  descriptionSteps.has("insertDesc"),
  false,
  "the old selection-dependent paste step must be removed",
);

const verifyDescription = descriptionSteps.get("verifyDescriptionText");
assert.ok(verifyDescription, "description.set must verify the saved description");
const commitDescription = descriptionSteps.get("commitDescription");
assert.ok(commitDescription, "description.set must commit through Trello's Save control");
assert.doesNotMatch(
  JSON.stringify(commitDescription.settle_after ?? {}),
  /input\.(verify_contains|text)/,
  "the Save step must not use caller text as a fatal settle condition; the verifier owns the goal",
);
assert.match(
  verifyDescription.args?.locator?.selector ?? "",
  /description-content-area/,
  "description verification must bind Trello's measured saved-description surface",
);
assert.doesNotMatch(
  verifyDescription.args?.locator?.selector ?? "",
  /^\[role='dialog'\], \.window$/,
  "whole-modal text is not a description postcondition",
);

const move = byName("trello.card.move_to_list_from_open_card");
assert.ok(
  move.input_schema.required.includes("source_list"),
  "move must require the source list so its absence can be proven",
);
const moveSteps = new Map(move.workflow.steps.map((step) => [step.id, step]));
const verifyMovedList = moveSteps.get("verifyMovedList");

assert.ok(
  verifyMovedList,
  "move_to_list_from_open_card must read the card's committed destination list",
);
assert.match(
  JSON.stringify(verifyMovedList.args?.locator ?? {}),
  /target_list/,
  "move verification must bind the requested destination list",
);
assert.doesNotMatch(
  move.workflow.output,
  /'moved':\s*true/,
  "move output must not hardcode success after event dispatch",
);
assert.match(
  move.workflow.output,
  /verifyMovedList/,
  "move output must derive success from the postcondition read",
);

const boardProjection = map.state_projections.find(
  (candidate) => candidate.name === "trello.board",
);
assert.ok(boardProjection, "missing trello.board projection");
const movePostcondition =
  boardProjection.postconditions?.["trello.card.move_to_list_from_open_card"];
assert.ok(movePostcondition, "move must register a board-model postcondition");
assert.match(movePostcondition.verify.expression, /target_list/);
assert.match(movePostcondition.verify.expression, /source_list/);
assert.match(movePostcondition.verify.expression, /card_title/);

console.log("trello description and move postcondition contract passed");
