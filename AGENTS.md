# AGENTS

## Purpose

This project generates sewing patterns from body measurements using code.

Pattern instructions will often be provided in the same style as traditional hand-drafting instructions, step by step.

Your role is to:

- translate those instructions into precise geometric logic
- implement them in clean, reusable TypeScript
- preserve drafting intent, not just visual output

## Core Principles

### 1. Drafting Logic Over Visual Guesswork

Do not "make things look right" by adjusting points arbitrarily.

If a drafting instruction implies:

- measurement
- proportion
- intersection
- rotation
- curve construction
- shaping

then implement that logic explicitly.

### 2. Separate Geometry From Rendering

Keep three layers clearly separated:

1. Measurements and calculations
2. Drafting geometry: points, lines, and curves
3. Rendering/output: SVG paths, labels, and UI

Do not mix drafting logic with rendering concerns.

### 3. Preserve Drafting Steps

When implementing a pattern:

- follow the order of the drafting instructions
- keep code structured in logical drafting sections
- name variables after drafting concepts
- add short comments mapping code to drafting steps

The code should be traceable back to the drafting method.

### 4. Build Reusable Geometry

This project will support multiple pattern types, such as:

- skirts
- bodices
- sleeves
- trousers
- collars
- other garment blocks

Do not build one-off logic tied to a single pattern.

Reusable concepts include:

- points
- lines
- curves
- intersections
- offsets
- rotations
- proportions
- shaping
- seam construction
- seam trueing
- transformations

If logic is generic, extract it.

### 5. Work In The Sewn State When Needed

Some drafting operations must consider how the garment behaves after construction.

Examples:

- seam shaping
- dart intake
- balance adjustments
- curve smoothing

In those cases:

1. simulate the constructed state, for example a closed dart or joined seam
2. calculate the correct geometry
3. map it back to the flat pattern

Do not rely on the user to mentally "fix" the pattern after printing.

### 6. Respect Constraints From Drafting Methods

If a drafting method imposes constraints, preserve them.

Examples:

- vertical or horizontal edges
- symmetrical vs asymmetrical shaping
- fixed alignment points
- grainline orientation

Do not "correct" these into something more symmetrical or visually neat unless explicitly instructed.

## Language And Naming Rules

### 1. All Code Must Be Written In English

All code must use English for:

- variable names
- function names
- type names
- file names
- comments
- generated commit messages and PR titles

This applies even if instructions are written in Swedish.

### 2. Swedish Is Only For i18n

Swedish may only appear in:

- translation files
- i18n keys and values
- user-facing text

Never use Swedish in:

- code identifiers
- internal logic

### 3. Use Correct Drafting Terminology

Prefer clear, standard terms:

- `waistLine`
- `hipLine`
- `centerFront`
- `centerBack`
- `grainline`
- `apex`
- `seamCurve`
- `controlPoint`

Avoid mixed or unclear naming.

### 4. Translate Meaning, Not Words

If instructions are in Swedish:

- translate into correct drafting terminology
- do not directly translate word-for-word if it becomes unclear

## Geometry Rules

### 1. Points Are The Foundation

All drafting should be built from points.

Everything else is derived from:

- distances
- angles
- intersections
- relationships between points

### 2. Use Explicit Geometric Operations

Prefer clear operations like:

- create point
- offset point
- divide line
- intersect lines
- project point
- rotate around pivot
- measure distance
- construct curve

Avoid hidden or implicit geometry.

### 3. Curves Must Be Intentional

Curves, for example seams, must be based on:

- control points
- tangents
- known drafting relationships

Do not "smooth visually" without geometric reasoning.

### 4. Maintain Continuity

Seams and outlines must:

- be continuous
- not contain gaps
- connect cleanly between segments

If seams are split into multiple segments:

- ensure endpoints match exactly

### 5. Units Must Be Consistent

- be explicit about units such as `cm` vs `mm`
- convert at clear boundaries
- avoid mixing units silently

## Transformations And Shaping

### 1. Use Transformations Instead Of Hacks

