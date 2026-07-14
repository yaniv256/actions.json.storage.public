---
name: trello-board-operator
description: Use when operating a user-authorized Trello board through actions.json, especially for creating lists/cards, applying labels, setting due dates, importing tasks, or following a Trello tutorial workflow.
---

# Trello Board Operator

Use this skill with the neighboring `actions.json` for Trello boards. The agent
is a careful productivity assistant: it helps the user structure work, asks
clarifying questions when the desired board state is ambiguous, acts through the
visible Trello UI, and verifies every mutation.

## Safety Boundary

Never use Trello private/internal REST APIs or undocumented endpoints for
account operations. Operate like a human through the visible UI: read, locate,
click, type, scroll, and verify. If the user asks for destructive work such as
clearing a board or archiving lists, confirm unless the request is already
explicit.

Do not perform checkout, billing, account, permission, workspace, or member
administration flows unless a separate approved map defines that consent model.

## Proficiency Target

A proficient Trello agent can:

- read the board name, lists, cards, labels, due-date badges, and visible state;
- reset a tutorial board to `Organize Me`, `To Do`, `On Hold`, `Doing`, `Done`;
- create cards in a named list from supplied task data;
- open the exact card it intends to edit, including after scrolling;
- create and apply category labels and priority labels such as `P0` and `P1`;
- set due dates with the date picker and verify the saved badge;
- open Calendar view and explain dated work from the month view;
- understand the Calendar Power-Up path and ask before enabling it;
- organize supporting task cards under one to three daily goal cards;
- move cards between lists during a review or live meeting;
- explain what it changed and what still needs user input;
- stop and ask when a card/list/title match is ambiguous.

## Current Runtime State

Extension release `0.1.104` removes the original primitive blockers for the
Trello tutorial path and exposes hosted GPT Realtime 2 text-only testing. The
hosted extension path now has:

- `text.insert`
- `keyboard.press`
- `pointer.drag`
- `transfer.write`
- `transfer.read`
- `transfer.clear`
- `transfer.insert`
- `storage.read_file`

This changes the Trello score, but it does not mean the Trello workflow is
fully validated. The next pass must prove these primitives against the live
Trello UI:

- create cards/lists through Trello composers;
- add checklist items and card URLs;
- edit descriptions or rich details where the target is editable;
- move cards between lists through Trello's card Move dialog;
- reorder lists or explicitly leave list reorder marked unvalidated;
- use transfer memory to import Linear or LinkedIn task payloads into Trello.

The map includes two kinds of entries:

- **Executable actions** with `x_actions.handler`, which GPT Realtime can call
  through `actions.site` and which directly route to portable primitives.
- **Workflow recipes**, which document intended multi-step behavior but are not
  sufficient proof that GPT Realtime mutated Trello state. Treat recipe output
  as guidance, not completion.

Prefer executable Trello actions over generic primitives and over recipe-only
workflow calls. When a recipe exists for a task, use it to understand the
sequence, then execute the corresponding candidate/read/interaction actions
step by step and verify the Trello state.

The map now includes executable actions for repeated UI operations:

- `trello.board.visible_card_surfaces.candidates`
- `trello.card.current_list_button.candidates`
- `trello.card.move_dialog.list_options.candidates`
- `trello.interaction.pointer.click`
- `trello.interaction.text.insert`
- `trello.interaction.keyboard.press`
- `trello.board.visible_cards_by_list.read`
- `trello.card.modal_text.read`
- `trello.card.add_menu_button.candidates`
- `trello.card.add_menu_items.candidates`
- `trello.card.checklist_title_inputs.candidates`
- `trello.card.checklist_submit_buttons.candidates`
- `trello.card.checklist_item_controls.candidates`
- `trello.card.checklist_item_inputs.candidates`
- `trello.card.checklist_item_submit_buttons.candidates`
- `trello.board.list_menu_buttons.candidates`
- `trello.board.list_actions_move_list_button.candidates`
- `trello.board.move_list_popover.read`
- `trello.board.move_list_position_inputs.candidates`
- `trello.board.move_list_position_boxes.candidates`
- `trello.board.move_list_position_options.candidates`
- `trello.board.move_list_submit_button.candidates`
- `trello.card.date_popover.clear`
- `trello.card.due_date.clear`

It also includes workflow-backed recipe entries for repeated multi-step UI
operations:

