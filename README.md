# TeamForge
Help for group project. Assign works and project for members in the group

## Deployment

The Laravel API is configured for Render through [`render.yaml`](./render.yaml).
The API source lives in [`teamforge-api/`](./teamforge-api/), and the blueprint
uses its Dockerfile and `/api/health` health check.

Before deploying, set the `APP_KEY`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`,
and `DB_PASSWORD` environment variables in Render. Set the frontend's
`VITE_API_BASE_URL` to the deployed API origin, for example
`https://teamforge-prv0.onrender.com`.
