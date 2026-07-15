import fs from 'node:fs';
import assert from 'node:assert/strict';

const map = JSON.parse(
  fs.readFileSync(new URL('../sites/x.com/app/actions.json', import.meta.url)),
);
const tool = (name) => map.tools.find((entry) => entry.name === name);
const projection = (name) => map.state_projections.find((entry) => entry.name === name);

const expectedTools = [
  'x.outreach.map',
  'x.notifications.open',
  'x.search.url',
  'x.profile.url',
  'x.post.url',
  'x.reply.draft.replace_if_unchanged',
  'x.reply.publish_approved',
];
for (const name of expectedTools) assert.ok(tool(name), `missing ${name}`);

const draft = tool('x.reply.draft.replace_if_unchanged');
const draftSerialized = JSON.stringify(draft);
assert.match(draftSerialized, /expected_existing_text/);
assert.match(draftSerialized, /text\.select/);
assert.match(draftSerialized, /Backspace/);
assert.match(draftSerialized, /published[^}]*false/);

const publish = tool('x.reply.publish_approved');
assert.deepEqual(publish.input_schema.properties.approval.enum, ['APPROVE PUBLISH']);
const publishStep = publish.workflow.steps.find((step) => step.id === 'publish');
assert.equal(publishStep.primitive, 'pointer.click');
assert.match(publishStep.when, /input\.approval = 'APPROVE PUBLISH'/);
assert.match(publishStep.when, /steps\.findComposer\.output\.text = input\.exact_text/);

for (const name of [
  'x.timeline.visible',
  'x.notifications.visible',
  'x.thread.visible',
  'x.reply.composer',
]) {
  const item = projection(name);
  assert.ok(item, `missing ${name}`);
  assert.match(item.snapshot.projection.expression, /source_url': url/);
  assert.doesNotMatch(item.snapshot.projection.expression, /source\.url/);
}

const thread = projection('x.thread.visible');
assert.ok(thread.summaries.some((summary) => summary.name === 'agent_context'));
assert.ok(thread.postconditions['x.reply.publish_approved']);

const composer = projection('x.reply.composer');
assert.match(composer.snapshot.projection.expression, /\$type\(records\.composer\.text\)/);
assert.match(composer.snapshot.projection.expression, /\$length\(\$draft\)/);

const unsupportedPropertyNames = new Set([
  'href',
  'dateTime',
  'aria-label',
  'role',
  'disabled',
]);
for (const item of map.state_projections) {
  for (const extraction of item.snapshot.extract) {
    for (const field of Object.values(extraction.fields || {})) {
      assert.notEqual(field.selector, ':scope');
      if (field.property) assert.ok(!unsupportedPropertyNames.has(field.property));
    }
  }
}

assert.match(map.notes.text_extraction_gotcha, /pseudo-attribute 'text'/);
console.log('X outreach regression contracts are present.');
