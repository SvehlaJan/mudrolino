# Custom Content Authoring Hardening Design

**Date:** 2026-07-04  
**Scope:** Parent-authoring quality pass for `/content`, covering editable words and praise. This builds on `2026-04-25-user-customisable-content-design.md`; it does not redesign the child games or replace the existing local-first repository.

---

## 1. Goal

The current custom content MVP lets parents add words and praise, record audio, and delete entries. The next pass should make that authoring experience harder to misuse:

- Parents should understand which entries are playable and which still need audio.
- Invalid custom words should be blocked before they enter the list.
- Duplicate custom entries should be blocked.
- Built-in defaults should be removable from the playable set without making recovery hard.
- Parent-created entries should be editable.

This is a parent-facing quality pass, not a broad redesign. The `/content` route remains the only management surface.

---

## 2. Approved Product Rules

### Entry Status

Words and praise use the existing `status: 'draft' | 'ready'` model.

- Parent-created words and praise are saved as `draft`.
- Draft entries are visible in `/content` but not child-facing.
- Recording custom audio promotes a draft entry to `ready`.
- Deleting custom audio demotes a parent-created entry back to `draft`.
- Games continue to consume only `ready` entries from `ContentContext`.

### Built-In Defaults

Built-in defaults are recoverable but not editable.

- Built-in words and praise can be hidden from the playable set.
- Hidden built-ins disappear from the normal list.
- Built-ins cannot be edited.
- `Restore defaults` restores hidden or missing built-in entries for that section.
- `Restore defaults` does not remove parent-created custom entries.
- `Restore defaults` does not delete custom audio recordings.

Implementation uses the existing `UserWord` and `UserPraise` shapes. A hidden default is represented by removing the default entry from the stored user list. Restore reconstructs missing defaults from locale content. No new status value is added for hidden defaults.

### Parent-Created Entries

Parent-created entries are editable and deletable.

- Editing custom word text, syllables, or emoji is allowed.
- Editing custom praise text or emoji is allowed.
- Editing a ready entry keeps its existing audio recording.
- The UI must make it clear that parents should record again if edited text no longer matches the recording.
- Deleting a parent-created entry also deletes its custom audio override.

---

## 3. Validation Rules

Validation should be shared between add and edit flows.

### Words

A custom word is valid when:

- `word` is non-empty after trimming.
- `emoji` is non-empty after trimming.
- `syllables` contains `2-4` hyphen-separated parts.
- Each syllable part is non-empty after trimming.
- The normalized word text is unique in the current locale.

Syllables should be normalized before saving:

- trim whitespace around the full field
- trim whitespace around each syllable part
- collapse repeated internal whitespace inside each part
- lowercase the final hyphen-separated value

Examples:

- `ja-ho-da` is valid.
- `ma - ma` saves as `ma-ma`.
- `auto` is invalid because it has no hyphen.
- `a-u-t-o-mobil` is invalid because it has 5 parts.

### Praise

A custom praise entry is valid when:

- `text` is non-empty after trimming.
- `emoji` is non-empty after trimming.
- The normalized praise text is unique in the current locale.

### Duplicate Detection

Duplicate checks are locale-scoped and case/spacing-insensitive.

- `Mama`, `mama`, and ` mama ` are duplicates.
- Multiple spaces inside text are treated as one space.
- Duplicate checks apply against ready entries, draft entries, and built-in defaults that are currently present in the user list.
- When editing an existing custom entry, its own current value is excluded from duplicate checks.

Hidden built-in defaults do not block adding a custom entry with the same text. If a parent later restores defaults, the restore operation should skip any default whose normalized text now collides with an existing custom entry and show a concise message that some defaults were skipped because matching custom entries already exist.

---

## 4. UI Behavior

The chosen direction is the conservative inline approach. Keep the current `/content` tabs and inline add forms, then improve validation and state clarity.

### Section Summary

The `Slová` and `Pochvaly` sections show a compact summary near the top:

- ready count
- draft count
- hidden defaults count, derived by comparing locale defaults with currently stored default entries

This summary is informational. It does not need to become a dashboard or a separate screen.

### Add Flow

The current inline add form stays.

- Validate after a field has been touched and again on save.
- Disable save while the form has blocking validation errors.
- Show concise inline messages next to the relevant field.
- On successful save, create a draft row immediately.
- The draft row should emphasize the record action.

### Row States

Rows should clearly distinguish:

- built-in ready entry
- custom ready entry
- custom draft entry

