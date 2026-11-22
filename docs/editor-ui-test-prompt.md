# Prompt: hands-on UI test of the web editor

Copy everything below the line into a new agent session at the repo root.

---

You are testing the Service Hub **web editor** (`/hub-admin/web/editor/<slug>`) the way a real
person building a website would, then fixing what you find. Work through the phases in order. Write
findings down as you go, not at the end.

## Context you need

- Read `docs/web-editor-plan.md` first. It records what was built, known bugs, and what is still open.
  Do not re-report items already listed there; build on them.
- The editor renders pages with the same components as the public site (`client/src/site/`). The
  canvas is an iframe (`iframe[title="Page canvas"]`). Editor chrome (toolbar, inspector, block
  picker, section picker, text-formatting toolbar, dialogs) lives in the main window.
- Key editor files: `client/src/pages/web/editor/` (`WebEditor.jsx`, `fluid/FluidSection.jsx`,
  `fluid/FluidBlock.jsx`, `EditorInspector.jsx`, `BlockPicker.jsx`, `SectionPicker.jsx`,
  `sectionTemplates.js`, `BlockSettingsPanel.jsx`, `InlineTextEditor.jsx`, `siteEditBridge.jsx`,
  `EditableImage.jsx`). Block markup: `client/src/site/SiteBlock.jsx`.
- Start the app with `npm run dev` (client on :3000, server on :4000). Drive it with Playwright
  (`@playwright/test` is installed; see `e2e/helpers.mjs` and `e2e/README.md`). Take screenshots
  constantly and look at them. Judge what a person would see, not just what the DOM contains.

## Safety rules (mandatory)

1. **Never open, edit or publish real site pages** (`home`, `about`, etc.). Work only on temporary
   pages created with `createFixturePage()` from `e2e/helpers.mjs`. They are created unpublished and
   hidden from the nav. Delete every temp page you create with `deleteFixturePage()`, and confirm at
   the end that no `e2e-` pages remain.
2. You may Publish a temp page to view its public render. Delete it afterwards.
3. **Intercept image uploads** (`POST /api/web/assets`) with a fake response. Uploads go to real
   Azure blob storage.
4. Do not change server data outside your temp pages, and never run `npm ci` (on this machine it
   wipes `node_modules`).
5. **Do not push.** Pushing to `main` deploys straight to production. Commit on a new branch and stop.
6. Auth: set `E2E_USERNAME` to a local admin account (ask the user if unknown). `sessionToken()`
   in the helpers mints a local session.

## Phase 1: Recreate real websites

1. Pick **4 real websites** to reproduce, read-only: two church or community-organisation homepages,
   one small-business site, and one polished Squarespace-built site. Screenshot each at 1440px and
   390px.
2. For each one, try to rebuild its homepage on a temp page using only the editor UI (block picker,
   section picker, inline editing, inspector, drag/resize). Do not edit data through the API.
3. Screenshot your rebuild next to the original. For every visible difference, decide which it is:
   - **Possible:** you got there; note how many steps it took and anything awkward.
   - **Possible but painful:** it works only with workarounds; say what the workaround was.
   - **Impossible:** a missing block, setting or layout capability; say exactly what is missing.

   Typical things to probe: full-bleed image sections, text over images, split image/text layouts,
   multi-column footers, logo strips, pricing or schedule tables, buttons in a row, cards with
   images, overlapping layered layouts, background colours per section, spacing control, fonts
   and sizes, and how all of it looks on mobile.

## Phase 2: Interrogate each block as a builder

For every block type in the block picker, and every ready-made section, use it for real and answer:

- **Function:** can it express what a real site needs (count of items, images, links, buttons,
  alignment, colours, spacing, variants)? What's missing?
- **Interface:** can you find every setting without guessing? Are the labels clear? Is anything only
  possible in one place and not where you'd look?
- **Intuitiveness:** did the first thing you tried work? Note every moment of hesitation,
  surprise, or "how do I…?". Note anything that changed that you didn't intend.
- **Design quality:** does the default output look professionally designed (typography,
  spacing, alignment, contrast, mobile)? Would you ship it?

## Phase 3: Every control, tested

1. Build an **inventory of every button, toggle, tab, menu item, input and keyboard shortcut**,
   region by region:
   - top toolbar
   - breakpoint switcher
   - section hover chrome
   - block toolbar and hover label
   - inspector, all tabs and section settings
   - block picker
   - section picker
   - text-formatting toolbar, all three variants: plain, title, text block
   - link field
   - image controls and dialog
   - layers panel
   - version history
   - save-as-template
   - keyboard-shortcuts dialog
   - preview mode
   - exit
   - empty states
2. Exercise **each one**. Record what it did, whether that matched its label or icon, and whether it
   worked at desktop, tablet and mobile.
3. Judge purpose and duplication. Every control must have a clear reason to exist. Where two
   controls do the same thing, recommend merging or removing one, and say which and why.
   Candidates to check:
   - the four "Add Section" entry points
   - the section-menu height toggle vs. the inspector's Height setting
   - the block toolbar's ✎ vs. clicking text
   - the eye/preview button vs. the external-link button
   - the toolbar "T" icon that opens keyboard help
   - the Layers toolbar button
   - Bring forward / Bring to front / Send to back
4. Also flag controls with no visible label or tooltip, unclear icons, touch targets under 32px, and
   anything unreachable by keyboard.

## Phase 4: Designer's view

Answer as a professional web/graphic designer:

- What tools would you expect that aren't here? For example: image/media block, button block,
  spacer/divider, columns, background images/video per section, overlays, global styles (fonts,
  colour palette, button styles), alignment guides, duplicate-to-mobile, reusable/saved sections,
  undo history, image cropping/focal point, animation.
- For each tool we do have: is it good enough, and is its default design good? Rank the top gaps
  by impact on what a site owner can make.

## Phase 5: Update the plan, then fix

1. Add a section to `docs/web-editor-plan.md` named `## UI test findings (<date>)` with:
   - a table: **ID | Area | Finding | Evidence (screenshot path) | Severity (blocker/major/minor) |
     Proposed fix | Effort (S/M/L)**
   - a "Merge/remove controls" list with the rationale for each
   - a "Missing capabilities" list ranked by impact
   - a short prioritised plan: what to fix now vs. later
2. **Fix** the blockers and majors that are S or M effort, highest impact first. Rules:
   - Keep the public site's output unchanged unless a fix intends to change it. Screenshot public
     pages before and after, and explain any intended difference.
   - Add or extend Playwright tests in `e2e/` for each fix; run `npm run e2e` until it passes
     twice in a row.
   - Build the client (`npm -w client run build`) and run the server tests (`npm -w server test`).
3. Mark each finding in the plan as fixed (with commit), deferred (with reason), or won't-fix (with
   reason).
4. Commit on a new branch (not `main`) and **do not push**.

## Report back

End with:
- the 4 reference sites and how close each rebuild got
- counts of findings by severity
- what you fixed
- what you deferred and why
- the merge/remove recommendations
- the top 5 missing capabilities
- test results
- the branch name

Give screenshot paths for the most important before/after comparisons.
