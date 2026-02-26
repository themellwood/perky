# Self-Service Agreement Upload

Members whose union isn't on the platform can upload their own collective agreement PDF, get AI-extracted benefits, and track usage privately.

## Approach

Reuse existing schema by creating a hidden "personal" union per member. All existing dashboard, usage tracking, and benefit card code works unchanged since it queries through `member_agreements -> agreement -> benefits`.

## Database Changes

Add `type` column to `unions` table:
- `type TEXT NOT NULL DEFAULT 'standard'` — values: `standard` | `personal`
- Personal unions auto-created per user, named "Personal — {user email}"

## New Page: `/my-agreements`

- Lists member's self-uploaded agreements
- "Upload Agreement" button triggers same PDF upload + AI extract + review flow
- Each agreement shows title, benefit count, and actions (extract, delete)
- Benefits from personal agreements appear on main dashboard alongside union benefits

## API: `/self-service/*`

- `POST /self-service/upload` — creates personal union (if needed) + agreement, uploads PDF to R2
- `POST /self-service/extract/:id` — calls Claude extraction (reuses existing service)
- `POST /self-service/accept/:id` — saves reviewed benefits (reuses existing logic)
- `DELETE /self-service/:id` — deletes personal agreement + benefits + PDF
- `GET /self-service/agreements` — lists user's personal agreements

## Filtering

Personal unions/agreements filtered from:
- Admin union list
- Public directory
- Analytics
- Union membership flows

## Dashboard Integration

Personal agreement benefits appear on the main dashboard grouped under their agreement title, with full usage tracking (log, history, progress bars).
