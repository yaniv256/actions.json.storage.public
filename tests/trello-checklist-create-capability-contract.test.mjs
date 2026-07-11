import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL("../sites/trello.com/board/actions.json", import.meta.url);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const create = map.tools.find(
  (candidate) => candidate.name === "trello.card.checklist.create",
);

assert.ok(create, "missing trello.card.checklist.create");

const description = create.description.toLowerCase();

assert.doesNotMatch(
  description,
  /resolves the checklist item|toggle\/anchor the wrong item|\bunreliable\b|do not trust success reports/,
  "checklist.create must not expose the copied checklist-item failure narrative",
);

for (const phrase of [
  "extension 0.1.198",
  "unique title",
  "duplicate checklist titles",
  "not idempotent",
  "verify the checklist count",
]) {
  assert.match(
    description,
    new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `checklist.create description must state the measured boundary: ${phrase}`,
  );
}

console.log("Trello checklist-create capability contract is current and bounded.");
