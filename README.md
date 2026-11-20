# VICTVS Exam Scheduling System

## Introduction

This is a React frontend for managing exam sessions. It connects to the VICTVS exam scheduling API so invigilators and coordinators can:

- Browse and filter upcoming exam sessions by date, candidate name, location, and status
- Advance session status through **Pending → In progress → Finished**
- View candidates and the exams they are booked for
- See exam locations on an interactive Google Map, colour-coded by status

The app is built with React, React Router, Axios, Tailwind CSS, and `@react-google-maps/api`.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended) and npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in any missing values:

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `REACT_APP_BASE_URL` | Base URL for the VICTVS exam API (no trailing slash) |
| `REACT_APP_GOOGLE_MAP_API` | Google Maps JavaScript API key (required for the Map page) |

Create React App embeds these at build time, so restart the dev server after changing `.env`.

### 3. Run the development server

```bash
npm start
```

The app opens at [http://localhost:3000](http://localhost:3000).

---

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the local development server |
| `npm test` | Run the Jest + React Testing Library test suite |
| `npm run build` | Create an optimised production build in `build/` |
| `npm run serve` | Serve the production build locally (requires `serve` and a prior `build`) |

---

## Application routes

| Path | Page |
| --- | --- |
| `/` | Home — overview and quick links |
| `/sessions` | Schedule — list, filter, and update exam sessions |
| `/candidates` | Candidates — browse candidates and their bookings |
| `/exam-map` | Map — exam locations on Google Maps |

---

## Additional notes

- **API dependency** — Schedule, candidates, and map data are loaded from `REACT_APP_BASE_URL`. If the API is unreachable, those pages will fail to load data.
- **Google Maps** — The Map page needs a valid `REACT_APP_GOOGLE_MAP_API` key with the Maps JavaScript API enabled. Without it, the map will not load.
- **Do not commit secrets** — Keep real API keys in `.env` (local only). Prefer committing `.env.example` with placeholder values.
- **Status workflow** — Sessions move forward only (pending → started → finished). Finished sessions cannot be advanced further.
- **Styling** — UI styles use Tailwind CSS v4 via PostCSS (`@tailwindcss/postcss`).
