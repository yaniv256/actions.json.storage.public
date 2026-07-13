import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL("../sites/trello.com/board/actions.json", import.meta.url);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const rename = map.tools.find(
  (candidate) => candidate.name === "trello.card.title.set",
);

assert.ok(rename, "missing trello.card.title.set");

const contract = `${rename.description}\n${rename.workflow.output}`;

assert.doesNotMatch(
  contract,
  /does not persist|rename reverts|unsupported|react[- ]controlled|intermittent/i,
  "card.title.set must not expose a superseded persistence warning",
);

assert.match(
  rename.description,
  /six consecutive renames persisted/i,
  "card.title.set must disclose the current repeated live boundary",
);

assert.match(
  rename.description,
  /extension 0\.1\.206/i,
  "card.title.set must bind its capability claim to the measured runtime",
);

assert.match(
  rename.description,
  /do not claim success unless output\.verified is true/i,
  "card.title.set must retain its verified-success gate",
);

assert.match(
  rename.workflow.output,
  /\$contains\(steps\.verifyRename\.output\.text, input\.new_title\)/,
  "card.title.set must prove the new title is present",
);

assert.match(
  rename.workflow.output,
  /\$not\(\$contains\(steps\.verifyRename\.output\.text, input\.current_title\)\)/,
  "card.title.set must prove the old title is absent",
);

assert.match(
  rename.workflow.output,
  /independent board projection/i,
  "card.title.set must direct callers to independent board-state verification",
);

console.log("Trello card-title capability contract is current and verified.");
