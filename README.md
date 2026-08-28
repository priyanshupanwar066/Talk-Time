# TalkTime

TalkTime is a full-stack real-time chat application for direct and group conversations. It combines a React and Vite client with an Express and TypeScript API, MongoDB persistence, Socket.IO events, presence tracking, notifications, and file attachments.

## Features

- JWT authentication, registration, logout, and profile management
- Direct messages and group conversations with member management
- Real-time message delivery, typing indicators, online presence, and last seen
- Sent, delivered, and read receipts
- Message replies, editing, and deletion for everyone or for the current user
- Image and file attachments with local or S3-compatible storage
- User search and message search within a conversation
- Paginated message history with older-message loading
- In-app notifications, toast alerts, and optional notification sounds
- Health and readiness endpoints for deployment monitoring

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Lucide React, Motion
- **Backend:** Node.js, Express, TypeScript, Zod, Helmet, CORS, rate limiting
- **Real time:** Socket.IO and Socket.IO Client
- **Database:** MongoDB
- **Temporary state:** Redis when available, with an in-memory fallback in development
- **File storage:** Local `uploads/` directory by default, S3-compatible storage in production

## Project Structure

```text
talktime/
├── backend/
│   ├── server.ts            Express and Socket.IO entry point
│   ├── src/
│   │   ├── config/          Environment configuration
│   │   ├── database/        MongoDB and Redis services
│   │   ├── middleware/      Authentication, validation, and errors
│   │   ├── modules/         Auth, users, conversations, messages, notifications, presence
│   │   ├── utils/           Logging and file storage
│   │   └── websocket/       Socket.IO authentication and events
│   └── tests/               Node test runner integration tests
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── components/      React UI grouped by feature
│       ├── context/         Auth, chat, notification, and socket state
│       ├── services/api.ts  REST API client
│       └── types/           Frontend TypeScript types
├── package.json              Workspace scripts
└── .env.example             Environment variable template
```

## Requirements

- Node.js 18 or newer
- A MongoDB instance
- Redis is recommended for shared presence state, but is optional during development

## Getting Started

From the `talktime` directory:

```bash
npm install
cp .env.example .env
```

Update `.env` with a reachable MongoDB connection string and a strong `JWT_SECRET`. The
repository-level file is loaded by the backend; frontend values can also be placed in
`frontend/.env` (copy `frontend/.env.example`).

```dotenv
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb://127.0.0.1:27017/talktime
MONGODB_DB=talktime
JWT_SECRET=replace-with-a-long-random-secret
REDIS_URL=redis://localhost:6379
UPLOAD_DIR=uploads
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

Start the applications in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173). The backend API and Socket.IO
server run at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `PORT` | No | HTTP port; defaults to `3000` |
| `HOST` | No | Bind address; defaults to `0.0.0.0` |
| `MONGODB_URI` | Yes | MongoDB connection string outside tests |
| `TEST_MONGODB_URI` | For tests | MongoDB connection string when `NODE_ENV=test` |
| `MONGODB_DB` | No | Database name; defaults to `talktime` |
| `JWT_SECRET` | Production | Secret used to sign access tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime; defaults to `7d` |
| `REDIS_URL` | No | Redis connection string; defaults to localhost Redis |
| `UPLOAD_DIR` | No | Local upload directory; defaults to `uploads` |
| `CLIENT_URL` | No | Allowed frontend origin; defaults to `http://localhost:5173` |
| `VITE_API_URL` | No | Frontend REST API origin; defaults to the current origin |
| `VITE_SOCKET_URL` | No | Frontend Socket.IO origin; defaults to the current origin |
| `S3_BUCKET` | Production | Enables S3-compatible file storage |
| `S3_REGION` | No | S3 region; defaults to `us-east-1` |
| `S3_ENDPOINT` | No | Custom S3-compatible endpoint |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | S3 | S3 credentials when required |
| `RESEND_API_KEY` / `GEMINI_API_KEY` / `APP_URL` | Optional | Optional integration settings |

In production, `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, and `S3_BUCKET` must be set. In tests, `TEST_MONGODB_URI` must be set.

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev:frontend` | Start the Vite frontend |
| `npm run dev:backend` | Start the Express/Socket.IO backend |
| `npm run build` | Build both workspace applications |
| `npm start` | Run the bundled backend |
| `npm run preview` | Preview the frontend build |
| `npm run lint` | Type-check both applications |
| `npm test` | Run the backend integration test suite |
| `npm run clean` | Remove generated build output |

## API Overview

All application endpoints are under `/api` and require a Bearer token unless noted otherwise.

| Area | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Users | `GET /users/search`, `GET /users/:id`, `PUT /users/:id`, `POST /users/avatar` |
| Conversations | `GET /conversations`, `POST /conversations`, `GET /conversations/:id`, `PUT /conversations/:id` |
| Members and read state | `POST /conversations/:id/members`, `DELETE /conversations/:id/members/:userId`, `POST /conversations/:id/read` |
| Messages | `GET /messages/conversations/:id/messages`, `POST /messages/conversations/:id/messages`, `POST /messages/upload` |
| Message actions | `PUT /messages/:id`, `DELETE /messages/:id`, `GET /messages/search` |
| Notifications | `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all` |
| Presence | `/api/presence` |
| Monitoring | `GET /api/health`, `GET /api/ready` |

Uploaded local files are served from `/uploads/<filename>`.

## Socket.IO Events

Socket connections authenticate with the JWT passed as `auth.token` or an Authorization header. Users are automatically added to their conversation rooms.

| Event | Direction | Purpose |
|---|---|---|
| `conversation:join` / `conversation:leave` | Client -> Server | Join or leave a conversation room |
| `typing:start` / `typing:stop` | Client -> Server | Update typing state for a conversation |
| `typing:update` | Server -> Client | Broadcast active typers |
| `message:delivered` | Client -> Server and server -> clients | Share delivery receipts |
| `message:read` | Client -> Server and server -> clients | Share read receipts |
| `user:online` / `user:offline` | Server -> Client | Broadcast presence changes |
| `message:new`, `message:edited`, `message:deleted` | Server -> Client | Broadcast message changes |
| `notification:new` | Server -> Client | Deliver a new notification |

## Testing

Tests use Node's built-in test runner and connect to `TEST_MONGODB_URI`:

```bash
NODE_ENV=test npm test
```

The test suite covers user creation, password and JWT handling, user search, conversation creation, message editing and deletion, and notification read state.

## Production Health Checks

- `GET /api/health` reports process liveness.
- `GET /api/ready` checks database, Redis, storage, and WebSocket readiness.

There is no Docker or Docker Compose configuration in this repository; deploy the Node.js server and provide its environment variables and external services directly.
