# Drafting Examples

## Purpose

This file defines how traditional pattern-drafting instructions should be interpreted and implemented in this project.

It ensures that all generated patterns are:

- geometrically correct
- structurally consistent
- visually clear
- reusable across pattern types

---

## Drafting instruction system

This project uses a structured drafting system based on traditional step-by-step instructions.

Each instruction defines:

- geometry (what is drawn)
- semantics (what it means)

Both must be handled explicitly.

---

### Point identifiers

Points are persistent geometric references.

They may be:

- numeric → `1`, `2`, `3`
- alphanumeric → `11a`, `11b`

#### Rules

- Treat each identifier as a unique key (e.g. `11a` ≠ `11`)
- Store all points internally when defined
- Reuse points exactly in later steps
- Do not overwrite existing points unless explicitly instructed

#### Examples

- `draw from 2 to 4`
- `mark a point 2 cm above 11a`

---

### Line naming

If an instruction says:

`this is [name]`

Then the most recently created line must be assigned that name.

---

### Roles (required for correct behavior)

Each line or edge must have a role.

If no role is specified:

- default = `construction`

#### Available roles

- `cut` → outer edge, receives seam allowance
- `fold` → placed on fold, no seam allowance
- `seam` → stitching line
- `dart` → dart legs
- `guide` → layout/reference lines (e.g. sidlinje)
- `construction` → drafting lines (waist, hip, seat)

#### Rule

Do not infer roles from appearance or naming.  
Roles control behavior and must be explicit when important.

---

### Seam allowance

Seam allowance must:

- only be applied to edges with role = `cut`
- never be applied to:
  - guide lines
  - construction lines
  - fold lines
  - internal seams
  - dart legs (unless explicitly required)

Seam allowance must be:

- a true geometric offset
- not simulated using stroke thickness

---

## Seam allowance validity rules

Seam allowance must always represent a physically valid and sewable result.

### No crossing seam allowance

Seam allowance lines must **never cross or overlap each other**.

If seam allowance paths intersect:

- they must be **trimmed at the intersection point**
- the overlapping portion must **not be rendered**
- seam allowance must stop exactly where it meets another seam allowance edge

Crossing seam allowance is always invalid output.

---

### Piece-aware seam allowance

When multiple pattern areas are shown in the same view (e.g. front and back):

- seam allowance must behave as if each piece is **separate**
- inner edges (such as side seams) must not create overlapping or mirrored allowance shapes
- seam allowance should not imply that pieces are connected unless they are actually cut as one piece

---

### Seam allowance follows cut logic

Seam allowance must reflect how the fabric is actually cut:

- seam allowance is applied outward from **cut edges**
- edges that are not cut (e.g. fold lines) must not have seam allowance
- seam allowance must not create artificial geometry that would not exist in fabric

---

### Visual clarity over completeness

If there is a conflict between:

- showing a full mathematically continuous seam allowance
- keeping the pattern readable and physically correct

then:

- seam allowance must be **trimmed, split, or omitted locally**
- clarity and correctness take priority over continuity

---

### Implementation guidance

When generating seam allowance:

- detect intersections between seam allowance segments
- split paths at intersection points
- render only valid, non-overlapping segments
- prefer multiple clean path segments over one incorrect continuous path

The goal is not to draw a continuous offset —
the goal is to represent a **correct and usable cutting line**.

---

### Pattern clarity

The pattern must be unambiguous.

The user must clearly understand:

- where to cut
- where to sew
- where to fold

#### Rules

- do not remove seam lines if that reduces clarity
- dart areas must still show seam continuity
- never allow dart legs to be mistaken for cut edges

---

### Visual hierarchy

- cut line → strongest
- seam line → lighter
- dart legs → medium
- dart center → dashed
- guide lines → light
- construction lines → lightest

---

### Internal vs frontend

Point identifiers and drafting references are **internal only**.

Do not:

- render point numbers
- show drafting markers automatically

Only display them if explicitly requested.

---

### Core principle

Geometry defines shape.  
Roles define behavior.

Both must always be correct.

---

## Important: Examples are illustrative, not prescriptive

