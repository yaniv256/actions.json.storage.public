import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL("../sites/trello.com/board/actions.json", import.meta.url);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const rename = map.tools.find(
  (candidate) => candidate.name === "trello.card.title.set",
);

assert.ok(rename, "missing trello.card.title.set");

const contract = `${rename.description}\n${rename.workflow.output}`;
const committedTitleVerifier = rename.workflow.steps.find(
  (step) => step.id === "verifyCommittedTitleInput",
);
const targetCardResolver = rename.workflow.steps.find(
  (step) => step.id === "findCardFront",
);

assert.equal(
  targetCardResolver?.args?.locator?.text_equals,
  "{% input.current_title %}",
  "card.title.set must acquire the current card by exact title identity",
);

assert.equal(
  targetCardResolver?.args?.locator?.text_contains,
  undefined,
  "card.title.set must not rename a longer substring-collision title",
);

assert.doesNotMatch(
  contract,
  /does not persist|rename reverts|unsupported|react[- ]controlled|intermittent/i,
  "card.title.set must not expose a superseded persistence warning",
);

assert.match(
  rename.description,
  /six consecutive renames persisted/i,
  "card.title.set must preserve the historical repeated live boundary",
);

assert.match(
  rename.description,
  /extension 0\.1\.229/i,
  "card.title.set must bind its capability claim to the measured runtime",
);

assert.match(
  rename.description,
  /synthetic Enter[\s\S]*persisted card title unchanged[\s\S]*trusted Enter/i,
  "card.title.set must disclose the measured synthetic-versus-trusted commit boundary",
);

assert.match(
  rename.description,
  /do not claim success unless output\.verified is true/i,
  "card.title.set must retain its verified-success gate",
);

assert.match(
  rename.workflow.output,
  /\$trim\(steps\.verifyRename\.output\.text\) = input\.new_title/,
  "card.title.set must prove the board-front title is an exact match",
);

assert.ok(
  committedTitleVerifier,
  "card.title.set must verify the opened card's committed title field",
);

assert.match(
  committedTitleVerifier.retry_until,
  /\$lookup\(steps\.verifyCommittedTitleInput\.output\.attributes, 'aria-label'\) = input\.new_title/,
  "card.title.set must bind verification to the opened card's committed title field",
);

assert.match(
  rename.workflow.output,
  /\$committedTitle = input\.new_title/,
  "card.title.set output must require the exact committed title",
);

assert.doesNotMatch(
  rename.workflow.output,
  /\$contains\(steps\.verifyRename\.output\.text, input\.current_title\)/,
  "a new title containing the old title must not become a false negative",
);

assert.match(
  rename.workflow.output,
  /independent board projection/i,
  "card.title.set must direct callers to independent board-state verification",
);

console.log("Trello card-title capability contract is current and verified.");
