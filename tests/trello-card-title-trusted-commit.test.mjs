import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL("../sites/trello.com/board/actions.json", import.meta.url);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const rename = map.tools.find(
  (candidate) => candidate.name === "trello.card.title.set",
);

assert.ok(rename, "missing trello.card.title.set");

const commit = rename.workflow.steps.find((step) => step.id === "commitTitle");
assert.ok(commit, "trello.card.title.set must have an explicit commit step");
assert.equal(commit.primitive, "keyboard.press");
assert.equal(commit.args?.key, "Enter");
assert.equal(
  commit.args?.trusted,
  true,
  "Trello ignores synthetic Enter for card-title persistence; commitTitle must dispatch a trusted Enter",
);

assert.match(
  rename.description,
  /trusted Enter/i,
  "the action contract must disclose the measured title-commit boundary",
);

console.log("Trello card-title trusted-commit contract passed.");