Examples in this file, such as the straight skirt, demonstrate how drafting instructions map to code.

They are **not** universal templates.

When implementing patterns:

- do not assume a rectangular base
- do not assume waist-first construction
- do not assume darts are required
- always follow the actual drafting method

Always prioritize the specific drafting instructions over any example in this file.

---

## Core mindset

All patterns must be treated as:

> **geometric constructions, not illustrations**

If something looks wrong:

- do not adjust geometry visually
- verify measurements
- verify relationships between points
- verify transformations

Rendering must never be used to fix incorrect drafting logic.

---

## General approach

When implementing a pattern from hand-drafting instructions:

1. Identify the drafting steps
2. Translate each step into geometry
3. Preserve the structure of the drafting instructions
4. Reuse shared utilities where appropriate
5. Separate drafting from rendering

---

## Edge classification system

All lines and paths must have a defined **role**.

This controls:

- seam allowance
- rendering
- behavior

### Edge roles

- **cut** → outer edge, receives seam allowance
- **fold** → placed on fold, no seam allowance
- **seam** → internal stitching line
- **dart** → dart legs
- **guide** → layout/reference lines, such as `sidlinje`
- **construction** → measurement and drafting reference lines, such as waist, hip, and seat lines

### Rule

Geometry decides shape.  
Role decides behavior.

Do not guess edge meaning from appearance alone.

---

## Pattern readability and user clarity

A pattern must not only be geometrically correct — it must also be **unambiguous to the user**.

The user must clearly understand:

- where to cut
- where to sew
- where to fold
- which lines are only construction guides

### Do not remove critical seam information

Even when geometry is corrected, important seam information must remain visible if removing it would confuse the user.

Examples:

- if a dart affects a seam, the seam line must still be visible across the dart area
- dart legs must never be easily mistaken for cut lines

### Use visual hierarchy to communicate meaning

Different line types must clearly represent different purposes:

- **cut line**: strongest
- **seam line**: lighter internal solid line
- **dart legs**: medium weight
- **dart center/fold line**: dashed
- **guide lines**: light
- **construction lines**: lightest

### Never rely on user interpretation

Do not assume the user will mentally reconstruct missing information.

Bad:

- removing seam segments because they are "implied"
- relying on the user to understand dart closure mentally

Good:

- explicitly show seam lines
- clearly separate cut lines from internal structure

### Geometry vs readability

Both must be correct:

- geometry must be accurate
- the pattern must be readable and hard to misinterpret

---

## Seam allowance (sömsmån)

### General rules

Seam allowance must:

- be generated as a true geometric offset
- never be simulated using stroke thickness
- only be applied to edges with role = `cut`

### Default

- default seam allowance: **10 mm**

### Do not apply seam allowance to

- fold edges
- guide lines
- construction lines
- internal seam lines
- dart legs, unless explicitly required by the drafting method

### Rendering

- seam allowance / cut line: strongest outer line
- seam line: lighter internal line
- construction lines: lightest

### Labels

Include a clear note such as:

- `Sömsmån 1 cm ingår`
- or `Seam allowance included: 1 cm`

### Implementation guidance

- treat the base outline as the seam line
- generate seam allowance as a second outer path
- ensure there are no gaps or overlaps
- keep the solution reusable for future pattern types

---

## Print calibration square

All patterns must include a print calibration square to verify correct print scaling.

### Purpose

When users print the pattern, they must be able to confirm that the scale is accurate (1:1).

A calibration square allows the user to measure a known dimension.

---

### Requirements

- The square must measure exactly **4 cm x 4 cm**
- It must be drawn using the same coordinate system as the pattern
- It must be geometrically correct (not visually approximated)

---

### Placement

- Place the square outside the pattern piece
- Do not overlap pattern geometry
- Prefer placement:
  - bottom-left or bottom-right of the canvas
  - in unused margin space

---

### Label

The square must include a clear label, named: "test square"

---

### Rendering

- Use a clear solid line
- Keep it visible but not dominant over the pattern
- It should be easy to measure with a ruler

---

### Important

The calibration square is part of the final output and must always be included.