When shaping patterns, prefer:

- rotation
- translation
- scaling
- projection

instead of manually adjusting coordinates.

### 2. Support Structural Shaping

Patterns often include shaping through:

- darts
- seam shaping
- ease
- curvature adjustments

Implement these as geometry, not visual tweaks.

### 3. Keep Shaping Logic Reusable

If a shaping technique can apply to multiple pattern types, extract it.

## Implementation Workflow

When given drafting instructions:

### Step 1: Interpret

Identify:

- base structure such as rectangle, frame, or axes
- key measurements
- construction lines
- important points
- shaping steps
- constraints

### Step 2: Translate To Geometry

Convert each step into:

- point creation
- geometric operation
- relationship between elements

### Step 3: Structure The Code

Organize into logical sections:

- base construction
- reference lines
- measurements
- shaping
- transformations
- final geometry

### Step 4: Validate Geometry Before Rendering

If something looks wrong:

- check math first
- check relationships between points
- do not fix visually in rendering

## Code Quality Rules

### 1. Change Only What Is Necessary

Avoid unrelated refactors.

### 2. Avoid Overengineering

Do not introduce unnecessary abstractions.

### 3. No New Dependencies

Unless explicitly requested.

### 4. Keep Code Readable

Drafting logic should be easy to follow.

### 5. Comment Non-Obvious Logic

Especially:

- transformations
- shaping logic
- assumptions

### 6. Match Project Conventions

Follow:

- naming
- formatting
- file structure

## Output Expectations

When making changes:

1. Briefly explain what was implemented.
2. Specify whether it affects:
   - geometry
   - transformations
   - rendering
   - shared utilities
3. Call out assumptions.
4. Do not claim correctness unless it is actually correct.

## What Not To Do

Do not:

- eyeball geometry
- mix languages in code
- hardcode pattern-specific logic into generic utilities
- fix geometry problems with rendering tricks
- introduce gaps in seams
- override drafting constraints without instruction
- rewrite unrelated parts of the project

## When Uncertain

If instructions are unclear:

- use the most standard drafting interpretation
- implement conservatively
- document the assumption

If instructions conflict with existing behavior:

- prioritize explicit drafting intent

## Drafting system rules

- Points (e.g. 1, 2, 11a) are persistent internal references.
- Do not display point identifiers unless explicitly requested.
- All lines must have a role. Default = construction.

Roles:

- cut → outer edge, gets seam allowance
- fold → no seam allowance
- seam → stitching line
- dart → dart legs
- guide → reference lines
- construction → drafting lines

If unsure on what role to apply, NEVER guess. ALWAYS ask.

Seam allowance:

- apply ONLY to role = cut
- never apply to guide, construction, seam, fold, or dart

Do not infer roles from appearance or naming.

Patterns must be:

- geometrically correct
- visually unambiguous

Do not remove seam lines if it reduces clarity.

## Print calibration square

All generated patterns must include a print calibration square.

Requirements:

- Size: exactly 4 cm x 4 cm
- Must be placed outside the pattern piece
- Must not overlap any pattern geometry
- Must be clearly visible
- Must include a label: "test square"

Purpose:

- Allows the user to verify that the pattern is printed at correct scale (1:1)

This is required for all printable patterns.

## Additional drafting references

This project includes additional drafting guidance in:

- `DRAFTING_EXAMPLES.md`

You MUST read and follow this file when:

- implementing new patterns
- translating drafting instructions into code
- working with geometry, shaping, or transformations

`DRAFTING_EXAMPLES.md` contains:

- concrete examples of how drafting instructions map to code
- expected structure for drafting logic
- reusable geometry patterns
- examples of correct vs incorrect approaches

If there is any ambiguity in how to implement drafting logic:

- prefer the approach shown in `DRAFTING_EXAMPLES.md`

## Goal

Build a system that:

- accurately represents traditional pattern drafting
- is reusable across garment types
- produces correct geometry, not just visually pleasing output
- can scale as more patterns are added
