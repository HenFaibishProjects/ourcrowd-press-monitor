# OurCrowd Press Monitor

Initial structure only: NestJS modular monolith and Angular dashboard shell. No business functionality or sample data.

Use Node 24.19 (`nvm use` if available). Run all commands from this directory:

```bash
npm install
npm run dev
```

- Angular: http://localhost:4200
- NestJS: http://localhost:3000/api/health
- Angular proxies `/api` requests to NestJS.

```bash
npm run typecheck
npm run build
npm run start
```

Production: http://localhost:3000 serves the Angular shell; `/api/health` serves process health. Build before starting. PORT defaults to 3000 and is validated. In development, update `frontend/proxy.conf.json` if changing the backend port. No secrets or environment file are required at this stage.

`npm ci` installs the exact committed lockfile. Feature modules are intentionally empty. Both build directories must be included with the Node application when packaging production.

See [architecture](docs/ARCHITECTURE.md) for responsibilities, runtime modes, future diagrams, exclusions, assumptions, and next steps. See [project map](docs/PROJECT_STRUCTURE.md) for the complete source tree and explanation of every file.

Verified in this environment: workspace type checks, both production builds, root dev/start commands, development API proxy, production HTML and JavaScript serving, SPA fallback, and 404 responses for unknown API routes and missing assets.
