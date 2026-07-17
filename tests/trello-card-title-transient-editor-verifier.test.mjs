import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL("../sites/trello.com/board/actions.json", import.meta.url);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const rename = map.tools.find(
  (candidate) => candidate.name === "trello.card.title.set",
);

assert.ok(rename, "missing trello.card.title.set");

const editorRead = rename.workflow.steps.find(
  (step) => step.id === "verifyCommittedTitleInput",
);
const identityRead = rename.workflow.steps.find(
  (step) => step.id === "captureCardIdentity",
);
const boardFrontRead = rename.workflow.steps.find(
  (step) => step.id === "verifyRename",
);
const boardFrontWait = rename.workflow.steps.find(
  (step) => step.id === "waitForRenamedCard",
);

assert.ok(editorRead, "missing diagnostic title-editor read");
assert.equal(
  editorRead.primitive,
  "dom.observe.attributes",
  "the diagnostic editor read must use a primitive that actually returns aria-label attributes",
);
assert.equal(
  editorRead.retry_until,
  undefined,
  "a transient title-editor aria-label must not exhaust the workflow after Trello has saved the title",
);
assert.equal(
  editorRead.on_error,
  "continue",
  "the title-editor read is diagnostic and must not prevent persisted-state verification",
);

assert.equal(
  identityRead?.primitive,
  "dom.observe.attributes",
  "the workflow must capture the intended card's stable href before renaming",
);
assert.deepEqual(
  identityRead?.args?.attributes,
  ["href", "text"],
  "card identity capture must include both stable href and exact visible title",
);
assert.equal(
  identityRead?.args?.text_contains,
  "{% input.current_title %}",
  "dom.observe.attributes only supports text_contains; exactness must be enforced in JSONata",
);
assert.equal(
  identityRead?.args?.text_equals,
  undefined,
  "unsupported text_equals arguments must not be placed on dom.observe.attributes",
);
assert.equal(
  boardFrontRead?.primitive,
  "dom.observe.attributes",
  "the authoritative post-close verifier must read stable href plus exact board-front title",
);
assert.deepEqual(
  boardFrontRead?.args?.attributes,
  ["href", "text"],
  "the authoritative verifier must preserve the target identity and its persisted title",
);
assert.match(
  boardFrontRead?.args?.selector ?? "",
  /\$targetCardId/,
  "the authoritative board-front read must be scoped to the captured stable card ID",
);
assert.equal(
  boardFrontRead?.args?.text_equals,
  undefined,
  "the authoritative dom.observe.attributes read must use supported arguments only",
);
assert.equal(
  boardFrontRead?.retry_until,
  undefined,
  "diagnostic persisted-state reads must not trigger unconditional workflow retry exhaustion",
);
assert.equal(
  boardFrontWait?.primitive,
  "locator.wait_for",
  "the workflow must give the identity-scoped renamed card a real observation window",
);
assert.match(
  boardFrontWait?.args?.locator?.selector ?? "",
  /\$targetCardId/,
  "the wait must be scoped to the captured card identity, not any card with the destination title",
);
assert.equal(
  boardFrontWait?.args?.locator?.text_equals,
  "{% input.new_title %}",
  "the wait must require the exact requested title on the captured card",
);
assert.ok(
  rename.workflow.steps.indexOf(boardFrontWait) <
    rename.workflow.steps.indexOf(boardFrontRead),
  "the bounded persistence wait must precede the authoritative diagnostic read",
);
assert.ok(
  boardFrontWait?.args?.timeout_ms >= 5000,
  "the persisted title wait must span a meaningful Trello render window",
);
assert.equal(
  boardFrontWait?.on_error,
  "continue",
  "a timed-out wait must still allow the diagnostic read and structured fail-closed output",
);
assert.match(
  rename.workflow.output,
  /\$substringBefore\(\$substringAfter\(\$match\.attributes\.href, '\/c\/'\).* = \$targetCardId and \$trim\(\$match\.attributes\.text\) = input\.new_title/,
  "success must bind the exact persisted title to the same stable card ID captured before mutation",
);
assert.match(
  rename.workflow.output,
  /\$count\(\$targetBefore\) = 1 and \$count\(\$targetAfter\) = 1/,
  "an unrelated card with new_title must not create a false success",
);
assert.match(
  rename.description,
  /transient editor/i,
  "the action contract must disclose why editor state is diagnostic rather than authoritative",
);
assert.match(
  rename.workflow.output,
  /trello\.board\.visible_cards\.read[\s\S]*\/c\/<id>[\s\S]*target_card_id/,
  "recovery guidance must name an executable identity-aware independent read",
);

console.log("Trello card-title transient-editor verifier contract passed.");