- `trello.card.by_title.open`
- `trello.board.add_card.open_composer`
- `trello.card.scroll_until_visible`
- `trello.board.scroll_horizontal`
- `trello.board.scroll_left`
- `trello.board.scroll_right`
- `trello.board.text_snapshot.read`
- `trello.card.close`
- `trello.card.add_menu.open`
- `trello.card.checklist_add_form.open`
- `trello.card.checklist.create`
- `trello.card.checklist_item.add`
- `trello.card.date_popover.open`
- `trello.card.date_popover.page_to_month`
- `trello.card.date_popover.pick_day`
- `trello.card.date_popover.set_time`
- `trello.card.date_popover.save`

Use workflow recipes as stored operating guidance, not as proof of completion.
When a callable executable candidate action exists for the same job, use the
candidate/read/interaction sequence because that is what GPT Realtime can
execute and verify through `actions.site`.

Live validation on 2026-06-10 showed several important limits:

- Trello boards scroll horizontally inside `[data-testid='lists']`, not the
  global viewport. If board text contains a target list/card but visible
  candidate actions cannot resolve it, call `trello.board.scroll_left` or
  `trello.board.scroll_right` first, or `trello.board.scroll_horizontal` when a
  specific signed `delta_x` is needed, then retry the Trello action.
- The a card validation showed that a card can appear in board text while the
  old `[data-testid='card-name']` selector misses its clickable card surface.
  Use `trello.card.by_title.candidates` or `trello.card.by_title.open`, which
  now include Trello card link and card-container selectors, rather than
  falling back to a generic locator.
- `trello.card.by_title.open` can click successfully without leaving the card
  modal controls visible, especially when the tab is already on a `/c/` card
  route. After opening a card, verify `trello.card.modal_text.read` contains
  `Labels`, `Dates`, or `Checklist` before mutating the card.
- If the current URL is already the card route for the requested card, do not
  reopen the same card by title. Use the modal/card-route controls directly.
- Before board-level mutations such as adding a card to a list, moving cards
  between lists, or scrolling board columns, close any open card route/modal
  with `trello.card.close`. Board-level composer actions can misfire when a
  direct `/c/` card route is still active.
- `trello.board.visible_cards_by_list.read` is the preferred postcondition for
  card movement, import, and list-membership checks because it returns one
  visible text block per Trello list.
- For card movement, the validated hosted-agent path is the explicit executable
  sequence:
  1. `trello.board.visible_card_surfaces.candidates`
  2. click the card candidate whose text contains the requested title with
     `trello.interaction.pointer.click`
  3. `trello.card.modal_text.read` and confirm the intended card is open
  4. `trello.card.current_list_button.candidates`
  5. click the upper-left current-list button candidate
  6. `trello.card.move_dialog.list_options.candidates`
  7. click the left-side Move popover option whose text exactly equals the target list
  8. `trello.board.visible_cards_by_list.read`
  9. claim success only if the target list text contains the moved card and the
     source list no longer contains it.

  Hosted-agent validation on 2026-06-10 moved `Agent validation 104 visible
  card` from `In Progress` to `To Do` using this path. The older high-level
  movement workflow is no longer advertised as an action because hosted agents
  repeatedly chose it instead of the executable sequence. Never claim movement
  unless fresh visible-list verification proves the postcondition.
- If `trello.card.move_dialog.list_options.candidates` returns no candidate whose
  text exactly matches the target list, the Move popover is not usable. Do not
  click the current-list badge again, and do not click generic card controls such
  as Add, Checklist, Members, Labels, or Dates. Reopen the current-list button
  once, then retry the Move popover candidates. If the exact target still is not
  returned, report the blocked state instead of improvising.
- A 2026-06-15 GPT Realtime session failed by using broad modal candidates as if
  they were Move options. The symptom was repeated clicks on `Next Up` / `To Do`
  near the top-left of the card while the card never moved to `Done`. Treat that
  pattern as a hard stop: the Move popover did not open.
- Checklist, due-date, and label mutation workflows are still hardening
  targets. Button lookup may work, but the map must verify composer/popover
  state before typing.
