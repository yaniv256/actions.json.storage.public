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
const persistedTitleVerifier = rename.workflow.steps.find(
  (step) => step.id === "verifyRename",
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
  /extension 0\.1\.231/i,
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
  persistedTitleVerifier?.args?.text_contains ?? "",
  /input\.new_title/,
  "card.title.set must narrow the identity-scoped board-front read to the requested title",
);

assert.match(
  rename.workflow.output,
  /\$targetCardId[\s\S]*\$trim\(\$match\.attributes\.text\) = input\.new_title/,
  "card.title.set must bind the exact title to the original stable card ID",
);

assert.ok(
  committedTitleVerifier,
  "card.title.set must preserve a diagnostic read of the opened card's title field",
);

assert.equal(
  committedTitleVerifier.retry_until,
  undefined,
  "transient editor state must not block authoritative persisted-title verification",
);

assert.doesNotMatch(
  rename.workflow.output,
  /\$committedTitle = input\.new_title/,
  "card.title.set output must not treat transient editor state as authoritative",
);

assert.match(
  rename.workflow.output,
  /'committed_title': \$committedTitle[\s\S]*'editor_title_observed': \$committedTitle/,
  "card.title.set must preserve committed_title as a compatibility alias for the diagnostic editor signal",
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
