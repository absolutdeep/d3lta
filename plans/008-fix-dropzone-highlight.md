# Plan 008: Fix dnd-kit dropzone highlight

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7b94eca..HEAD -- components/theme/theme-dropzone.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness / UX
- **Planned at**: commit `7b94eca`, 2026-08-02

## Why this matters

The theme dropzone uses `useDroppable` from `@dnd-kit/core` to drive a visual
highlight (`isOver` → `border-primary`), but the actual file/URL drops are
handled by **native HTML5 drag events** (`onDragOver`/`onDrop`). dnd-kit's
`isOver` only becomes true when a **dnd-kit** draggable is dragged over the
zone — which never happens here, because there are no dnd-kit draggables in the
app. So the highlight never triggers on a real file drag, and the `isOver`
state is dead code. The dropzone looks unresponsive even though drops work.

The fix: drive the highlight from the native drag events instead of dnd-kit.
Track `dragOver` state with `useState`, set it in `onDragEnter`/`onDragOver`,
clear it in `onDragLeave`/`onDrop`. This makes the visual feedback match the
actual interaction.

## Current state

- `components/theme/theme-dropzone.tsx`:
  - Line 4: `import { useDroppable } from "@dnd-kit/core";`
  - Lines 27–29:
    ```ts
    const { isOver, setNodeRef } = useDroppable({
      id: "theme-dropzone",
    });
    ```
  - Lines 125–135: the drop zone div:
    ```tsx
    <div
      ref={setNodeRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleNativeDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        dropState === "loading" && "opacity-50 pointer-events-none"
      )}
    >
    ```
- `handleNativeDrop` (lines 54–83) handles file drops and text/URL drops.

**Repo conventions to match**:
- Components use `useState`/`useCallback` from React (see the existing
  `dropState`/`message` state in this file).
- `cn()` from `@/lib/utils` for conditional classes.
- The `SOURCE` constant pattern.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm run lint`          | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm run build`         | exit 0              |
| Test      | `pnpm test`              | all pass (if plan 001 landed) |

## Scope

**In scope** (the only files you should modify):
- `components/theme/theme-dropzone.tsx`

**Out of scope** (do NOT touch):
- `@dnd-kit/core` dependency — it's still used for `useDroppable`'s `setNodeRef`
  (which is just a ref; you can keep it or replace with a plain `useRef`).
- Any other component.
- The drop-handling logic (`handleNativeDrop`, `handleFileSelect`,
  `handleUrlSubmit`) — only the highlight state changes.

## Git workflow

- Branch: `advisor/008-fix-dropzone-highlight`
- Commit message style: conventional commits, e.g.
  `fix: drive dropzone highlight from native drag events`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add native drag-over state

In `components/theme/theme-dropzone.tsx`, add a `dragOver` state alongside the
existing `dropState`/`message` state (around line 23):

```ts
const [dragOver, setDragOver] = useState(false);
```

**Verify**: `npx tsc --noEmit` exits 0.

### Step 2: Wire the drag events

Replace the `useDroppable` usage. You have two options:

**Option A (preferred) — drop dnd-kit entirely for this zone.** Remove the
`useDroppable` import (line 4) and the `useDroppable` call (lines 27–29). Use a
plain `useRef` for the node if you need a ref (you don't currently use
`setNodeRef` for anything except the div's `ref`). Update the div:

```tsx
<div
  onDragEnter={(e) => {
    e.preventDefault();
    setDragOver(true);
  }}
  onDragOver={(e) => {
    e.preventDefault();
    setDragOver(true);
  }}
  onDragLeave={(e) => {
    e.preventDefault();
    setDragOver(false);
  }}
  onDrop={(e) => {
    e.preventDefault();
    setDragOver(false);
    void handleNativeDrop(e);
  }}
  className={cn(
    "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
    dragOver
      ? "border-primary bg-primary/5"
      : "border-muted-foreground/25 hover:border-muted-foreground/50",
    dropState === "loading" && "opacity-50 pointer-events-none"
  )}
>
```

Note: `handleNativeDrop` already calls `e.preventDefault()` and
`e.stopPropagation()` internally (lines 56–57), so calling it after
`setDragOver(false)` is fine. The `onDragLeave` fires when dragging over child
elements, which can cause flicker; to avoid it, check `e.currentTarget.contains(e.relatedTarget as Node)` in `onDragLeave` and only clear if the related target is outside:

```ts
onDragLeave={(e) => {
  e.preventDefault();
  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
    setDragOver(false);
  }
}}
```

**Option B — keep `useDroppable` for the ref but drive highlight from native
events.** Keep `const { setNodeRef } = useDroppable({ id: "theme-dropzone" })`
and `ref={setNodeRef}`, but replace `isOver` in the className with `dragOver`
and add the native handlers as in Option A. This keeps the dnd-kit dependency
wired but makes the highlight correct.

Prefer **Option A** — it removes the dead dnd-kit usage and the `@dnd-kit/core`
import from this file. (The `@dnd-kit/core` package stays in `package.json`
because it's still a declared dependency; removing it from the manifest is a
separate decision — see plan 002, which currently keeps `@dnd-kit/core`.)

**Verify**: `npx tsc --noEmit` exits 0.

### Step 3: Verify the full build

```bash
pnpm run lint
npx tsc --noEmit
pnpm run build
```

**Verify**: all three exit 0.

### Step 4: Manual smoke test (optional but recommended)

If a dev server is available, on `/themes`:
1. Drag a `.json` file over the drop zone → the border highlights
   (`border-primary bg-primary/5`).
2. Drag it away without dropping → the highlight clears.
3. Drop the file → the highlight clears and the import runs.

**Verify**: the highlight appears on drag-over and clears on leave/drop.

## Test plan

- No new unit tests required (this is a visual/interaction fix; testing native
  drag events in jsdom is unreliable). If plan 001 has landed, ensure
  `pnpm test` still passes.
- The verification is the build + typecheck + lint passing, plus the manual
  smoke test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "useDroppable" components/theme/theme-dropzone.tsx` returns no matches (if Option A)
- [ ] `grep -n "dragOver" components/theme/theme-dropzone.tsx` matches (state + handlers present)
- [ ] `grep -n "onDragEnter\|onDragLeave" components/theme/theme-dropzone.tsx` matches
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 008 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- You find that `useDroppable`'s `isOver` is used elsewhere in the file beyond
  the className (e.g. in logic) — stop and report rather than removing it.

## Maintenance notes

- If a future feature adds real dnd-kit draggables (e.g. drag-from-library to
  the dropzone), the `useDroppable` approach can be reintroduced for
  cross-draggable highlighting. Until then, native events are the correct
  driver.
- The `onDragLeave` `relatedTarget` check prevents flicker over child elements;
  if the dropzone gains complex children, revisit this.
- `@dnd-kit/core` remains a dependency even after this plan (it's still in
  `package.json`). If the whole dnd-kit suite ends up unused, that's a
  follow-up for plan 002's dependency cleanup.