Draft rows should show a clear status such as `Koncept - nahrajte zvuk`.

Built-in rows:

- can play bundled/custom audio
- can record an override
- can hide from the playable set
- cannot be edited

Custom ready rows:

- can play audio
- can record again
- can edit
- can delete
- can delete custom audio, which returns the entry to draft

Custom draft rows:

- can record
- can edit
- can delete
- should not offer play unless a recording exists

### Restore Defaults

Each editable section gets a section-level restore action.

- `Slová`: restores missing built-in default words for the current locale.
- `Pochvaly`: restores missing built-in default praise entries for the current locale.
- Restore should be deliberate but not scary. A simple confirmation is enough because it does not delete parent-created content.
- After restore, the content context reloads and the summary counts update.

---

## 5. Data Flow And Boundaries

### Validation Helpers

Add small pure helpers under `src/content/` or a nearby shared module:

- normalize text for duplicate detection
- normalize syllables for storage
- validate word form data
- validate praise form data

These helpers should not know about React state, audio stores, or localStorage. They should accept plain values and existing entries, then return structured validation results.

### Repository And Provider

Extend the repository/provider API so the UI does not manipulate storage arrays directly.

Provider additions:

- `hideDefaultWord(id: string): Promise<void>`
- `hideDefaultPraise(id: string): Promise<void>`
- `restoreDefaultWords(): Promise<RestoreDefaultsResult>`
- `restoreDefaultPraises(): Promise<RestoreDefaultsResult>`

`hideDefaultWord` and `hideDefaultPraise` remove only entries with `isDefault: true`; they reject custom entries. For custom entries, the UI continues using delete.

`restoreDefaultWords` and `restoreDefaultPraises` compare locale defaults with the current stored list by stable default `audioKey`. Missing defaults are reinserted as `ready`, `isDefault: true`, with their original `audioKey`, unless their normalized text collides with an existing custom entry.

### Audio

Audio remains managed by `audioOverrideStore`.

- Recording saved for custom word/praise: save blob, then mark metadata `ready`.
- Custom audio deleted for custom word/praise: delete blob, then mark metadata `draft`.
- Custom audio deleted for built-in default: delete override only; bundled audio/TTS fallback remains available, and status stays `ready`.
- Hiding a built-in default should not delete any custom audio override for that default. If restored later, the override should still apply.

---

## 6. Error Handling

Validation errors block save and appear inline.

Storage errors should be visible to the parent:

- add/edit/delete/hide/restore failures should not silently disappear
- show a concise section-level error message
- keep the form or row state intact so the parent can retry

Recording errors leave the entry as draft and should use the existing recorder error handling if available. If the current recorder API does not expose enough error detail, the implementation can show a generic failure message.

---

## 7. Game Behavior

Child-facing game behavior should remain stable.

- Words, Syllables, and Assembly continue to receive only `ready` words.
- Praise overlays continue to receive only `ready` praise entries.
- Draft entries never appear in games.
- Hidden built-in defaults do not appear in games.
- Existing empty guards remain in place for word-dependent games.

The `2-4` syllable validation applies to new and edited custom words. Existing seeded defaults that are already present remain valid data. Assembly may continue to filter eligible words by its current rules if it still only supports a subset, but the parent UI should not allow newly authored words outside the agreed `2-4` syllable range.

---

## 8. Verification

Run the usual static checks:

- `npm run lint`
- `npm run build`
- `npm run test:audio`

Add focused verification for the parent content surface:

- invalid word with no hyphen is blocked
- word with 5 syllable parts is blocked
- valid `2-4` syllable word saves as draft
- duplicate word text is blocked case/spacing-insensitively
- valid praise saves as draft
- duplicate praise text is blocked case/spacing-insensitively
- draft rows are visibly marked and excluded from games
- recording promotes draft to ready
- deleting custom audio demotes custom ready entry to draft
- built-in default can be hidden
- restore defaults brings back hidden built-ins
- restore defaults leaves custom entries and custom recordings untouched

Use Playwright desktop and mobile smoke coverage for `/content` because this is primarily a parent-authoring UI change. Also smoke Words, Syllables, and Assembly to confirm drafts are excluded and ready entries remain playable.

---

## 9. Out Of Scope

- New route or wizard-style add flow.
- Cloud sync, export/import, or account migration.
- Emoji picker library.
- Reordering UI.
- Editing built-in defaults.
- Full reset that deletes parent-created content.
- Changes to letter, number, or phrase audio override behavior.