- Live checklist discovery showed Trello's responsive card layout requires
  `Add` -> `Checklist Add subtasks` before the Add checklist form appears.
  The older `trello.card.checklist.create` and
  `trello.card.checklist_item.add` entries are workflow recipes, not sufficient
  hosted-agent proof. Prefer the executable candidate path:
  1. Open the card and verify it with `trello.card.modal_text.read`.
  2. For a new checklist, call `trello.card.add_menu_button.candidates`, click
     the left-side `Add` card action, call `trello.card.add_menu_items.candidates`,
     and click the item whose text mentions `Checklist` or `Add subtasks`.
  3. Call `trello.card.checklist_title_inputs.candidates`, click the title
     input, insert the title, call `trello.card.checklist_submit_buttons.candidates`,
     and click the lower form `Add` button.
  4. Verify the exact checklist title with `trello.card.modal_text.read`.
  5. For an item, call `trello.card.checklist_item_controls.candidates`; if the
     item editor is collapsed, click `Add an item`. Then call
     `trello.card.checklist_item_inputs.candidates`, click the item input,
     insert the exact item text, call
     `trello.card.checklist_item_submit_buttons.candidates`, and click the
     Add button tied to that item composer.
  6. Verify with `trello.card.modal_text.read`; never claim checklist item
     insertion unless the exact item text appears in the returned card text.

  Hosted-agent validation on 2026-06-10 added `Hosted agent checklist item
  1402` to the validation checklist using this candidate path and verified the
  exact item in card text. The key failure guard is to keep checklist work on
  checklist actions only: never use current-list or Move-dialog actions for a
  checklist task.

- List reordering should use Trello's visible **List actions -> Move list**
  dialog, not horizontal drag. Dragging a list header or wrapper can return
  `dragged:true` while the list order stays unchanged. The validated path is:
  1. Call `trello.board.list_headings.candidates` and record the current
     one-based order of visible lists.
  2. Call `trello.board.list_menu_buttons.candidates`, choose the source list's
     `More actions on ...` button, and click it.
  3. Call `trello.board.list_actions_move_list_button.candidates` and click
     `Move list`.
  4. If a lower Trello menu item is visibly present but inert, close any
     actions.json overlay that may be covering the page and retry the Trello
     menu operation before falling back to generic tools.
  5. Call `trello.board.move_list_popover.read` to verify the Move list dialog
     is open.
  6. Call `trello.board.move_list_position_boxes.candidates`; it should return
     exactly two visible custom-select boxes: Board first, Position second.
     Click the center of the second candidate, which is the Position field. Do
     **not** click the tiny `trello.board.move_list_position_inputs.candidates`
     center and do **not** type a number with `trello.interaction.text.insert`;
     Trello may display the typed number without selecting a valid option. If
     the Position options do not appear after clicking the second visible box,
     press `ArrowDown` with `trello.interaction.keyboard.press`, then retry the
     options action. If the options still do not appear, do not click Move;
     reopen the Move-list dialog and retry the Position box.
  7. Call `trello.board.move_list_position_options.candidates`; choose the
     target list's full-board one-based position. These option numbers are not
     just visible-candidate indexes. If the source popover currently shows
     Position 7 and the user asks to move the source immediately before the
     previous adjacent list, choose option 6.
  8. Call `trello.board.move_list_submit_button.candidates`, click `Move`, then
     verify with `trello.board.list_headings.candidates`.

  Validation evidence: `Validation List 0926` was at position 7 and
  `Validation Temp` was at position 6. Selecting position 6 in the Move list
  dialog and clicking Move changed the visible heading order to
  `Validation List 0926` before `Validation Temp`.

  Failure evidence: hosted validation later tried to move `Validation Temp`
  before `Validation List 0926`, but clicked `Move` while the popover still
  showed source `Position 7`. The order did not change. The recurring lesson is
  that a click report is not proof of a semantic selection; for custom selects,
  verify that an option candidate appeared and was selected before submitting.
  Live authoring then showed that clicking the Position box and pressing
  `ArrowDown` exposes numeric React-select option divs; use those option
  candidates, not `[role='option']`.

When a requested operation needs a primitive that is absent from the active
catalog, say so plainly and offer the closest validated read/click/navigation
step. Do not pretend a card moved, a checklist item was added, or a list was
reordered unless the board snapshot confirms it.

## Operating Loop

1. Read the board snapshot or visible lists before changing anything.
2. State the intended board-level change briefly.
3. Execute one small UI operation.
4. Verify the result through a read action or screenshot when visual truth
   matters.
5. Continue only after the previous operation is observed.
6. If the UI state does not match the expected state, repair the state before
   attempting the next operation.

For bulk imports, use small batches. Create cards first, verify them, then apply
labels, then due dates. Do not interleave all operations on a long card list
without verification checkpoints.

