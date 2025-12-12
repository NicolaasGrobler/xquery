# xquery

A modern TypeScript monorepo for querying and managing files with OpenAI integration.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Better-Auth** - Authentication
- **OpenAI** - File chat and vector store integration
- **Ultracite** - Zero-config Biome preset for linting and formatting
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Prerequisites

This project requires [Bun](https://bun.sh) as the package manager and runtime. **npm and yarn are not supported** due to bun-specific features:

- `catalog:` protocol for shared dependency versions
- `workspace:*` dependency resolution
- Bun's native hot reloading and compilation

Install Bun:

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:
```bash
bun run db:push
```


Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).







## Project Structure

```
xquery/
├── apps/
│   ├── web/                    # Frontend application (React + TanStack Router)
│   │   └── src/
│   │       ├── components/     # React components
│   │       │   ├── files/      # File management components
│   │       │   └── ui/         # shadcn/ui components
│   │       ├── hooks/          # Custom React hooks
│   │       ├── lib/            # Utility functions
│   │       └── routes/         # TanStack Router file-based routes
│   └── server/                 # Backend API (Hono)
├── packages/
│   ├── api/                    # tRPC routers & business logic
│   │   └── src/
│   │       ├── routers/        # tRPC route handlers (chat, files)
│   │       └── lib/            # OpenAI integration
│   ├── auth/                   # Better-Auth configuration
│   ├── config/                 # Shared TypeScript config
│   └── db/                     # Drizzle ORM & database schema
│       └── src/
│           ├── schema/         # Database table definitions
│           └── migrations/     # Database migrations
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open database studio UI

## Code Quality

This project uses [Ultracite](https://github.com/haydenbleasel/ultracite), a zero-config Biome preset for linting and formatting.

```bash
# Check for issues
npx ultracite check

# Fix issues automatically
npx ultracite fix
```
