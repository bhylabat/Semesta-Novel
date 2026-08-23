# Semesta Novel

## Run on Replit

- Install dependencies: `npm install`
- Start the development preview: `npm run dev`
- The Vite server is configured for Replit on `0.0.0.0:5000`.
- Production build: `npm run build`
- Type check: `npm run typecheck`
- Lint: `npm run lint`

## Supabase configuration

The application reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the environment. When either value is missing, the app remains runnable but displays empty data and disables Supabase-backed authentication and persistence.