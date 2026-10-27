# Tech Offer Kanban

A job-application tracker for internship and new-grad searches. It keeps every application on a five-stage board, surfaces upcoming deadlines and interview events, and can pre-fill a new card from a pasted job description using Gemini.

Live demo: https://tech-offer-kanban.vercel.app

## Features

- **Five-stage board** (Wishlist, Applied, Assessment, Interview, Outcome) with drag-and-drop between stages via `@dnd-kit`, plus a per-card "Move to stage" menu.
- **Three views**: a dashboard with pipeline counts, execution and interview-conversion rates, deadlines in the next 7 days, and cards missing a resume version; the kanban board; and a calendar.
- **AI quick parse**: paste a job description and Gemini extracts company, role, deadline, and 3–5 prep tags into the new-application form.
- **Notes per application**: resume version, prep tags, and interview notes.
- **Search and filtering** by company or role, plus a stage filter on the dashboard.
- **Local-first storage**: jobs and schedule events are saved in `localStorage` with schema checks on load, and can be exported as `tech-offer-kanban-backup.json`.
- **Light and dark themes** via `next-themes`.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · @dnd-kit · lucide-react

## Architecture notes

- The UI is a client component in `app/page.tsx`; data types live in `types.ts`.
- JD parsing goes through a server Route Handler at `app/api/parse-jd/route.ts`. The browser sends only the job description text; the Gemini API key is read on the server and sent in the `x-goog-api-key` header, so it is never bundled into client JavaScript or placed in a URL.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes, for AI quick parse | Server-side Gemini API key. Do not prefix it with `NEXT_PUBLIC_`. |
| `GEMINI_API_BASE` | No | Override the Gemini API host (for example, a proxy). Defaults to `https://generativelanguage.googleapis.com`. |

On Vercel, add these under **Project Settings → Environment Variables** and redeploy.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Known limitations

- Data lives in the browser's `localStorage`; there is no account system or cloud sync, and JSON import is not implemented yet (export only).
- The calendar view is a simplified 30-day grid.
- Drag-and-drop moves cards between stages; ordering within a stage follows the stored order.
