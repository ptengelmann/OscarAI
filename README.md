This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Configuration Management

### Sensitive Data
Sensitive values (e.g., database URL, JWT secret) must be set via environment variables and should never be stored in config files or source control.

Set these in your deployment environment, Docker Compose, or with cross-env:

```
DATABASE_URL=your_db_url JWT_SECRET=your_jwt_secret npm run dev
```

### Non-Sensitive Config

Non-sensitive, environment-specific settings (e.g., AI engine config path) are managed via config files in the config folder:

- config/default.json
- config/local.json
- config/remote.json

Select the config file using the APP_CONFIG_PATH environment variable:

```
npx cross-env APP_CONFIG_PATH=./config/local.json npm run dev
```

The config loader (src/lib/config.ts) loads the selected config file and sets non-sensitive config values for the app.

## AI Engines configuration

This project supports an external AI engines configuration file that describes available AI engine entries and the default engine to use.

- Environment variable: `AI_ENGINES_CONFIG`
	- If set, the loader will read the JSON config from the provided path.
	- If not set, the loader falls back to `ai-engines.config.json` at the project root.

Config format (example in `ai-engines.config.json`):

{
	"default": "mock-default",
	"engines": [
		{ "id": "mock-default", "provider": "mock", "params": { ... } }
	]
}

The loader validates that the `default` value matches one of the engines' `id` fields and will throw an error if the file is missing or invalid.
