# Examples

This directory contains example workflows for using the MDN HTTP Observatory SARIF Action.

## Basic Scan

The simplest way to use the action:

```yaml
name: HTTP Observatory Scan

on:
  push:
    branches: [ main ]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
      actions: read
    
    steps:
      - name: Scan with HTTP Observatory
        uses: objorke/mdn-observatory-scan@v1
        with:
          host: 'your-domain.com'
      
      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'observatory-results.sarif'
```

## Scheduled Scan

Run a weekly security scan:

```yaml
name: Weekly Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight
  workflow_dispatch:  # Allow manual triggers

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
      actions: read
    
    steps:
      - name: Scan production site
        uses: objorke/mdn-observatory-scan@v1
        with:
          host: 'your-production-domain.com'
          output-file: 'observatory-results.sarif'
      
      - name: Upload to Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'observatory-results.sarif'
          category: 'http-observatory'
```

## Multiple Hosts

Scan multiple hosts in one workflow:

```yaml
name: Multi-Host Security Scan

on:
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
      actions: read
    
    strategy:
      matrix:
        host:
          - 'app.example.com'
          - 'api.example.com'
          - 'www.example.com'
    
    steps:
      - name: Scan ${{ matrix.host }}
        uses: objorke/mdn-observatory-scan@v1
        with:
          host: ${{ matrix.host }}
          output-file: 'observatory-${{ matrix.host }}.sarif'
      
      - name: Upload SARIF for ${{ matrix.host }}
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'observatory-${{ matrix.host }}.sarif'
          category: 'http-observatory-${{ matrix.host }}'
```

## With PR Comments

Add results as comments on pull requests:

```yaml
name: PR Security Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
      actions: read
      pull-requests: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Scan staging environment
        uses: objorke/mdn-observatory-scan@v1
        with:
          host: 'staging.example.com'
          output-file: 'observatory-results.sarif'
      
      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'observatory-results.sarif'
          category: 'http-observatory'
```

## Fail on Low Score

Fail the workflow if security score is below threshold:

```yaml
name: Security Gate

on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
      actions: read
    
    steps:
      - name: Scan host
        uses: objorke/mdn-observatory-scan@v1
        id: scan
        with:
          host: 'example.com'
          output-file: 'observatory-results.sarif'
      
      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'observatory-results.sarif'
      
      # Parse SARIF and check for critical issues
      - name: Check for critical issues
        run: |
          ERRORS=$(jq '.runs[0].results | map(select(.level == "error")) | length' observatory-results.sarif)
          if [ "$ERRORS" -gt 0 ]; then
            echo "Found $ERRORS critical security issues!"
            exit 1
          fi
```
