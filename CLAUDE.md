# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About This Project

PatternGen is a web-based tool that generates bespoke sewing patterns from body measurements. It translates traditional hand-drafting instructions into geometric TypeScript code.

**AGENTS.md is the primary guidance document** - read it before implementing any pattern logic. It defines core principles, geometry rules, drafting conventions, naming rules, line roles, and what not to do.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check (tsc -b) then bundle with Vite
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

No test framework is configured - correctness is validated geometrically.

## Architecture

### Data flow: measurement → pattern

1. **Profile** (localStorage) stores raw body measurements in cm
2. **`calculate(profile, t)`** - returns `PatternCalculation[]` (named values shown to the user in the UI)
3. **`buildDraft(profile, t)`** - consumes calculations, returns `PatternDraft` (geometry for SVG rendering)
4. **PatternDraftPreview** renders the SVG
5. **`downloadPatternPdf()`** tiles the SVG across A4 pages with a 4 cm × 4 cm calibration square

### Pattern plugin system

Each pattern lives in `src/lib/patterns/<patternName>/` and exports a `PatternDefinition`:

- `calculations.ts` - pure measurement math, produces labelled `PatternCalculation[]`
- `draft.ts` - geometry construction (points → lines → SVG paths), all in **mm**
- `index.ts` - pattern metadata, wires the above together

Patterns are registered in `src/lib/patterns/index.ts`. Currently only `straightSkirt` is exposed to users; `bodiceWithoutDarts` is a stub.

### Units

- Measurements and calculations: **cm**
- All draft geometry: **mm** - `toMm()` / `halfToMm()` convert at the boundary in draft.ts

### Key directories

| Path                        | Role                                                 |
| --------------------------- | ---------------------------------------------------- |
| `src/lib/patterns/`         | All pattern logic                                    |
| `src/lib/printing/`         | PDF export                                           |
| `src/storage/profiles.ts`   | localStorage CRUD + cross-tab sync via custom events |
| `src/types/measurements.ts` | `Profile` and `Measurements` types                   |
| `i18n/translations.ts`      | All UI strings in English and Swedish                |
| `src/data/`                 | Standard size charts (JSON) for women and men        |

### i18n

`useI18n()` hook provides `t(key)` for translations. All user-visible strings go through this. Code identifiers must be English - Swedish only appears in `i18n/translations.ts`. Default language is Swedish (`sv`).

### State & storage

Zustand is available but currently storage goes through `src/storage/profiles.ts` directly. Profile changes fire `PROFILES_UPDATED_EVENT` for cross-tab sync.
