# Event Planner Web

A minimal event planner MVP built with Next.js App Router, TypeScript, Tailwind CSS, Leaflet, and Prisma + SQLite.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- React
- Leaflet + react-leaflet
- Prisma ORM
- SQLite

## Routes

- `/` map with existing events
- `/create` create a new event
- `/api/events` `GET`, `POST`
- `/api/events/:id` `DELETE`
- `/api/geocode` `GET`

## Prisma Setup

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client:

```bash
npm run prisma:generate
```

3. Run migrations:

```bash
npm run prisma:migrate
```

4. Start the app:

```bash
npm run dev
```

Optional: open Prisma Studio

```bash
npm run prisma:studio
```

## Notes

- SQLite DB file is configured by `DATABASE_URL` in `.env`.
- Default: `DATABASE_URL="file:./dev.db"` (resolved by Prisma).
