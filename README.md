# 🚀 Next.js Full-Stack Template

A production-ready, opinionated **Next.js 16** template with a clean feature-driven architecture, authentication, typed API layer, and developer tooling pre-configured out of the box.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [API Layer](#api-layer)
- [Feature Pattern](#feature-pattern)
- [State Management](#state-management)
- [Routing & Middleware](#routing--middleware)
- [UI Components](#ui-components)
- [Developer Tooling](#developer-tooling)
- [Scripts Reference](#scripts-reference)
- [Commit Convention](#commit-convention)

---

## 🧰 Tech Stack

| Category         | Library / Tool                                 | Version        |
| ---------------- | ---------------------------------------------- | -------------- |
| Framework        | [Next.js](https://nextjs.org/)                 | 16.4.6         |
| Language         | TypeScript                                     | 6.0.3          |
| Styling          | Tailwind CSS                                   | ^4             |
| UI Components    | [Shadcn UI](https://ui.shadcn.com/) + Radix UI | Latest         |
| Icons            | Lucide React                                   | 1.71.0       |
| Authentication   | [NextAuth.js](https://next-auth.js.org/)       | ^4.24          |
| Data Fetching    | Axios + TanStack Query                         | 1.21 / 5.107  |
| Forms            | React Hook Form + Zod                          | 7.91 / 4.6  |
| State Management | Zustand                                        | ^5.0           |
| Rich Text Editor | Tiptap                                         | 3.33          |
| Animations       | Framer Motion                                  | 14.11          |
| Notifications    | Sonner                                         | ^2.0           |
| Testing          | Jest + Testing Library                         | ^30            |
| Linting          | ESLint + Prettier                              | ^9 / ^3        |
| Commit Hooks     | Husky + Lint-staged + Commitlint               | 9 / 17 / 21 |

---

## 📁 Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/  # NextAuth route handler
│   │           └── route.ts
│   ├── layout.tsx              # Root layout with global providers
│   ├── page.tsx                # Home page
│   ├── globals.css             # Global styles
│   └── not-found.tsx           # Custom 404 page
│
├── Providers/
│   ├── MainProviders.tsx       # TanStack Query client provider
│   └── Provider.tsx            # NextAuth SessionProvider
│
├── components/
│   ├── ui/                     # Shadcn UI primitives (Button, Input, Dialog, etc.)
│   └── shared/                 # Cross-feature shared components
│
├── features/
│   ├── auth/
│   │   └── api/
│   │       └── refresh-token.api.ts  # Token refresh used by NextAuth
│   └── sample-feature/         # Reference architecture — copy this for new features
│       ├── api/                # API call functions (uses src/lib/api.ts)
│       ├── components/         # Feature-specific UI components
│       ├── hooks/              # TanStack Query custom hooks
│       └── types.ts            # Feature TypeScript types
│
├── hooks/                      # Global reusable hooks
│   └── readme.md
│
├── lib/
│   ├── api.ts                  # Axios instance with auth interceptors
│   ├── utils.ts                # Utility functions (cn, etc.)
│   ├── indexed-db-storage.ts   # IndexedDB helpers
│   └── readme.md
│
├── store/
│   ├── ui.store.ts             # Global UI state (Zustand)
│   └── readme.md
│
├── types/
│   ├── next-auth.d.ts          # Extended NextAuth TypeScript types
│   └── readme.md
│
├── tests/                      # Jest unit test files
│
└── proxy.ts                    # Next.js middleware for RBAC routing
```

---

## ⚡ Getting Started

### Prerequisites

- Node.js 22.22.2 (see `.nvmrc`)
- npm 10.9.7 (the authoritative lockfile is `package-lock.json`)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd <project-folder>
```

### 2. Install dependencies

```bash
npm ci --ignore-scripts
```

### 3. Set up environment variables

```bash
cp example.env.local .env.local
```

Edit `.env.local` with your actual values (see [Environment Variables](#environment-variables)).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

Copy `example.env.local` to `.env.local` and fill in the following:

| Variable                 | Required | Description                                                                                |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`    | ✅       | Base URL of your backend REST API (e.g. `http://localhost:5001/api/v1`)                    |
| `NEXTAUTH_SECRET`        | ✅       | A random secret string used to encrypt JWT sessions. Generate with: `openssl rand -hex 32` |
| `NEXTAUTH_URL`           | ✅       | The canonical URL of your deployed app (e.g. `http://localhost:3000` for local)            |
| `NEXT_PUBLIC_SOCKET_URL` | ⬜       | Optional WebSocket server URL                                                              |

> **Security**: Never commit your `.env.local` file. Environment files are ignored by `.gitignore`. Generate your own secret; example values must never be reused.

---

## 🔐 Authentication

Authentication is handled via **NextAuth.js v4** using its **Credentials Provider** strategy.

### How It Works

1. The user submits their email and password.
2. NextAuth calls your backend `POST /auth/login` endpoint.
3. On success, the user object and `accessToken` are stored in a JWT session.
4. The backend access token is automatically refreshed when its configured expiry is reached (1 hour default), via `POST /auth/refresh-access-token`.
5. If refresh fails, the session exposes an error and no access token. The API client signs the user out on a subsequent 401 response.

### Session Shape

The session is extended to include custom fields. The types are declared in `src/types/next-auth.d.ts`:

```typescript
session.user = {
  id: string;
  name: string;
  email: string;
  image: string;    // Maps to profileImage from backend
  role: string;     // e.g. "ADMIN" | "USER"
};
session.accessToken  = string;
// Refresh tokens stay in the encrypted, httpOnly session cookie.
```

### Accessing the Session

**Client-side (in a Client Component):**

```tsx
"use client";
import { useSession } from "next-auth/react";

export default function MyComponent() {
  const { data: session } = useSession();
  // session.accessToken, session.user.role, etc.
}
```

**Server-side (in a Server Component or API Route):**

Before adding protected server handlers, extract the existing NextAuth options
into a shared server-only module and pass them to `getServerSession`. The auth
route currently exports only `GET` and `POST`. Check permissions inside each
protected handler as well as in the navigation proxy.

---

## 🌐 API Layer

All HTTP requests go through the centralized **Axios instance** at `src/lib/api.ts`.

### Features

- **Auto-auth injection**: Every request automatically includes the `Bearer` token from the active NextAuth session.
- **Auto-retry on 401**: If a request fails with a 401, it tries to use the refreshed token from the session and retries once.
- **Auto-signout**: If the token refresh has failed (`RefreshAccessTokenError`), the user is immediately signed out and redirected to `/login`.

### Usage

```typescript
import { api } from "@/lib/api";

// Example GET request
const response = await api.get("/users");

// Example POST request
const response = await api.post("/users", { name: "John" });
```

> **Note**: You never need to manually set `Authorization` headers. The interceptor handles it globally.

---

## 🧩 Feature Pattern

All business logic lives inside `src/features/`. Each feature is a self-contained module with a consistent internal structure. Use `src/features/sample-feature` as your starting point.

### Structure

```
src/features/your-feature/
├── api/
│   └── your-feature.api.ts   # Raw API call functions
├── components/
│   └── YourComponent.tsx     # Feature UI components
├── hooks/
│   └── useYourFeature.ts     # TanStack Query hooks
└── types.ts                  # TypeScript types for this feature
```

### Step-by-Step: Adding a New Feature

**1. Define your types** (`types.ts`):

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
}
```

**2. Write your API function** (`api/users.api.ts`):

```typescript
import { api } from "@/lib/api";
import { User } from "../types";

export async function getUsers(): Promise<User[]> {
  const res = await api.get("/users");
  return res.data;
}
```

**3. Create a TanStack Query hook** (`hooks/useUsers.ts`):

```typescript
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/users.api";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
}
```

**4. Consume in a component** (`components/UserList.tsx`):

```tsx
"use client";
import { useUsers } from "../hooks/useUsers";

export default function UserList() {
  const { data, isLoading, error } = useUsers();

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading users.</p>;

  return (
    <ul>
      {data?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

**5. Add a route** in `src/app/(your-group)/your-route/page.tsx` and import the component.

---

## 🗂️ State Management

Global UI state is managed with **Zustand** in `src/store/`.

### Adding a New Store

```typescript
// src/store/example.store.ts
import { create } from "zustand";

interface ExampleState {
  count: number;
  increment: () => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

> **Convention**: Keep stores small and focused. One store per concern (e.g. `ui.store.ts`, `sidebar.store.ts`).

---

## 🛡️ Routing & Middleware

The `src/proxy.ts` file is a **Next.js Proxy** that runs on the server before matching pages render. It handles **Role-Based Access Control (RBAC)**.

### Current Rules

| Condition                                | Action                               |
| ---------------------------------------- | ------------------------------------ |
| Unauthenticated user visits `/dashboard` | Redirect to `/login?callbackUrl=...` |
| Non-admin user visits `/dashboard`       | Redirect to `/`                      |
| All other requests                       | `next()` — passes through            |

### Customizing Routes

Edit the matcher in `src/proxy.ts` to control which paths trigger the middleware:

```typescript
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
```

### Adding Route Groups

Create a folder with parentheses in `src/app/` to group routes without affecting the URL:

```
src/app/
├── (dashboard)/
│   └── dashboard/
│       └── page.tsx    →  URL: /dashboard
├── (auth)/
│   └── login/
│       └── page.tsx    →  URL: /login
```

---

## 🎨 UI Components

All primitive UI components come from **Shadcn UI** and live in `src/components/ui/`.

### Available Components

| Component       | Description                                          |
| --------------- | ---------------------------------------------------- |
| `Button`        | Multi-variant button (default, outline, ghost, etc.) |
| `Input`         | Styled form input                                    |
| `Label`         | Accessible form label                                |
| `Dialog`        | Modal dialog                                         |
| `Select`        | Dropdown select                                      |
| `Checkbox`      | Accessible checkbox                                  |
| `Avatar`        | User avatar with fallback                            |
| `Dropdown Menu` | Context/dropdown menus                               |
| `Accordion`     | Collapsible accordion panels                         |
| And more...     | Run `npm exec -- shadcn add <component>` to add more         |

### Adding a New Shadcn Component

```bash
npm exec -- shadcn add <component-name>
# e.g.
npm exec -- shadcn add sheet
npm exec -- shadcn add calendar
```

---

## 🛠️ Developer Tooling

### ESLint

Configured in `eslint.config.mjs`. Extends `eslint-config-next`.

```bash
npm run lint
```

### Prettier

Config in `.prettierrc`. Auto-formats on commit via lint-staged.

```bash
# Format all files manually
npx prettier --write .
```

### Husky + Lint-staged

Pre-commit hooks auto-run linting on staged files before every commit.

Config in `.lintstagedrc.json` and `.lintstagedrc`.

### Jest

Unit and integration tests live in `src/tests/`.

```bash
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
```

### TypeScript Type Checking

```bash
npm run type-check   # Runs tsc --noEmit
```

---

## 📜 Scripts Reference

| Script      | Command              | Description                          |
| ----------- | -------------------- | ------------------------------------ |
| Development | `npm run dev`        | Start the dev server with Webpack    |
| Build       | `npm run build`      | Create an optimized production build |
| Start       | `npm run start`      | Start the production server          |
| Lint        | `npm run lint`       | Run ESLint                           |
| Test        | `npm run test`       | Run Jest tests                       |
| Test Watch  | `npm run test:watch` | Run tests in watch mode              |
| Type Check  | `npm run type-check` | TypeScript type validation           |
| Commit      | `npm run commit`     | Interactive commit with Commitizen   |

---

## 📝 Commit Convention

This project enforces **Conventional Commits** via `Commitlint`. Every commit message must follow the format:

```
<type>: <subject>
```

### Allowed Types

| Type       | When to Use                               |
| ---------- | ----------------------------------------- |
| `feat`     | A new feature                             |
| `fix`      | A bug fix                                 |
| `docs`     | Documentation changes only                |
| `style`    | Code style / formatting (no logic change) |
| `refactor` | Code refactoring (no feature or bug fix)  |
| `test`     | Adding or updating tests                  |
| `build`    | Build system or dependency changes        |
| `chore`    | Maintenance tasks                         |
| `ci`       | CI/CD configuration changes               |
| `perf`     | Performance improvements                  |
| `revert`   | Reverting a previous commit               |
| `security` | Security-related changes                  |

### Examples

```bash
feat: add user profile page
fix: resolve token expiry loop on 401
docs: update environment variable guide
refactor: extract api calls into feature module
```

### Using Commitizen (Interactive)

```bash
npm run commit
```

This launches an interactive CLI to guide you through writing a valid commit message.

---

## 📄 License

This project is a starter template. You are free to use, modify, and distribute it.

## Security and dependency maintenance

Read [SECURITY.md](SECURITY.md) for the threat model, verification evidence,
remaining development-tool advisory, and deployment requirements.

Use `nvm use` and `npm ci --ignore-scripts` for reproducible installs. Dependency
lifecycle scripts are blocked in `.npmrc`; no dependency scripts are approved.
To install the reviewed local Git hooks explicitly, run `npm run prepare`.

Run `npm run security:audit` and `npm run security:signatures` before releases.
The GitHub Actions workflow also runs the frozen install, checks, and build.