Do not omit it, even if the pattern is small or tightly fitted to the canvas.

## Example: Smooth Curves Through Helper Points

Some drafted curves, especially:

- necklines
- armholes
- collar edges
- style seams

must be smooth even when the drafting method defines several intermediate points.

The important distinction is:

- some points are true pass-through points
- some points are guide points that shape the curve but do not need to be hit exactly

### When a curve must pass through several points

If the drafting method explicitly says the curve is formed through points such as:

- `16-17-9a-8`

then the implementation must preserve those points as geometric references.

However, do **not** simply chain together several independent curve segments without tangent continuity.

That often creates visible kinks or “jacks” at the intermediate points.

Bad:

- one cubic from `16` to `17`
- another from `17` to `9a`
- another from `9a` to `8`
- each segment solved independently

Good:

- compute a tangent direction at each interior point
- reuse that same tangent on both sides of the point
- size the Bézier handles from the local segment lengths

This preserves:

- pass-through behavior
- continuity
- a visually smooth drafted curve

### Recommended implementation pattern

For an interpolating smooth curve through multiple drafting points:

1. Treat the endpoints as true start/end points.
2. Compute tangent directions at interior points from neighboring geometry.
3. Build Bézier controls from those shared tangents.
4. Use one segment per interval, but with matched tangents at joins.

Example:

```ts
function segmentControls(
  start: Point,
  end: Point,
  startTangent: Point,
  endTangent: Point,
  strength = 0.28,
) {
  const segmentLength = distanceBetweenPoints(start, end);
  const handleLength = segmentLength * strength;

  return {
    control1: addPoints(start, scalePoint(startTangent, handleLength)),
    control2: addPoints(end, scalePoint(endTangent, -handleLength)),
  };
}
```

Then:

- use the incoming and outgoing directions around `17`
- average them to get one shared tangent at `17`
- do the same for `9a`
- use those tangent directions for the segments on both sides

This is a better match for drafted armholes than solving each segment in isolation.

### When helper points should not be hit exactly

Some drafting points are only there to guide the curve shape.

Examples:

- neckline helper points
- soft blending points near center front or center back
- curve guide points used to keep a line flatter before it meets an edge

If the instruction intent is “shape the curve by these points” rather than “pass through these points exactly”:

- use those points as Bézier control guidance
- allow the final curve to miss them slightly
- prioritize smoothness and drafting intent over exact interpolation

This is especially important for:

- neckline curves
- armholes near the shoulder
- any area where a kink would create a visibly incorrect draft

### Dynamic helper points are allowed

If the drafted curve still becomes angular or visually incorrect, it is allowed to generate additional internal helper points.

Examples:

- a temporary blend point between two drafted guide points
- a tangent-construction point for a neckline
- an internal smoothing point for an armhole

Rules:

- the helper point must be geometrically motivated
- it must be derived from existing drafting geometry
- it must not be an arbitrary visual tweak
- it should remain internal unless the user explicitly asks to see it

Use dynamic helper points when they improve:

- tangent continuity
- curve smoothness
- constructed-state accuracy
- readability of the final pattern

Do not use them to hide broken geometry.

Use them to express the drafting intent more accurately when the original point set is not sufficient on its own.

### Curve hierarchy

When there is tension between several goals, prioritize them in this order:

1. no kinks / no sharp visual breaks
2. correct endpoint positions
3. correct tangent behavior at important joins
4. helper-point influence
5. exact helper-point intersection

For example:

- a neckline may use helper points like `13b` and `13c`
- the final curve may intentionally pass near them rather than through them
- if that produces a smoother neckline, it is the correct drafting choice

### Practical rule

If a curve looks segmented:

- do not fix it by deleting helper points
- do not fix it with rendering tricks
- recalculate tangents and control handles

The solution must come from geometry, not styling.

## Example 1: Straight skirt block

_Example of a simple rectangular base pattern._

### Drafting intent

A straight skirt block is typically built from:

- a base rectangle
- waist, hip, and seat/reference lines
- center front and center back
- side seam shaping
- waist shaping
- darts
- final seam and outline curves

The code must represent the drafted pattern, not just visually approximate a skirt shape.

