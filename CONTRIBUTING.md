# Contributing to Daedalus

Thanks for your interest in improving Daedalus.

## Before making a change

- Keep Daedalus focused on character creation, creator-side planning, and prompt preparation for ClankWorld.
- Keep Planning / Storycraft data separate from Clank synchronization. Planning must not be applied automatically.
- RP Systems generate instructions for the roleplay prompt; they are not a runtime chat engine.
- Preserve local project data and compatibility when changing the project store or export formats.
- Keep UI text readable and ensure dark and light themes remain usable.

## Suggested workflow

1. Create a branch for your change.
2. Make the smallest focused change that solves the issue.
3. Check JavaScript syntax for any edited `.js` files.
4. Load the extension unpacked in a Chromium-based browser and check the affected workflow on `https://www.clank.world/create`.
5. Check that existing project data remains intact after refresh and that changes only reach Clank when the creator explicitly applies them.
6. Describe the behavior changed and any manual verification performed in the pull request.

## Pull requests

Please include the reason for the change, a concise summary, and steps to verify it. For UI changes, screenshots or a short recording are helpful.
