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

assert.ok(
  replaceDescription,
  "description.set must replace the whole ProseMirror document through the portable primitive",
);
assert.equal(replaceDescription.primitive, "text.insert");
assert.equal(replaceDescription.args?.mode, "replace");
assert.equal(replaceDescription.args?.text, "{% input.text %}");
assert.equal(replaceDescription.when, undefined);
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
const descriptionStepOrder = description.workflow.steps.map((step) => step.id);
assert.ok(
  descriptionStepOrder.indexOf("replaceDescription") <
      descriptionStepOrder.indexOf("settleDescriptionDraft") &&
    descriptionStepOrder.indexOf("settleDescriptionDraft") <
      descriptionStepOrder.indexOf("commitDescription"),
  "portable replacement must settle Trello's ProseMirror model before the single Save",
);
assert.ok(
  (descriptionSteps.get("settleDescriptionDraft")?.settle_after?.delay_ms ?? 0) >= 4500,
  "the measured ProseMirror synchronization boundary requires an explicit settle interval",
);
for (const staleRecoveryStep of [
  "pasteNewDescription",
  "selectExistingDescription",
  "typeExistingDescription",
  "waitFirstEditorClosed",
  "findDraftEdit",
  "clickDraftEdit",
  "scrollDraftSaveIntoView",
  "findDraftSave",
  "commitDraftDescription",
]) {
  assert.equal(
    descriptionSteps.has(staleRecoveryStep),
    false,
    `${staleRecoveryStep} must not preserve the one-revision-behind workaround`,
  );
}
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
const closeMovedCard = moveSteps.get("closeMovedCard");
const verifyCardClosed = moveSteps.get("verifyCardClosed");
const verifyBoardRoute = moveSteps.get("verifyBoardRoute");

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
assert.equal(
  closeMovedCard?.primitive,
  "keyboard.press",
  "move must close the card after verifying its committed destination",
);
assert.equal(closeMovedCard?.args?.key, "Escape");
assert.equal(
  verifyCardClosed?.primitive,
  "dom.observe.visible",
  "move must prove the card surface is gone after Escape",
);
assert.match(
  JSON.stringify(verifyCardClosed?.args ?? {}),
  /card-back-(title-input|name)/,
  "route restoration must bind the card-back surface negatively",
);
assert.match(verifyCardClosed?.retry_until ?? "", /match_count\s*=\s*0/);
assert.equal(
  verifyBoardRoute?.primitive,
  "locator.wait_for",
  "move must return to a board surface before its board projection postcondition runs",
);
assert.match(
  JSON.stringify(verifyBoardRoute?.args?.locator ?? {}),
  /data-testid.*list-name/,
  "board-route verification must bind Trello list headings",
);
assert.match(
  move.workflow.output,
  /verifyBoardRoute\.output\.matched/,
  "move output must use locator.wait_for's declared matched field",
);
assert.match(move.workflow.output, /verifyCardClosed\.output\.match_count\s*=\s*0/);

const stepOrder = move.workflow.steps.map((step) => step.id);
assert.ok(
  stepOrder.indexOf("verifyMovedList") < stepOrder.indexOf("closeMovedCard") &&
    stepOrder.indexOf("closeMovedCard") < stepOrder.indexOf("verifyCardClosed") &&
    stepOrder.indexOf("verifyCardClosed") < stepOrder.indexOf("verifyBoardRoute"),
  "move must verify destination, close the card, prove it absent, then prove the board visible",
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
