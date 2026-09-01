@AGENTS.md

## Claude Code

`AGENTS.md` above is the shared, tool-agnostic guidance and the only place to
edit it — this file exists so Claude Code loads it, since Claude Code reads
`CLAUDE.md` and not `AGENTS.md`. Keep Claude-specific notes below the import.

- Area conventions live in `.claude/rules/`, scoped by path so they load only when you touch matching files: `games.md`, `avatar.md`, `e2e.md`, `audio.md`, `pwa.md`.
- Prefer a `.verify.ts` script over reasoning about pure logic. They are cheap, and the repo treats them as the unit-test substitute.
- Keep this file and `AGENTS.md` short. Both load into every session, so add a line only if leaving it out would cause a mistake; put anything longer or area-specific in `.claude/rules/` or a skill instead.
