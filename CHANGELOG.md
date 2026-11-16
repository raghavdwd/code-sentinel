# Changelog

## RECENT CHANGES

- 2026-11-16 — redesign UI: framed-sheet tokens (teal brand, IBM Plex Sans/Mono), rebuilt sidebar + shell, real Overview review queue, restyled repositories/PR detail/reviews/settings/login, language dots, severity + file icons, mobile grids, dark theme
- 2026-11-16 — fix sidebar late render: server-passed session, no mount/session null gates, useSyncExternalStore mobile hook
- 2026-11-16 — upgrade deps to latest: next 16.4.6, react 19.3.1, prisma 7.10.1 (8.0 is RC, held back), tailwind 4.3.5, eslint 10.15, typescript 6.0.3 (7.0 unsupported by typescript-eslint), radix 1.x, zod 4.6.7, lucide 1.73, recharts 3.10, react-day-picker 10, react-resizable-panels 4; refreshed shadcn chart/calendar/carousel/resizable/sidebar/tooltip
- 2026-11-16 — add PR review slice: Repository/PullRequest/Review tables, OpenRouter review pipeline, repo+PR pages, reviews history, settings page, sidebar link fixes, bun test suite
