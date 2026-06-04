# Twitter Clone — Frontend

React + TypeScript + Vite client for the Twitter Clone project.

---

## 🛠️ Prerequisites

- **Node.js 20+** and **npm**
- The **backend API** must be reachable (defaults to `http://localhost:8080`)

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if the backend runs on a different host:

```
VITE_API_URL=http://localhost:8080
```

### 3. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note:** The backend seed data creates 10 users. All seeded accounts share the password `password123`. You can register a new account from the UI at any time.

---

## 🧪 Testing

Run the full Vitest suite:

```bash
npm run test
```

Build the production bundle (TypeScript type-check included):

```bash
npm run build
```

---

## 📦 Key Libraries

| Library | Purpose |
|---|---|
| `react-router-dom` | Client-side routing (SPA) |
| `axios` | HTTP client with JWT interceptor |
| `sonner` | Global toast notifications |
| `@microsoft/fetch-event-source` | SSE stream with Authorization header support |
| `@testing-library/react` | Component integration tests |
| `vitest` | Test runner (Vite-native) |

---

## 🗂️ Project Structure

```
src/
├── api/            # Axios client with global error interceptor
├── components/     # Reusable components (Layout, ReplyModal, UsersModal, …)
├── context/        # AuthContext, NotificationContext (SSE)
├── pages/          # Route-level pages (Timeline, Profile, TweetDetail, …)
├── __tests__/      # Vitest integration tests
├── App.tsx         # Root: routes + Toaster
└── App.css         # Global design system (tokens, utilities, animations)
```

---

## 🐳 Running via Docker Compose

See the [root README](../README.md) for the full containerized stack instructions.
