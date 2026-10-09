# Daedalus: Clank Character Forge

Daedalus is an open-source browser extension that provides a local creator workspace for building ClankWorld characters, preparing roleplay prompts, and planning larger settings and stories.

It runs on `https://www.clank.world/create` and uses Manifest V3. Work is organized into local Daedalus projects so creators can develop and review their material before explicitly applying selected fields to Clank.

**Current release: 1.3.0 — The Storycraft Update**

## Install the extension

1. Download the packaged `Daedalus-Clank-Character-Forge-1.3.0.zip` from the project's releases or project page.
2. Extract the ZIP to a folder you intend to keep.
3. Open `brave://extensions` in Brave or `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
6. Open `https://www.clank.world/create`. The Daedalus launcher should appear on the character creation page.

To remove the extension, use the browser's extension management page. Export any Daedalus project or backup you want to keep before removing browser data or the extension.

## Permissions and data

- **`storage`** is used for Daedalus settings, projects, snapshots, and reusable creator libraries.
- **`https://www.clank.world/*`** host access allows the extension to detect and interact with the character-creation page. The content script is configured to run on `https://www.clank.world/create*`.
- Daedalus is designed around browser-local project storage. Its code does not require a Daedalus account or a Daedalus-hosted service.
- Applying content to Clank is an explicit creator action. Planning / Storycraft is not automatically synchronized to Clank.
- RP Systems prepare prompt instructions; they do not run a separate runtime roleplay simulation.

## Release 1.3.0 — The Storycraft Update

This build combines the Creator Guidance work from 1.1, the Living World / RP Systems work from 1.2, and the expanded Storycraft Planning suite. Daedalus remains creator-side: Planning never auto-syncs to Clank, and RP Systems generate prompt instructions rather than running a chat-time simulation.


## Opening experience

Daedalus now includes a polished forge-opening sequence:

- full first-open splash
- compact animation on later opens
- Full / Minimal / Off preference
- replayable from the **Intro** button in the top bar
- preferences persist locally

## RP Systems Dialogue reinforcement

RP Systems can optionally create a dedicated structured Dialogue Example that demonstrates continuity instead of only describing it in instructions.

Creators can choose:

- **State only**
- **Natural RP**
- **HUD demonstration**
- whether HUD/state-display lines are included
- manual update or automatic update when Systems change

The generated entry is clearly marked **SYSTEMS** in the Dialogue Builder and can be updated or removed without deleting the RP Systems configuration.

## New in 1.3 — Storycraft Planning

The Labyrinth now shares one project data model with several specialized planning views:

- **Canvas** — visual node graph
- **Library** — searchable entity library, with favorites prioritized
- **Timeline** — Events and Scenes ordered by dates, chapters, or creator-defined labels
- **Plot Board** — drag Plot Threads between Backlog, Active, Blocked, and Resolved
- **Relationships** — cast/faction relationship matrix plus editable connection explorer
- **Planning Document** — human/AI-friendly Markdown or plain-text planning export studio

Storycraft remains completely local and is never automatically applied to Clank.

## Advanced Labyrinth editor

The graph editor now includes:

- multi-select with Shift/Ctrl click
- Shift-drag marquee / box selection
- move selected nodes as a group
- Ctrl+A to select visible nodes
- Ctrl+C / Ctrl+V internal Planning copy and paste
- copied groups preserve relationships between copied nodes
- Ctrl+D duplicates the current selection
- alignment tools: left, right, top, bottom, horizontal center, vertical center
- horizontal and vertical distribution
- arrange current selection into a clean grid
- fit selection to viewport
- create a Frame around the current selection
- bring selection to front / send to back
- bulk lock/unlock and favorite/unfavorite
- undo / redo isolated per project
- auto-arrange visible unlocked nodes
- Snap to Grid
- clickable minimap
- selection spotlight
- hide/reveal Planning entities
- lock individual node positions
- favorite nodes
- recently edited entities naturally surface in Library
- richer search including custom fields
- custom fields on every dossier

## Relationships and connections

Connections now support:

- directional or neutral/bidirectional relationships
- arbitrary labels
- multiple relationships between the same two nodes
- parallel wires are visually separated rather than stacked exactly on top of each other
- categories: Relationship, Ownership, Membership, Location, Plot, Knowledge, Conflict, Custom
- solid, dashed, or dotted wire styles
- private relationship notes
- relationship label presets
- editing and deletion directly from dossiers, graph wires, or the Relationships view

## Frames / groups

Frames now support:

- explicit member IDs when created around a selection
- select all members
- moving explicit members with the Frame
- lock/unlock
- visual color cycling
- collapse/expand
- collapsed Frames hide their explicit members from the Canvas while keeping them in project data
- duplicate a Frame together with its explicit member nodes and internal relationships
- resize and rename

## Deeper Storycraft dossiers

Planning entities retain their original type-specific fields and now also support creator-defined custom fields.

Storycraft-focused dossier additions include richer support for:

