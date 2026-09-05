# Vercel for Deployment

The project deploys to Vercel with a two-branch flow: `dev` for preview, `main` for production. CI runs lint + typecheck via GitHub Actions (no secrets needed). Vercel handles build, migrations, and deployment natively.

We chose Vercel because the project already ships with `@payloadcms/db-vercel-postgres` and `@payloadcms/storage-vercel-blob` as dependencies, the Payload CMS + Next.js stack is first-class on Vercel, and the existing Dockerfile is for containerized self-hosting — a different deployment model. The build command (`payload migrate && next build`) integrates cleanly with Vercel's build pipeline without extra configuration.

**Considered Options:**
- Docker on a VPS: more control, but requires managing infrastructure, CI/CD, SSL, and scaling manually. The existing Dockerfile supports this path if needed later.
- Netlify: limited Node.js server support; Payload CMS requires a running server, not static hosting.
- Cloudflare Pages: doesn't support Node.js servers natively; would need a Workers rewrite.

**Consequences:** The project depends on Vercel's platform for builds and deploys. Switching away would require setting up a Docker-based CI/CD pipeline (the Dockerfile already exists as an escape hatch).
