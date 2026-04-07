# Sewmetry

**Sewmetry** is a web-based tool for generating sewing patterns from body measurements.
The current focus is measurement-driven drafting built from explicit geometry rather than visual approximation.

## Current Status

The project now includes working straight skirt and bodice workflows:

- saved measurement profiles
- bilingual UI in English and Swedish
- calculated drafting values grouped by drafting section
- SVG draft preview in the browser
- printable PDF export
- print calibration square and first-page printing instructions
- profile-driven straight skirt dart rules, including extra darts for large waist-to-hip differences
- multistep pattern selection with movement ease for patterns that require it
- a drafted bodice without darts workflow with bodice-specific calculation tables and geometry

Implemented pattern support:

- `straightSkirt`: active
- `bodiceWithoutDarts`: active

## Features

- Multiple saved measurement profiles with local persistence
- Standard measurement model covering skirt, bodice, sleeve, and trouser-related body data
- Straight skirt calculations with visible drafting values
- Bodice without darts calculations with visible drafting values
- SVG pattern preview with draft lines, labels, and pattern outline
- PDF printing pipeline with calibration square and assembly instructions
- Movement ease selection for bodice drafting
- Swedish/English translations across the UI
- Responsive React interface for desktop and mobile

## Straight Skirt Draft

The current straight skirt implementation includes:

- waist, high hip, hip, hip height, hip depth, and skirt length based drafting
- front and back dart placement from calculated drafting values
- profile-based dart-width rules for small, medium, and large waist-to-hip differences
- secondary front/back darts only when the waist-to-hip difference is large
- shaped front and back waistlines
- shaped side seam passing through fixed drafting anchor points
- browser preview and printable PDF output

The draft is built from explicit points, sampled curves, and dart geometry in:

- [src/lib/patterns/straightSkirt/calculations.ts](/Users/eramstedt/Documents/GitHub/patterngen/src/lib/patterns/straightSkirt/calculations.ts)
- [src/lib/patterns/straightSkirt/draft.ts](/Users/eramstedt/Documents/GitHub/patterngen/src/lib/patterns/straightSkirt/draft.ts)

## Bodice Without Darts

The current bodice without darts implementation includes:

- movement-ease driven bodice calculations
- armhole depth lookup data and ease tables for bodice drafting
- front and back neckline calculations with control measurements
- fixed drafting measures for shoulder rises and drops
- drafted front and back neckline geometry
- drafted front and back armhole geometry
- browser preview and printable PDF output

The draft is built from explicit points, construction lines, and curve geometry in:

- [src/lib/patterns/bodiceWithoutDarts/calculations.ts](/Users/eramstedt/Documents/GitHub/patterngen/src/lib/patterns/bodiceWithoutDarts/calculations.ts)
- [src/lib/patterns/bodiceWithoutDarts/index.ts](/Users/eramstedt/Documents/GitHub/patterngen/src/lib/patterns/bodiceWithoutDarts/index.ts)

## Tech Stack

- React
- TypeScript
- Vite
- react-hook-form
- Zod
- localStorage for profile persistence

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Open:

```text
http://localhost:5173
```

## Development Notes

- Measurement values are stored in centimeters.
- Profiles are stored locally in the browser.
- Pattern generation currently supports both the straight skirt and bodice without darts workflows.
- Drafting logic is geometry-first: points, distances, intersections, shaping, and curve construction are preferred over visual tweaks.

## Roadmap

- Expand from the current skirt and bodice workflows to additional working pattern types
- Continue building out the bodice without darts draft and related sleeve workflow
- Continue extracting reusable geometry helpers shared across garment types
- Extend printing/export options after the drafting layer is stable

## License

This project is released for **personal and educational use only**.

You are free to:

- use and modify the code for personal projects and learning
- run and experiment with the software locally

You may **not**:

- use this project commercially
- redistribute or sell the software or derivatives
- use it in proprietary or paid products without permission

If you would like to use this project commercially, please contact me.
