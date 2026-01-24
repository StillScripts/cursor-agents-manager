# GitHub Personal Access Token Integration — Implementation Plan

Goal: Add secure GitHub Personal Access Token (PAT) support to enable repository and pull request (PR) features with CI context inside the app.

## 1) Scopes and Permissions
- Prefer fine‑grained tokens:
  - Repositories: Read
  - Pull requests: Read (Write optional for actions: approve/comment/labels/merge)
  - Commit statuses: Read
  - Checks: Read
  - Actions: Read (for CI details and re‑run)
  - Metadata: Read
  - Organization members: Read (if PRs span private org repos)
- Classic token alternative: repo, read:org, workflow

## 2) Data Model and Security
- Store encrypted GitHub token alongside existing keys using AES‑256‑GCM utilities.
- Extend user_api_keys to include `githubToken` (ciphertext, iv, tag); do not persist plaintext.
- Masking: only return masked form (e.g., `ghp_****abcd`) to the client.
- Rotation: overwrite on update; never show the original token.
- Logging: never log tokens; redact in errors.

## 3) Backend APIs (Authenticated)
Token management:
- `GET /api/user/github-token` → `{ exists: boolean, maskedToken?: string }`
- `POST /api/user/github-token` → save or replace token `{ token: string }`
- `DELETE /api/user/github-token` → remove token

GitHub data (live if token present; otherwise simulation):
- `GET /api/github/repos?search=&page=&per_page=` → list repos (owner/name, permissions, default branch)
- `GET /api/github/repos/:owner/:repo/pulls?state=&author=&reviewRequested=` → list PRs
- `GET /api/github/repos/:owner/:repo/pulls/:number` → PR details (head/base, mergeability, files, reviewers)
- `GET /api/github/repos/:owner/:repo/pulls/:number/checks` → summarize CI (statuses + checks)
- Optional actions (phase 2+):
  - Comment: `POST /api/github/repos/:owner/:repo/pulls/:number/comments`
  - Review: approve/request changes/comment
  - Labels/assignees
  - Re‑run workflow(s)
  - Merge/close PR

Implementation notes:
- Use REST v3 + Checks API; send `Authorization: token <PAT>`.
- Respect pagination, ETag/If‑None‑Match, and abuse/rate headers.
- Map scope errors (403/404) to actionable messages (e.g., “missing checks:read”).

## 4) Frontend UI/UX
Settings:
- New “Connect GitHub” card (pattern of existing API key managers):
  - Paste PAT input, save, masked display, “Test connection”, and delete.
  - Inline doc on required scopes + link to create PAT.

PR Experience:
- Repos view: searchable list, favorites.
- PR list views:
  - “Assigned to me”, “Requested reviews”, “Created by me”, filters by repo/state/label/draft.
- PR cards:
  - Title, author, head→base, last commit, review state, CI badge (success/warning/failure/pending) with tooltip breakdown.
- PR detail drawer/page:
  - Overview, files changed summary, comments, reviewers, timeline, CI/check runs with links to logs.
- Replace generic “View Pull Request” with rich PR card wherever applicable (e.g., agent views).

## 5) React Query Hooks
- `useGithubToken()` – read/save/delete token.
- `useGithubRepos(query)` – repos list with pagination.
- `useGithubPullRequests(repo, filters)` – PR lists.
- `useGithubPullRequest(repo, number)` – PR detail.
- `useGithubChecks({ repo, sha | prNumber })` – CI/checks summary.
- Poll selectively (30–60s) for active PRs/checks; exponential backoff on failures.

## 6) Simulation Mode
- If no token: return mock repos/PRs/checks to keep UX functional.
- Mark responses with `simulation: true`; show an informational banner in UI.

## 7) Testing
- Unit: validators, encryption/decryption, masking, token CRUD APIs.
- Integration: GitHub proxy endpoints (token present/absent, 403/404 handling, pagination).
- UI: settings flows, PR list rendering, CI badge states.
- Rate limiting: honor ETag caching; backoff on `Retry-After`.

## 8) Security, Rate Limits, Reliability
- Encrypt at rest (AES‑256‑GCM); key from existing `ENCRYPTION_SECRET`.
- Never echo tokens; redact in all logs and errors.
- Respect secondary rate limits and abuse detection; add small jitter to polling.
- Handle org SSO requirements and fork PR permission differences.

## 9) API/Type Additions
- Validators package:
  - `githubTokenSchema` for POST body.
  - Query param schemas for repos/PR lists.
- Types:
  - Minimal `GithubRepo`, `GithubPullRequest`, `GithubCheckSummary` mapped from GitHub responses.

## 10) Rollout Phases
- Phase 1:
  - Token storage APIs + Settings UI
  - Repos and PR list with CI badge summary
  - Basic hooks + simulation data
- Phase 2:
  - PR detail (files, comments, reviewers) and review actions
  - Labels/assignees
- Phase 3:
  - CI controls (re‑run), merge/close, advanced filters, notifications
- Phase 4:
  - Agent surfaces: contextual PR cards, AI summaries, risk highlights

## 11) Future Enhancements
- PR inbox and notifications (requested reviews, status changes)
- Merge readiness indicator (CI green + approvals + up‑to‑date)
- Agent‑assisted reviews: summarize diffs, suggest tests, detect risky files
- Repo CI dashboard (flaky test surfacing, average time to green)

---

If approved, Phase 1 can be implemented next with tests and lint passing under Bun.