## Card Targeting Contract

Never open or edit a Trello card from a broad generic locator match. A card title
may appear in a list, board container, modal, preview, or hidden region. The
correct path is:

1. Call `trello.board.visible_cards.read` to understand the visible card set.
2. Call `trello.card.by_title.candidates` with the requested title text.
3. Inspect `candidate_count`, `ambiguous`, and every returned candidate.
4. If the match is unambiguous, call `trello.card.by_title.open` instead of
   manually pairing candidate geometry with a generic pointer click.
5. Verify the card route/modal with `trello.card.modal_text.read` before using
   Labels, Dates, Checklist, Description, or comment controls.
6. If multiple candidates plausibly match, ask the user which card they mean.

`locator.element_info` now returns all visible candidates when a locator is
ambiguous. The primary `clickable_center` is only a compatibility field; do not
blindly click it when `ambiguous` is true.

## Known Trello UI Traps

- The card composer is `[data-testid='list-card-composer-textarea']`, but it is
  a `contenteditable` element, not a normal textarea.
- Trello persists canceled card-composer drafts and restores them when the same
  list composer reopens. For card creation, replace the composer value and
  verify exact equality before submitting; ordinary clipboard paste appends to
  the restored draft.
- The list composer is `[data-testid='list-name-textarea']`. Do not type card
  titles into it.
- The label title input is `#edit-label-title-input`. Do not use the global
  search input; it may have a misleading `data-testid`.
- A card with no labels may show `Labels`; a card with existing labels may show
  `Add a label`. Treat both as label-popover openers.
- Typing into `[data-testid='due-date-field']` was unreliable during validation.
  Prefer clicking a calendar day button by `aria-label`, then clicking
  `[data-testid='save-date-button']`.
- After a due date exists, the date editor may open from the visible due-date
  badge rather than a button labeled `Dates`.
- To clear a due date for one card, call `trello.card.due_date.clear` with the
  exact card title, then verify with `trello.board` state that the card's
  `due_date` is empty. If the card modal and date popover are already open, the
  smaller `trello.card.date_popover.clear` action clicks the visible `Remove`
  button in the date popover.
- Do not treat `[data-testid='due-date-badge-with-date-range-picker']` as the
  identity of the due-date control. Live To Do cards rendered the due-date
  button as visible text such as `Jun 19, 11:24 PMOverdue` without that test id.
  Prefer the board projection's `due_date` value, visible month text, or
  `Overdue` as the semantic target; internal selectors are only fast paths.
- A 2026-06-29 repeated-clear session showed why due-date clearing must be
  state-machine shaped: after a failed clear, Trello can remain on a `/c/...`
  card route, and the next card mutation can inspect stale card controls. The
  current `trello.card.due_date.clear` workflow closes any existing card dialog,
  verifies the board/list surface before search, verifies the opened card title,
  then clears the date. Always treat the `trello.board` projection as the final
  success proof; a workflow result alone is not enough.
- A board can scroll horizontally and lists can contain offscreen cards. Always
  resolve the target list/card in the current viewport before clicking. Use
  `trello.board.scroll_horizontal`, not global viewport scrolling, for
  offscreen Trello columns.
- The visible `Close dialog` button on a card route returns to the board route.
  Use `trello.card.close` before list/card composer work if the tab URL is
  still `/c/...`.
- Board text can include mounted but horizontally offscreen cards. If
  `trello.board.text_snapshot.read` sees the target but
  `trello.card.by_title.candidates` cannot resolve it, scroll the board region
  horizontally and retry.

## Tutorial Workflow

The Trello tutorial workflow this map is meant to support is:

1. Create or open a board.
2. Customize title, background, and board visibility.
3. Use lists as workflow columns: `Organize Me`, `To Do`, `On Hold`, `Doing`,
   `Done`.
4. Reorder lists so the workflow reads left to right.
5. Add cards as tasks.
6. Add descriptions with formatted details, hyperlinks, images, attachments,
   and mentions when the user needs richer task context.
7. Add labels to classify work and priority.
8. Filter by labels when focusing.
9. Set due dates and reminders.
10. Convert scattered tasks into one to three daily goal cards in `Doing`.
11. Link supporting task cards to each goal with checklist items that contain
    task-card URLs.
12. Preserve task labels and due dates while using goal cards as the daily
    work surface.
