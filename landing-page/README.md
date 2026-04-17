# MedMatch Landing Page

Next.js 14 landing page for medical graduate job platform.

## Features

- **7 Sections**: Hero, Value Props, Social Proof, How It Works, Job Preview, FAQ, Signup CTA
- **German Language**: All copy in German (DE)
- **Responsive**: Mobile-first design with Tailwind CSS
- **Analytics**: Plausible Analytics integration
- **GDPR Compliant**: Cookie consent banner
- **Form Handling**: Email signup with API integration

## Tech Stack

- Next.js 14+
- React 18
- TypeScript
- Tailwind CSS
- Plausible Analytics

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
```

Output is in `dist/` directory.

## Environment Variables

```
BACKEND_URL=http://localhost:3001
```

## Structure

- `/components` - React components for each section
- `/pages/api` - API routes (signup endpoint)
- `/pages/index.tsx` - Main landing page
- `/styles` - Global CSS

## Deployment

Configure static export in `next.config.js` for deployment to any static host.
