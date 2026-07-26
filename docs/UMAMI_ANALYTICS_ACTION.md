# Umami Analytics GitHub Action

This workflow creates a weekly GitHub issue with a simple Jam Tracks Hub performance report from Umami.

Important: the website tracking script does not require a paid Umami API key. The API key is only required if you want GitHub Actions to automatically fetch Umami data and create report issues.

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

If API credentials are not configured, the scheduled workflow exits cleanly with a notice instead of failing.

## Required Secrets

Set these in GitHub:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Always required:

```text
UMAMI_WEBSITE_ID
```

For the live site, the tracking script is already installed in the page `<head>` tags:

```html
<script defer src="https://cloud.umami.is/script.js" data-website-id="c8dfc471-6512-4344-8e1b-25566e1a93cd"></script>
```

This is enough for normal dashboard analytics on Umami Cloud.

## Umami Cloud Setup

For automated GitHub issue reports on Umami Cloud, add:

```text
UMAMI_API_KEY
```

Umami Cloud API keys require a Pro plan. If the account is on the free plan, the website still tracks visits in the Umami dashboard, but this automated GitHub report will skip itself until API credentials are added.

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

## README Screenshot Without API Access

The repository also includes a free-plan friendly workflow:

```text
.github/workflows/umami-readme-screenshot.yml
```

It opens the public Umami Share URL once per day, captures a screenshot, saves it to:

```text
assets/analytics/umami-dashboard.png
```

Then it updates:

```text
docs/README.md
```

This does not require an Umami API key.

Required setup:

```text
Settings -> Secrets and variables -> Actions
```

Add either a repository secret or variable:

```text
UMAMI_SHARE_URL
```

Use the public share link from:

```text
Umami -> Websites -> jamtrackshub.com -> Edit -> Share URL
```
