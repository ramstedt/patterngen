# PatternGen

**PatternGen** is an experimental web-based tool for bespoke clothing pattern making.  
It explores how body measurements and tailoring mathematics can be translated into code.

This project is **early-stage and a work in progress**, built as part of a course I am taking in bespoke pattern construction.

---

## ✨ Features

> ⚠️ Current features represent the initial foundation. Pattern generation is not yet implemented.

- 📏 Comprehensive measurement schema based on tailoring practice
- 👤 Multiple measurement profiles (for different people or clients)
- 💾 Persistent storage using localStorage
- 🌍 Bilingual UI (English / Swedish)
- 📱 Mobile-first responsive UI
- 🧵 Strongly typed measurement model in TypeScript

---

## 🧠 Tech Stack

- **React** + **TypeScript**
- **Vite**
- **react-hook-form** + **Zod** (typed forms & validation)
- **LocalStorage** for persistence
- **CSS** keeping it simple with good old .css files!

---

## 🧵 Measurements

The measurement model follows traditional pattern drafting terminology, including:

- Bust, waist, and hip circumferences
- Back and front waist lengths
- Bust point and bust height
- Shoulder width and arm measurements
- Trouser rise, inseam, and crotch depth

All units are stored in **centimeters (cm)**.

---

## 🚀 Getting Started

### Install dependencies

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

Open:

```
http://localhost:5173
```

---

## 🧪 Development Notes

- Profiles are stored locally in the browser and persist between sessions.
- Measurement profiles must have **unique names**.
- The UI defaults to the browser language (Swedish or English) and can be changed manually.

---

## 🎯 Planned Roadmap

- SVG pattern drafting and visual preview
- Export to PDF / DXF for pattern printing
- Parametric bodice, skirt, and trouser block generators
- Measurement validation rules based on tailoring theory

---

## 📜 License

This project is released for **personal and educational use only**.

You are free to:

- Use and modify the code for personal projects and learning
- Run and experiment with the software locally

You may **not**:

- Use this project commercially
- Redistribute or sell the software or derivatives
- Use it in proprietary or paid products without permission

If you would like to use this project commercially, please contact me.