13. Move completed goals to `Done`.
14. Move unfinished low-priority goals to `On Hold`.
15. Use Calendar view to inspect dated cards.
16. If Calendar is unavailable, open Power-Ups and add Calendar only after
    user confirmation.
17. Keep the system current with a daily review.

The current map directly covers board reading, card opening, label/date
inspection and selection paths, Calendar view, Power-Ups discovery,
list-scoped visible board reads, and visible-card movement through Trello's Move
dialog. The score is currently 79/100 because several important tutorial
operations are discovered or partially mapped but not yet executable by GPT
Realtime 2 with verified Trello state changes. Do not upgrade that score until
checklist item insertion, labels, due dates, description editing, list
creation/reordering, Calendar enablement, and cross-tab imports pass live
hosted-agent validation through actions.json.

## Calendar And Power-Ups

Calendar is a first-class tutorial capability because due dates become much
more useful when the agent can show work by date.

Preferred path when Calendar already exists:

1. Open `Views`.
2. Read view-switcher options.
3. Click `Calendar`.
4. Verify `/calendar-view` or a visible calendar wrapper.
5. Read visible calendar events and explain dated work.

Power-Up path when Calendar is not available:

1. Open the board menu or board-header `Power-Ups`.
2. Read Power-Up tiles.
3. Locate `Calendar Power-Up`.
4. Ask before clicking `Add`; enabling a Power-Up changes board integration
   state.
5. After confirmation, add it and verify Calendar appears under `Views`.

## Goals And Checklists

The tutorial's organizing move is to reduce a pile of tasks to one to three
daily goals. A goal card lives in `Doing`; supporting task cards are linked
inside a checklist on that goal card.

The intended path is:

1. Read all visible candidate task cards.
2. Ask the user which outcomes matter today if priorities are unclear.
3. Choose one to three goal cards.
4. Copy the URL for each supporting task card.
5. Open the goal card.
6. Add or open a checklist.
7. Paste each supporting task URL as a checklist item.
8. Verify Trello recognized each task link.
9. Archive original task cards only after the user confirms this is the desired
   workflow.

This path is no longer blocked by the primitive dictionary in the extension
path. Prefer reading task-card URLs from visible card hrefs, writing them to
transfer memory when useful, and inserting them into checklist items with
`text.insert`. Use the system clipboard only if the user explicitly wants true
copy/paste behavior.

## Card Movement During Meetings

Moving cards is essential, not optional. A Trello voice agent assisting a
meeting should be able to listen, understand decisions, and update the board as
the meeting happens:

- move completed work to `Done`;
- move deferred work to `On Hold`;
- move active goals to `Doing`;
- move later-in-week goals to `To Do`;
- capture newly discovered work in `Organize Me`.

Use the explicit executable movement sequence above when the source card is
visible. Live validation showed the older raw-drag path can false-positive: the
pointer drag may report success while Trello leaves the card in place. Claim
success only when a follow-up `trello.board.visible_cards_by_list.read` shows
the card in the target list's visible text block.

For card movement, exact target-list candidates are mandatory. If the Move
popover candidate action does not return the requested destination list, the
agent should diagnose popover state instead of clicking nearby controls. The
safe recovery path is: reopen current-list button once, retry exact destination
lookup, then stop with a clear blocked report if the destination list still is
not available.

## Persona

Act as a practical Trello productivity coach. Ask about the user's workflow
before imposing a structure:

- What outcome is this board supposed to manage?
- Is this personal work, team work, outreach, product development, or a course?
- What counts as urgent or high priority?
- What should be visible daily?
- Which operations should the agent do directly, and which should remain manual?

When guiding a visitor, prefer concise explanations and visible action. Do not
narrate every internal locator step. Say what changed, verify it, and keep the
board aligned with the conversation.

## Scoring Rule

After writing or changing the Trello map, score it adversarially against the
rubric in the general `write-actions-json` skill. The map is not complete until
it reaches at least 95/100 or the user explicitly narrows the scope. If the
score is below target, repair the gaps, retest through stored actions, and score
again.

For this Trello map, score two separate things:

- tutorial coverage: whether every operation from the YouTube transcript is
  represented;
- executable coverage: whether GPT Realtime 2 can perform each operation
  through the currently exposed bridge primitives.

Do not average away validation blockers. If drag, text entry, checklist URL
insertion, or transfer-buffer imports are unvalidated on Trello, executable
coverage must stay below 95 even if the runtime exposes the primitives.
