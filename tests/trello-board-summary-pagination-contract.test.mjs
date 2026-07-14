import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL("../sites/trello.com/board/actions.json", import.meta.url);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const board = map.state_projections.find((projection) => projection.name === "trello.board");

assert.ok(board, "missing trello.board projection");

const orientation = board.summaries.find((summary) => summary.name === "agent_context");
const listsPage = board.summaries.find((summary) => summary.name === "lists_page");
const listPage = board.summaries.find((summary) => summary.name === "list_page");

assert.ok(orientation, "missing bounded agent_context summary");
assert.ok(listsPage, "missing lists_page summary");
assert.ok(listPage, "missing list_page summary");
assert.ok(orientation.max_bytes <= 8_000, "orientation summary budget must remain compact");
assert.match(orientation.expression, /lists_truncated/);
assert.match(orientation.expression, /read_more/);
assert.match(orientation.expression, /list_catalog_summary_name/);
assert.doesNotMatch(
  orientation.expression,
  /\$map\(state\.board\.lists[\s\S]*\$map\(\$list\.cards/,
  "orientation summary must not emit every card in every list",
);

assert.equal(listPage.input_schema.type, "object");
assert.deepEqual(listPage.input_schema.required, ["list_name"]);
assert.equal(listPage.input_schema.additionalProperties, false);
assert.equal(listPage.input_schema.properties.limit.maximum, 10);
assert.equal(listPage.input_schema.properties.offset.minimum, 0);
assert.equal(listPage.input_schema.properties.list_occurrence.minimum, 0);
assert.match(listPage.expression, /\$\$\.input\.list_name/);
assert.match(listPage.expression, /matching_list_count/);
assert.match(listPage.expression, /has_more/);
assert.match(listPage.expression, /next_offset/);
assert.match(listPage.expression, /returned_count/);

assert.equal(listsPage.input_schema.type, "object");
assert.equal(listsPage.input_schema.additionalProperties, false);
assert.equal(listsPage.input_schema.properties.limit.maximum, 25);
assert.match(listsPage.expression, /total_count/);
assert.match(listsPage.expression, /has_more/);
assert.match(listsPage.expression, /next_offset/);

const worstCaseRepresentative = {
  found: true,
  list_name: "N".repeat(120),
  offset: 0,
  limit: 10,
  total_count: 1_000_000,
  returned_count: 10,
  has_more: true,
  next_offset: 10,
  cards: Array.from({ length: 10 }, () => ({
    title: "T".repeat(300),
    url: "U".repeat(500),
    labels: Array.from({ length: 4 }, () => "L".repeat(60)),
    due_date: "D".repeat(60),
    checklist_summary: "C".repeat(60),
  })),
};

const bytes = Buffer.byteLength(JSON.stringify(worstCaseRepresentative), "utf8");
assert.ok(bytes < listPage.max_bytes, `${bytes} worst-case bytes exceed list_page budget`);
assert.ok(bytes < 14_000, `${bytes} worst-case bytes leave too little budget margin`);

console.log(`Trello board summaries are bounded; worst-case list page is ${bytes} bytes.`);
