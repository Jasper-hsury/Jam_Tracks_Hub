# Umami Analytics GitHub Action

This workflow creates a weekly GitHub issue with a simple Jam Tracks Hub performance report from Umami.

It reports:

- Pageviews
- Visitors
- Visits
- Bounce rate
- Top pages
- Top referrers
- Top countries / regions
- Tool-page usage priority for Tracks, Progression Writer, Key Finder, and other site tools

## Workflow

```text
.github/workflows/umami-analytics.yml
```

The workflow runs:

- Every Monday at 06:00 Asia/Taipei time
- Manually from GitHub Actions using `Run workflow`

## Required Secrets

Set these in GitHub:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Always required:

```text
UMAMI_WEBSITE_ID
```

## Umami Cloud Setup

For Umami Cloud, add:

```text
UMAMI_API_KEY
```

Optional override:

```text
UMAMI_API_ENDPOINT
```

If omitted, the script uses:

```text
https://api.umami.is/v1
```

## Self-Hosted Umami Setup

For self-hosted Umami, add:

```text
UMAMI_BASE_URL
UMAMI_USERNAME
UMAMI_PASSWORD
```

Example:

```text
UMAMI_BASE_URL=https://analytics.example.com
```

The script will call:

```text
https://analytics.example.com/api/auth/login
```

## Manual Test

From GitHub:

```text
Actions -> Umami Analytics Report -> Run workflow
```

You can choose the number of days to include. The default is 7.

## Local Mock Test

To generate a sample report without Umami credentials:

```bash
UMAMI_MOCK=1 node tools/scripts/umami-analytics-report.js
```

This creates:

```text
analytics-report.md
analytics-report-title.txt
```

These files are generated output and should not be committed.