- character arc starting state, pressure, and possible end state
- faction hierarchy and ideology
- power source and core rules
- event story beat / chapter
- Plot Thread act/arc and dependencies
- mystery reveal beat
- Scene timeline order
- node favorites, locking, hiding, and updated timestamps

## Planning templates

Templates now include more useful starter relationships instead of only loose nodes. Current templates include:

- Single Character RP
- Romance
- Adventure Party
- Horror Mystery
- Multi-Character Ensemble
- Fantasy World
- Academy / School
- Manor / Household
- Political Intrigue
- Detective Mystery
- Blank Canvas

Template cards show node/link/frame counts before creation.

## Planning Document / AI handoff

The new Planning Document view turns the project graph into a readable planning brief rather than raw JSON.

Options include:

- Compact / Standard / Full detail
- Markdown preview
- Plain-text preview
- include/exclude secrets and hidden truths
- include/exclude creator notes
- include/exclude empty sections
- include/exclude hidden entities
- include/exclude relationships
- include/exclude Timeline
- include/exclude Plot Board
- Planning Frames / groups summary
- custom fields
- relationship categories and notes in Full mode
- download `.md`
- download `.txt`
- copy the generated document

JSON Planning export/import remains available for Daedalus-native backups and transfers.

## 1.2 — RP Systems Studio

The **RP Systems** workspace lets creators choose what a roleplay should keep track of without needing to write the prompting manually.

Available systems:

- World State
- Inventory & Equipment
- Time, Date & Seasons
- Weather & Climate
- Location & Spatial Continuity
- Internal Thoughts
- Relationship / Affinity
- Health & Conditions
- Objectives / Quests
- Mystery & Clues
- Knowledge & Secrets
- Currency & Economy
- Clothing & Appearance Continuity
- Persistent World Objects
- Skills & Stats
- Reputation & Factions

Every system is optional and individually configurable.

### Behavior Recipes

Built-in recipes combine sensible RP Systems, HUD blocks, and existing AI/RP rule foundations:

- Cozy Domestic
- Survival Horror
- RPG Adventure
- Romance / Slow Burn
- Detective Mystery
- Ensemble Drama
- Fantasy Adventure

Creators can also save custom reusable Behavior Recipes across projects.

### State Display / HUD Designer

Built-in blocks include Time, Date, Season, Weather, Location, Health, Inventory, Relationship, Objective, Currency, Active Cast, and custom blocks.

Creators can reorder blocks, rename labels, choose top/bottom placement, select Minimal/Compact/Detailed output, choose when the state appears, and preview the generated format.

The HUD is prompt-generated. Daedalus does not inject a runtime overlay into Clank chat.

## Creator Guide & Guided Creation

- Character Creation 101 workspace
- contextual explanations for Character Prompt, Dialogue, Scene, Initial Messages, Rules, Fragments, Planning, and RP Systems
- Basic vs. More Useful examples
- Guidance On/Off preference
- full Guided Creation wizard
- “I’m not sure” coaching
- genre-specific rules and Systems recipe suggestions
- the wizard writes directly into the same normal Daedalus project

## Character workspace

- Raw Character Prompt editor using Clank's 25,000-character limit
- Find & Replace
- Copy and Focus modes
- Prompt heading outline
- `{{char}}` / `{{user}}` helpers
- structured Builder for Identity, Appearance, Personality, Behavior, Voice, Relationships, Backstory, Goals, and Rules
- reorderable Builder section order
- Builder compilation preserves the current RP Systems section

## Dialogue, Scene, and Initial Messages

- raw and structured Dialogue Example workflows
- raw and structured Scene Builder workflows
- multiple Initial Messages with private labels
- Clank character-limit counters
- add, duplicate, reorder, and delete structured entries
- explicit synchronization back into Clank

## Projects and backups

- multiple local projects
- autosave and refresh recovery
- project variants
- recovery snapshots
- Project JSON import/export
- full Daedalus backup/restore
- custom rules
- custom fragments
- custom Behavior Recipes
- private project notes
- Import current Clank form
- Apply individual sections or Apply All
- Planning, Storycraft fields, RP Systems, custom fields, Frames, and relationship metadata persist in project backups/snapshots

## Inspector

The Inspector reports errors, warnings, and suggestions instead of a fake quality score.

Checks include Clank limits, missing fields, malformed variables, unfinished placeholders, repeated prompt text, scene consistency, Rules synchronization, RP Systems synchronization, HUD conflicts, and prompt size after Systems compilation.

## Themes and readability

- neutral dark theme by default
- persistent white/light theme
- larger helper / micro text for improved readability
- responsive layouts for narrower desktop windows

## Current boundaries

- Daedalus does not run RP Systems at chat runtime. It generates instructions Clank's AI will receive.
- Planning / Storycraft never automatically synchronizes to Clank.
- Character and Scene image file pickers remain manual because browsers intentionally prevent restoring arbitrary local file paths into file inputs.
- Daedalus does not automate Clank's character-tags widget.
- Clank remains responsible for final publishing and server-side validation.


## Contributing

Bug reports, focused improvements, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for project boundaries and a suggested verification workflow.

## License

Daedalus is released under the [MIT License](LICENSE).
