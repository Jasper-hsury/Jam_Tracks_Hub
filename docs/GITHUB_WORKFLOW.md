# GitHub Workflow

This project uses a simple branch-based workflow.

## Daily Flow

1. Create a branch for one focused task.
2. Make changes locally.
3. Run checks.
4. Commit the finished change.
5. Push the branch to GitHub.
6. Open a pull request.
7. Wait for CI to pass.
8. Merge the pull request.

## Branch Names

Use short names that describe the work:

```txt
feature/progression-writer-save
fix/mobile-track-card-layout
chore/reorganize-project-files
style/update-theme-switch
```

## Commit Style

Prefer one meaningful topic per commit:

```txt
Update theme switch style
Reorganize frontend assets
Fix mobile track card layout
Add progression writer export mode
```

## Pull Requests

A pull request should explain:

- What changed
- Why it changed
- What was checked
- Any remaining risk

For this personal site, `Squash and merge` is usually the cleanest merge method.

## CI

The GitHub Actions workflow in `.github/workflows/ci.yml` runs:

- JavaScript syntax checks
- Cloudflare static build preparation

If CI fails, fix the branch before merging.
