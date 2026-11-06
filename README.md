# Herdr Session Labels

A personal Herdr layout that keeps the tab name and the agent's session name together. Codex, Claude Code and compatible OpenClaw adapters get live session names in pane headers; identical sidebar labels gain a terminal address that does not shrink with the label.

![Herdr Session Labels](preview.png)

## Install

Tested on Herdr Desktop 0.1.13 only. Later versions have not been validated. This is not a plugin for the legacy Herdr terminal application.

Ask your agent to read `RECIPE.md` and the files in this folder, then install the layout following your Herdr app's `AGENTS.md`. Copy `layouts/session-labels.json` and the two directories under `mods/` into the corresponding directories in your Herdr app home. Never overwrite existing names: rename the incoming layout/mod directories and update their references if they already exist.

Run `herdr-app check` on both copied mod directories, then select the Herdr Session Labels layout. Return to your previous layout to disable it. No changes to agents, shell configuration, model providers, hooks or keybindings are needed.

## Behavior

- Sidebar: `Space · Tab · Session` in Priority view; the space is a group heading in Grouped view.
- Identical displayed identities within a space gain their terminal address.
- Full identity is available on hover when text is truncated.
- Pane headers follow each supported agent's own title and append an address for matching names within the tab.
- Existing focus, status, pinning and sub-agent tree controls are retained.
- Automatic tab numbers are deliberately retained as tab context. Other agent types keep the cloned sidebar's labeling behavior.

The layout does not rename the tab or the agent's saved conversation. It presents the live terminal title. It makes no network calls and launches no programs automatically. User actions use Herdr commands to focus, split, zoom, close and pin terminals, and to open the existing sort menu; storage remembers view state and pin migration.

## Compatibility and limits

Tested with the Herdr 0.1.13 native mod renderer on macOS and controlled OSC 2/7501 terminal fixtures. Real title captures and their limits are recorded in tests/title-captures.json. No claim of Linux/Windows native testing is made.

Codex parsing removes an observed leading braille activity glyph and expects its `session | folder` title, optionally preceded by a known bracketed status component (synthetic regression coverage; not observed in the current captures). Claude Code uses its terminal title after removing one observed leading ✳ or ◐ status glyph. Other Claude glyphs have not been verified. OpenClaw requires an adapter that emits both status reports and a terminal title `OpenClaw | display name`; this repository does not include or install that adapter. If no recognized name exists, the display falls back to the program and terminal identity.

Long text still truncates in a narrow sidebar; hover shows the complete identity. The compact rail displays numbered agents rather than names. Personal clones do not automatically receive future upstream mod changes.

## Development

`node tests/names.cjs` (Node.js 18 or later) exercises the actual mods with mock element builders. These tests do not replace native visual checks. `tests/baseline/agents.js` is the unmodified shipped 0.1.13 sidebar used to reproduce the original shared-tab label collision.

This is an independent layout, not an official Herdr fix. Upstream already added per-agent titles in shared tabs in [a167060](https://github.com/herdrdev/herdr-app/commit/a167060ef1bf5180ba93e4cd7de4f92267b9775b). This layout keeps tab context as an additional preference, following [Herdr's contribution policy](https://github.com/herdrdev/herdr-app/blob/master/CONTRIBUTING.md).

See `NOTICE` for provenance and `LICENSE` for Apache-2.0 terms.

The title formats are conventions rather than a session-name API. A name beginning with a recognized status glyph and a space is ambiguous and may lose that prefix. Unrecognized Codex formats use the program/address fallback; they are not silently claimed to be supported. Kept-subagent filtering comes from upstream master; its mock tests pass, but native subagent navigation has not been verified.
