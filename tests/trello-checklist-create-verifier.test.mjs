import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const map = JSON.parse(fs.readFileSync(new URL('../sites/trello.com/board/actions.json', import.meta.url), 'utf8'));
const action = map.tools.find((candidate) => candidate.name === 'trello.card.checklist.create');

test('checklist.create verifies container text without filtering the locator by input title', () => {
  assert.ok(action, 'missing trello.card.checklist.create');
  const verify = action.workflow.steps.find((step) => step.id === 'verifyChecklist');
  assert.equal(verify.args.locator.selector, "[data-testid='checklist-container']");
  assert.equal('text_contains' in verify.args.locator, false);
  const settle = verify.after_each.args.locator;
  assert.equal(settle.selector, "[data-testid='checklist-container']");
  assert.equal('text_contains' in settle, false);
  assert.match(action.description, /false workflow_retry_exhausted failures after a successful create/);
});
