# Landing Page & Partners Page Design

**Date:** 2026-02-24
**Status:** Approved

## Overview

Public landing page at `/` and union partnership page at `/partners`. Both use the existing brutalist design system (Space Grotesk, card-brutal, border-3 border-ink, shadow-brutal, perky/fight/ink colors). All copy adapted from the approved PDF with slight refinements for a coded page.

## Routes

- `/` — `LandingPage.tsx` (replaces current redirect to /dashboard)
- `/partners` — `PartnersPage.tsx` (new public page)
- CTAs link to `/login` (existing magic-link flow)

## Landing Page Sections

### 1. Sticky Nav
- Perky logo (fight-500 badge) left, "Sign In" link right
- `border-b-3 border-ink`, white bg, sticky top
- No hamburger — simple public nav

### 2. Hero (`bg-[#fafaf5]`)
- Eyebrow: "WAKE UP CALL" small caps
- H1: "THEY'RE HIDING YOUR MONEY" — "YOUR MONEY" highlighted `bg-fight-500`
- Subtext: buried benefits copy + NZ union agreements pre-loaded
- `btn-accent` large: "EXPOSE YOUR BENEFITS" -> `/login`
- Tagline: "Free Forever. No Credit Card."

### 3. How It Works (`bg-white`, `border-y-3 border-ink`)
3 numbered `card-brutal` steps in a row:
1. "Upload Your Contract" — PDF icon
2. "AI Reads Every Page" — sparkle icon
3. "Start Claiming" — checkmark icon

### 4. The Scam They're Running (`bg-ink`, white text)
Dark section. 3 cards with `border-3 border-white`:
- **Buried in Legalese** — page 34, paragraph 7 copy
- **Never Mentioned** — HR "forgot" copy
- **Expires Unused** — use it or lose it copy

### 5. Perky Exposes Everything (`bg-[#fafaf5]`)
Heading in `text-perky-700`. 4 feature `card-brutal` in 2x2 grid:
- AI-Powered Extraction
- Track What You've Claimed
- See What Others Claim
- Exact Contract Wording

### 6. NZ Union Callout (`bg-fight-100`, `border-y-3 border-ink`)
Full-width banner: "ALL NZ UNION AGREEMENTS LOADED"
Copy about pre-loaded agreements. `btn-primary` -> `/login`.

### 7. Stats (`bg-white`)
3 big numbers in `card-brutal` containers:
- $4,000 in `text-perky-500` — "Average unclaimed per employee"
- 68% in `text-fight-600` — "Of benefits never get used"
- $50B in `text-perky-500` — "Left unclaimed annually"

### 8. Union Partnership (`bg-ink`, white text)
- Headline: "UNIONS: ARM YOUR MEMBERS"
- 3 value props: pre-load agreements, usage analytics, bargaining insights
- `btn-accent`: "Partner With Us" -> `/partners`

### 9. Social Proof (`bg-[#fafaf5]`)
"Trusted by union members across New Zealand"
Placeholder union logo slots.

### 10. FAQ (`bg-white`, `border-t-3 border-ink`)
Accordion `card-brutal` expandable cards, 5 questions:
- Is my contract data safe?
- What if I'm not in a union?
- Is this really free?
- How does AI extraction work?
- Can my employer see my usage?

### 11. Final CTA (`bg-ink`)
- "STOP GETTING ROBBED"
- "Your contract is legally binding. Make them honor it."
- `btn-accent` large: "GET WHAT'S YOURS" -> `/login`

### 12. Footer
"Perky — Know your rights. Use your rights." Matches app footer.

## Partners Page (`/partners`)

### Sections:
1. Hero — "Partner With Perky" for unions
2. How it works — Upload agreement -> Members auto-enrolled -> Analytics dashboard
3. Benefits — Increase engagement, strengthen bargaining with data, track benefit utilization
4. Contact form — Name, union name, email, message -> sends via Resend API

### Technical:
- New API route `POST /api/partners/enquiry` to send the form via Resend
- Uses simplified public nav (same as landing page sticky nav)

## Design System

All existing classes, no new dependencies:
- `card-brutal`, `btn-primary`, `btn-accent`, `btn-secondary`
- `border-3 border-ink`, `rounded-brutal`, `shadow-brutal`
- Colors: perky-*, fight-*, ink, white, `bg-[#fafaf5]`
- Font: Space Grotesk
- Icons: inline SVGs (no icon library)

## Files to Create/Modify

### New files:
- `packages/web/src/pages/LandingPage.tsx`
- `packages/web/src/pages/PartnersPage.tsx`
- `packages/api/src/routes/partners.ts` (enquiry form endpoint)

### Modified files:
- `packages/web/src/App.tsx` — add `/` and `/partners` routes
- `packages/api/src/index.ts` — mount partners route
