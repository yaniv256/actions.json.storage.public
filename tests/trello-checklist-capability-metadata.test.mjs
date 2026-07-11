import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL("../sites/trello.com/board/actions.json", import.meta.url);
const map = JSON.parse(await readFile(mapUrl, "utf8"));

const expected = new Map([
  [
    "trello.card.checklist_unchecked_items.read",
    ["exact item", "empty result", "2026-07-11"],
  ],
  [
    "trello.card.checklist_item.complete",
    ["exact item", "verify", "2026-07-11"],
  ],
  [
    "trello.card.checklist_item.uncomplete",
    ["exact item", "verify", "2026-07-11"],
  ],
]);

for (const [name, requiredPhrases] of expected) {
  const tool = map.tools.find((candidate) => candidate.name === name);
  assert.ok(tool, `missing Trello checklist tool: ${name}`);

  const description = tool.description.toLowerCase();
  assert.doesNotMatch(
    description,
    /\bbroken\b|\bno-op\b|always returns an empty list|cannot tick anything/,
    `${name} exposes a stale absolute failure claim to agents`,
  );

  for (const phrase of requiredPhrases) {
    assert.match(
      description,
      new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `${name} description must state the measured capability boundary: ${phrase}`,
    );
  }
}

console.log("Trello checklist capability metadata is current and bounded.");
