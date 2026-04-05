# PatternGen

**PatternGen** is a web-based tool for generating sewing patterns from body measurements.
The current focus is a drafted straight skirt block (`grundkjol`) built from explicit geometry rather than visual approximation.

## Current Status

The project now includes a working straight skirt workflow:

- saved measurement profiles
- bilingual UI in English and Swedish
- calculated drafting values grouped by drafting section
- SVG draft preview in the browser
- printable PDF export
- print calibration square and first-page printing instructions
- profile-driven straight skirt dart rules, including extra darts for large waist-to-hip differences

Implemented pattern support:

- `straightSkirt`: active
- `bodiceWithoutDarts`: placeholder only

## Features

- Multiple saved measurement profiles with local persistence
- Standard measurement model covering skirt, bodice, sleeve, and trouser-related body data
- Straight skirt calculations with visible drafting values
- SVG pattern preview with draft lines, labels, and pattern outline
- PDF printing pipeline with calibration square and assembly instructions
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
- Pattern generation currently targets the straight skirt workflow.
- Drafting logic is geometry-first: points, distances, intersections, shaping, and curve construction are preferred over visual tweaks.

## Roadmap

- Expand from the straight skirt block to additional working pattern types
- Replace placeholder bodice draft with a real drafted implementation
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
