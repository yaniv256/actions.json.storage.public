import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const mapUrl = new URL(
  "../sites/developers.openai.com/api-docs-model/actions.json",
  import.meta.url,
);
const map = JSON.parse(fs.readFileSync(mapUrl, "utf8"));

test("OpenAI pricing monitor declares a bounded, complete comparison surface", () => {
  const projection = map.state_projections.find(
    (candidate) => candidate.name === "openai.model.pricing",
  );

  assert.ok(projection);
  assert.equal(
    projection.scope.url_matches,
    "https://developers.openai.com/api/docs/models/gpt-realtime-2*",
  );
  assert.match(projection.snapshot.projection.expression, /card_count/);
  assert.match(projection.snapshot.projection.expression, /complete/);
  assert.match(projection.snapshot.projection.expression, /Text tokens/);
  assert.match(projection.snapshot.projection.expression, /Audio tokens/);
  assert.match(projection.snapshot.projection.expression, /Image tokens/);
  assert.ok(
    projection.snapshot.extract.some(
      (extractor) => extractor.id === "section_headings",
    ),
  );
  assert.equal(map.notes.comparison_fields.length, 8);
  assert.match(map.notes.failure_policy, /do not infer or carry forward/i);
});

test("OpenAI pricing monitor exposes no remote mutation", () => {
  const serialized = JSON.stringify(map.tools);

  assert.equal(map.tools.length, 1);
  assert.ok(map.tools[0].x_actions.static_output);
  assert.doesNotMatch(serialized, /pointer\.click|text\.insert|keyboard\.press|browser\.navigate/);
  assert.equal(map.tools[0].x_actions.static_output.mutation_boundary, "This map exposes no mutations.");
});
