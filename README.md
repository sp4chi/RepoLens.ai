# GitHub Repo Analyser

An AI-powered tool that analyzes public GitHub repositories using **Gemini**, stores results in **MongoDB**, and presents insights through a **React + Vite** frontend backed by **Node/Express**.

## Features

- Sign in with **GitHub** or **Google** OAuth
- Personal analysis history tied to your account
- Analyze any public GitHub repo by URL or `owner/repo`
- Fetches repo metadata, README, languages, and file tree from GitHub API
- Gemini-powered analysis: summary, strengths, weaknesses, tech stack, use cases, recommendations, health score
- Caches completed analyses per user in MongoDB

## Tech stack

| Layer    | Stack                          |
| -------- | ------------------------------ |
| Frontend | React 19, Vite                 |
| Backend  | Node.js, Express               |
| Database | MongoDB (Mongoose)             |
| Auth     | GitHub OAuth, Google OAuth, JWT cookies |
| AI       | Google Gemini (`gemini-2.5-flash`, configurable) |

## Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas URI
- [Gemini API key](https://aistudio.google.com/apikey)
- GitHub OAuth app ([developer settings](https://github.com/settings/developers))
- Google OAuth client ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))
- Optional: [GitHub token](https://github.com/settings/tokens) for higher GitHub API rate limits during repo fetching

## Setup

1. **Install dependencies**

   ```bash
   npm run install:all
   ```

2. **Configure backend**

   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env`:

   ```env
   PORT=5000
   SERVER_URL=http://localhost:5000
   MONGODB_URI=mongodb://localhost:27017/github-repo-analyser
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   GITHUB_TOKEN=optional_github_token
   CLIENT_URL=http://localhost:5173

   JWT_SECRET=your_long_random_secret
   GITHUB_CLIENT_ID=your_github_oauth_client_id
   GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   ```

   Create `frontend/.env` (required for auth in dev):

   ```env
   VITE_API_URL=http://localhost:5000
   ```

   Auth cookies are set by the backend on port 5000. The frontend must call the API at that URL directly — not through the Vite proxy — or you will get 401 errors.

3. **Create OAuth apps**

   **GitHub OAuth app**
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5000/api/auth/github/callback`

   **Google OAuth client**
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`

4. **Start MongoDB** (if running locally)

   ```bash
   mongod
   ```

5. **Run the app**

   In two terminals:

   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

   Open [http://localhost:5173](http://localhost:5173), sign in, then analyze a repo.

## API

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/api/health` | No | Health check |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/auth/logout` | No | Clear session cookie |
| GET | `/api/auth/github` | No | Start GitHub OAuth |
| GET | `/api/auth/google` | No | Start Google OAuth |
| GET | `/api/analyses` | Yes | List your analyses |
| GET | `/api/analyses/:id` | Yes | Get one of your analyses |
| POST | `/api/analyses` | Yes | Analyze a repo (`{ repoUrl }`) |

## Project structure

```
github-repo-analyser/
├── backend/
│   └── src/
│       ├── config/db.js
│       ├── middleware/auth.js
│       ├── models/User.js
│       ├── models/Analysis.js
│       ├── routes/auth.js
│       ├── routes/analysis.js
│       ├── services/oauth.js
│       ├── services/github.js
│       ├── services/gemini.js
│       └── index.js
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/AuthContext.jsx
│       ├── api.js
│       └── App.jsx
└── package.json
```

## License

MIT
