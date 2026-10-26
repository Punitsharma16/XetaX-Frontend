# XetaX UI redesign — rules (read before touching any template)

Goal: a cleaner, friendlier, fully responsive panel in the Agentic design language —
**same features, same behaviour, same words**. Only layout and styling change.

## Hard rules (do not break any)

1. **No functional change.** Do not change TypeScript logic, services, API calls, routes,
   guards, signals, inputs/outputs, form models or validation.
2. **No text change.** Labels, headings, button captions, placeholders, messages, option texts,
   column names and tooltips stay word-for-word (fix nothing, translate nothing).
3. **No key / name / value change.** Keep every `formControlName`, `name`, `id`, `[(ngModel)]`,
   `[value]`/`[ngValue]`, `routerLink`, query params, `data-*` attributes, `@for` track
   expressions, event bindings `(click)=…`, template refs `#ref` and CSS classes that TypeScript or
   specs use (search the component's `.ts` and `.spec.ts` for `querySelector`, `By.css`,
   `classList`, `.className`, `nativeElement` before renaming or removing any class).
4. **Nothing removed, nothing added** to what a user can do: every button, field, filter, column,
   tab, menu item and state stays, in the same order of operations.
5. Templates may be **re-wrapped** (extra `div`s, moving markup into cards / grids / toolbars,
   adding classes) as long as rules 1–4 hold. Prefer CSS-only changes when they achieve the look.
6. Accessibility may be **added** (aria-label on icon-only buttons, `for`/`id` pairs, `role`,
   `aria-live`), never removed.

## Design language (already in `src/styles.css`)

Tokens: `--brand-*` (indigo-violet primary `#5f37e3`), `--accent-*` (marigold, AI only),
`--surface-page/card/sunken/hover`, `--text-primary/secondary/muted`, `--border-subtle/strong`,
`--radius-sm/md/lg/xl` (6/10/14/20), `--shadow-xs…lg`, `--focus-ring`. Light + dark both work —
**never hard-code colours**; use the tokens.

Bootstrap classes are restyled globally (buttons, forms, tables, cards, badges, dropdowns,
modals → bottom sheet on phones, nav-tabs, pagination). New building blocks:

```html
<div class="page-header">
  <div class="page-header-text">
    <span class="page-eyebrow">Section</span>            <!-- optional, only if the text already exists -->
    <h1 class="page-title">…existing title…</h1>
    <p class="page-subtitle">…existing subtitle…</p>
  </div>
  <div class="page-actions">…existing buttons…</div>
</div>

<div class="card">
  <div class="toolbar">
    <div class="toolbar-search"><i class="bi bi-search"></i><input class="form-control" …existing…></div>
    …existing filters…
    <div class="toolbar-spacer"></div>
    …existing actions…
  </div>
  <div class="table-responsive">…existing table…</div>
</div>

<div class="empty-state">                                   <!-- only around an EXISTING empty message -->
  <div class="empty-state-icon"><i class="bi bi-inbox"></i></div>
  <p class="empty-state-title">…existing text…</p>
</div>

<div class="stat-card"><span class="stat-card-label">…</span><span class="stat-card-value">…</span></div>
<div class="form-section"><h3 class="form-section-title">…existing…</h3> …fields… </div>
<div class="form-actions">…existing Save / Cancel…</div>
<div class="card card-soft">…</div>   <div class="card card-interactive">…</div>
```

## Layout checklist per screen

- One page header (title left, actions right; wraps on phones).
- Content in cards with consistent padding; related fields grouped in `form-section`s on a
  responsive grid (`row g-3` + `col-12 col-md-6 col-xl-4`).
- Lists: toolbar (search / filters / actions) on top of the table inside one card.
- Empty / loading / error states visually clear (reuse existing text).
- **Responsive 360 → 1440+**: no horizontal page scroll (tables scroll inside `.table-responsive`),
  stacked columns on phones, actions wrap, modals usable on phones.
- Spacing on the 4px scale (Bootstrap `gap-2/3`, `mb-3/4`); no inline style for colours.
- Component CSS: keep it small, use tokens, no `!important` unless overriding Bootstrap utilities.

## Checks (lock script only — several agents share this repo)

```
bash /c/Users/punit/AppData/Local/Temp/claude/c--Users-punit-Desktop-projects-new-lms-ui/638521e6-f9ac-43b2-bde4-cd4b80d27566/scratchpad/xeta-ng.sh build
bash /c/Users/punit/AppData/Local/Temp/claude/c--Users-punit-Desktop-projects-new-lms-ui/638521e6-f9ac-43b2-bde4-cd4b80d27566/scratchpad/xeta-ng.sh test --watch=false --browsers=ChromeHeadless --progress=false --include='src/app/features/<feature>/**/*.spec.ts'
```

Baseline before the redesign: build OK, **252/252 tests pass**. Every spec of the features you
touch must still pass; run the full suite once at the end. If a spec fails because you renamed or
moved something it queries, put the selector back — do not edit the spec to fit.
