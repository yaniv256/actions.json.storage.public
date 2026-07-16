import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const map = JSON.parse(fs.readFileSync(new URL('../sites/trello.com/board/actions.json', import.meta.url), 'utf8'));
const action = map.tools.find((candidate) => candidate.name === 'trello.card.checklist.create');

test('checklist.create verifies the exact title across every mounted checklist', () => {
  assert.ok(action, 'missing trello.card.checklist.create');
  const verify = action.workflow.steps.find((step) => step.id === 'verifyChecklist');
  assert.equal(verify.primitive, 'dom.observe.attributes');
  assert.equal(verify.args.selector, "[data-testid='checklist-title']");
  assert.deepEqual(verify.args.attributes, ['text']);
  assert.equal(verify.args.max_matches, 200);
  assert.match(verify.retry_until, /matches\[attributes\.text = \$t\]/);
  const settle = verify.after_each.args.locator;
  assert.equal(settle.selector, "[data-testid='checklist-section']");
  assert.equal('text_contains' in settle, false);
  assert.match(action.workflow.output, /\$titles := \[steps\.verifyChecklist\.output\.matches\.attributes\.text\]/);
  assert.match(action.workflow.output, /'checklist_text': \$join\(/);
  assert.match(action.description, /across every mounted checklist title/);
});
