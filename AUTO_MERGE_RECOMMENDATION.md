# Auto-Merge Implementation Recommendation

## Investigation Summary

After investigating the codebase and Cursor API integration, here are the findings:

### Current State

1. **Cursor API Limitations**: The Cursor API does **not** support an `autoMerge` option in the launch agent request. The `target` object only supports:
   - `autoCreatePr`: Automatically creates a PR when agent completes
   - `openAsCursorGithubApp`: Opens PR as Cursor GitHub App
   - `skipReviewerRequest`: Skips adding user as reviewer
   - `branchName`: Custom branch name

2. **Webhook Integration**: The app receives webhooks when agents finish and includes `prUrl` in the payload, but there's no GitHub API integration to merge PRs.

3. **No GitHub API Integration**: The codebase doesn't currently have any GitHub API client (e.g., `@octokit/rest`) installed or configured.

## Recommended Approaches

### Option 1: GitHub Repository Settings (Simplest, No Code Changes)

**How it works**: Configure auto-merge directly in GitHub repository settings.

**Steps**:
1. Go to repository Settings → Branches
2. Add branch protection rule for target branch (e.g., `main`)
3. Enable "Require pull request reviews before merging"
4. Enable "Require status checks to pass before merging" (select your CI workflow)
5. Enable "Require branches to be up to date before merging"
6. Enable "Auto-merge" (if available in your GitHub plan)

**Pros**:
- ✅ No code changes required
- ✅ Works immediately for all PRs
- ✅ Managed at repository level
- ✅ No additional API tokens needed

**Cons**:
- ❌ Must be configured per repository
- ❌ Requires repository admin access
- ❌ Not controllable from the app
- ❌ May require GitHub Pro/Team plan for auto-merge feature

**Recommendation**: Use this for repositories where you want all PRs to auto-merge after CI passes.

---

### Option 2: GitHub API Integration (Most Flexible)

**How it works**: Use GitHub API to enable auto-merge on PRs after they're created by Cursor agents.

**Implementation Requirements**:
1. Add GitHub Personal Access Token (PAT) or GitHub App authentication
2. Install `@octokit/rest` package
3. Create a Convex action to merge PRs via GitHub API
4. Trigger merge when webhook receives `FINISHED` status with `prUrl`

**Implementation Steps**:

1. **Add GitHub Token Storage** (similar to Cursor API key):
   - Add `encryptedGithubToken` field to `apiKeys` table
   - Create UI in account settings to add GitHub token
   - Encrypt token before storage

2. **Create GitHub API Action**:
   ```typescript
   // packages/backend/convex/github.ts
   export const enableAutoMerge = action({
     args: { prUrl: v.string() },
     handler: async (ctx, args) => {
       // Parse PR URL to extract owner, repo, prNumber
       // Get encrypted GitHub token
       // Use Octokit to enable auto-merge
     }
   })
   ```

3. **Update Webhook Handler**:
   ```typescript
   // In packages/backend/convex/http.ts
   // When status is FINISHED and prUrl exists:
   if (payload.status === "FINISHED" && payload.target?.prUrl) {
     await ctx.runAction(api.github.enableAutoMerge, {
       prUrl: payload.target.prUrl
     })
   }
   ```

**Pros**:
- ✅ Controllable from the app
- ✅ Can be enabled/disabled per user
- ✅ Works with any GitHub repository
- ✅ Can add additional logic (e.g., only merge if certain conditions met)

**Cons**:
- ❌ Requires code changes
- ❌ Requires GitHub token management
- ❌ Requires GitHub API rate limit handling
- ❌ More complex implementation

**Recommendation**: Use this if you want app-level control over auto-merge behavior.

---

### Option 3: GitHub Actions Workflow (Repository-Level Automation)

**How it works**: Create a GitHub Actions workflow that auto-merges PRs after CI passes.

**Implementation Steps**:

1. Create `.github/workflows/auto-merge.yml`:
   ```yaml
   name: Auto-merge PRs from Cursor Agents
   
   on:
     pull_request:
       types: [opened, synchronize]
   
   jobs:
     auto-merge:
       runs-on: ubuntu-latest
       steps:
         - name: Auto-merge PR
           uses: actions/github-script@v7
           with:
             script: |
               // Check if PR is from Cursor agent (e.g., check author or label)
               // Wait for CI to pass
               // Merge PR
   ```

2. Add PR labels or check PR author to identify Cursor agent PRs

**Pros**:
- ✅ No app code changes
- ✅ Repository-level control
- ✅ Can add custom merge logic
- ✅ Works with existing CI workflows

**Cons**:
- ❌ Must be configured per repository
- ❌ Requires GitHub Actions knowledge
- ❌ May need to identify Cursor agent PRs

**Recommendation**: Use this if you want repository-level automation without app changes.

---

## Final Recommendation

### For Immediate Implementation (No Code Changes):
**Use Option 1 (GitHub Repository Settings)** - Configure auto-merge in GitHub for repositories where you want this behavior.

### For Long-Term Solution (App Integration):
**Use Option 2 (GitHub API Integration)** - This provides the most flexibility and allows users to control auto-merge from within the app.

### Hybrid Approach:
1. Start with **Option 1** for repositories that need auto-merge immediately
2. Implement **Option 2** for app-level control and user preferences
3. Users can choose per-repository or per-agent whether to enable auto-merge

## Next Steps

If you want to proceed with **Option 2 (GitHub API Integration)**, I can:

1. Add GitHub token storage to the database schema
2. Create GitHub API integration functions
3. Add UI for GitHub token management
4. Update webhook handler to enable auto-merge
5. Add tests for the new functionality

Would you like me to proceed with implementing Option 2, or do you prefer a different approach?