### Example drafting workflow

#### Step 1: Build the base frame

Typical drafting instructions may say:

- draw a vertical line equal to skirt length
- square out from top and bottom
- mark width based on hip or seat measurement
- divide into front and back

Translate that into code as:

- establish base points
- build the main rectangle
- define center front, center back, and side line positions

```ts
// Base frame
const skirtLengthMm = toMm(skirtLengthCm);
const totalWidthMm = toMm(widthCm);

const topLeft = { x: leftX, y: startY };
const topRight = { x: lineX, y: startY };
const bottomLeft = { x: leftX, y: endY };
const bottomRight = { x: lineX, y: endY };
const sideLineX = leftX + totalWidthMm / 2;
```

#### Step 2: Add reference lines

Typical drafting instructions may say:

- mark hip line
- mark seat line
- mark waistline

Translate into:

- y-coordinates for construction lines
- intersection points with verticals

```ts
const hipLineY = startY + hipHeightMm;
const seatLineY = startY + seatDepthMm;
const waistLineY = startY;
```

#### Step 3: Add shaping points

Typical drafting instructions may say:

- raise or lower the waist at certain positions
- shape the side seam at hip and waist
- position darts from given measurements

Translate into:

- explicit geometric points for side waist, side hip, dart tops, and dart apexes

```ts
const sideWaistPoint = {
  x: sideLineX - halfSideWaistMm,
  y: waistLineY - waistRaiseMm,
};

const sideHipPoint = {
  x: sideLineX - halfSideHipMm,
  y: hipLineY,
};
```

#### Step 4: Treat darts as geometry

Do not draw darts as simple triangles.

A dart must be treated as:

- apex
- two dart-leg seam points
- closure angle
- seam trueing in the closed state
- reopening into the flat pattern

Important:

- darts are not always symmetric
- one leg may be constrained intentionally
- seam trueing must reflect the sewn result

#### Front dart example

The front skirt dart may be intentionally asymmetrical.

For example:

- one leg remains vertical in the open pattern
- that constraint must be preserved

```ts
const frontDartRightTop = solveFrontVerticalDartTop({
  apex: frontDartBottom,
  leftTop: frontDartLeftTop,
  rightX: frontDartX,
});
```

This is part of the drafting method, not a visual preference.

#### Back dart example

The back skirt dart may be symmetric:

```ts
const backDartLeftTop = {
  x: backDartCenterX - halfBackDartWidthMm,
  y: backDartTopY,
};

const backDartRightTop = {
  x: backDartCenterX + halfBackDartWidthMm,
  y: backDartTopY,
};
```

#### Step 5: True seams in the sewn state

If a seam is affected by shaping:

1. define the shaping
2. simulate the sewn state
3. construct the seam in the sewn state
4. reopen to flat pattern
5. output final geometry

```ts
const truedSeam = buildTruedDartSeamSegments({
  apex,
  leftTop,
  rightTop,
  leftAnchor,
  rightAnchor,
  leftAnchorTangent,
  rightAnchorTangent,
});
```

#### Step 6: Keep rendering separate

Render only after geometry is correct.

The rendered result may include:

- lines
- curves
- paths
- labels
- grainlines

But rendering must not compensate for bad geometry.

#### Straight skirt lessons

This example demonstrates the following project rules:

- drafting logic comes before visual appearance
- darts are geometric constructions
- seams affected by shaping must be trued
- reusable geometry should be extracted from pattern-specific files
- constraints from drafting methods must be preserved

---

## Example 2: Interpreting traditional drafting instructions

Traditional drafting instructions are often written in manual shorthand.

Example instruction style:

- draw a line from A to B equal to skirt length
- square out at top and bottom
- mark hip line down from A
- divide width in half for side seam
- take in dart at waist
- shape waistline gently

Do not implement these as vague visual actions.

Interpret them like this:

| Drafting instruction      | Coding interpretation                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| draw a line from A to B   | create two points and a line relationship                                              |
| square out                | create a perpendicular reference line                                                  |
| mark a point at X cm down | offset a point vertically                                                              |
| divide in half            | midpoint calculation                                                                   |
| take in dart              | create dart geometry and seam shaping                                                  |
| shape gently              | build a controlled curve from known points, tangents, or standard drafting conventions |

### “Shape gently” rule

If no explicit construction is given, derive the curve from:

- known points
- tangents
- standard drafting conventions

Do not invent arbitrary control points.

---

## Example 3: Reusable shaping logic

Some shaping techniques should be generic across pattern types.

Examples:

- seam trueing around a dart
- offsetting a point by measurement
- rotating geometry around a pivot
- splitting a seam into outer and local corrected sections
- sampling a cubic curve into path points

These should be extracted into shared utilities, not duplicated inside each pattern file.

### Geometry helpers

- point math
- line math
- distances
- angles
- normalization
- interpolation
- rotation

### Curve helpers

- bezier evaluation
- tangent evaluation
- solving points on monotonic curves
- path sampling
- point-to-path conversion

### Pattern shaping helpers

- dart closure angle
- constrained dart-leg solving
- seam trueing around shaping features
- reopened seam generation

---

## Example 4: Preserving language rules

Drafting instructions may be provided in Swedish, but all code must still be in English.

Example:

Swedish instruction:

- sänk mitt bak 0,5 cm
- markera höftlinje
- rita insnitt

Correct internal code:

```ts
const centerBackDropMm = 5;
const hipLineY = startY + hipHeightMm;
const backDartTop = ...;
```

Incorrect:

```ts
const mittBakSankning = 5;
const hoftLinjeY = ...;
const insnittBak = ...;
```

Swedish should remain only in i18n or user-facing labels.

---

## Example 5: What not to do

### Bad approach

- draw a shape that “looks like” a skirt
- add triangles for darts
- smooth the top line until it looks okay
- let the user infer the actual sewn seam
- apply seam allowance to internal lines because they “look important”

### Good approach

- build the base frame
- calculate shaping points
- construct darts as geometry
- true seams where necessary
- classify edges by role
- apply seam allowance only to real cut edges
- render the resulting flat pattern accurately

---

## Example 6: Future pattern types

These same principles will later apply to:

### Bodices

- bust shaping
- shoulder shaping
- neckline shaping
- waist shaping
- armhole shaping

### Sleeves

- cap shaping
- elbow shaping
- wrist shaping

### Trousers

- crotch shaping
- hip shaping
- knee shaping
- waist shaping

### Collars and facings

- seam matching
- curve continuity
- construction line logic

Do not assume that shaping logic is unique to skirts.

---

## Example 7: Non-rectangular or non-waist-first patterns

Not all patterns start from a rectangular base or focus on the waist.

Examples include:

- bodice blocks built from shoulder and bust relationships
- sleeve blocks built from armhole measurements and cap height
- collars built from neckline measurements
- trousers with complex crotch shaping

In these cases:

- do not force a rectangular base if it is not part of the drafting method
- do not introduce darts unless specified
- prioritize the primary shaping area, such as bust, shoulder, armhole, or crotch

The same geometric principles still apply:

- points
- measurements
- intersections
- curves
- transformations

But the construction order and logic will differ.

---

## Example 8: Recommended code organization

A good long-term structure is:

- pattern-specific file
- shared geometry utilities
- shared shaping utilities

### Pattern-specific file

Handles:

- measurements
- drafting instructions for that pattern
- placement of construction elements
- pattern-specific assumptions

### Shared geometry utilities

Handles:

- point and line math
- rotation
- interpolation
- curve helpers

### Shared shaping utilities

Handles:

- seam trueing
- dart closure
- constrained shaping logic
- seam allowance generation
- edge role behavior

This keeps future patterns easier to implement and maintain.

---

## Final reminder

When in doubt:

- preserve drafting intent
- prioritize geometry over appearance
- keep code in English
- keep reusable logic generic
- classify edges explicitly
- avoid assumptions

The goal is not just to draw pattern-like images.

The goal is to build correct, reusable drafting logic for real pattern generation.

---

## Goal

Build a system that:

- reflects real drafting methods
- is reusable across garments
- produces correct geometry
- produces clear patterns
- scales as patterns grow
