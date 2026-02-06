# MDN HTTP Observatory SARIF Scan Action

A GitHub Action that uses [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory) to scan a host and output results in SARIF (Static Analysis Results Interchange Format) format for integration with GitHub Code Scanning.

## Features

- 🔍 Scans hosts using MDN HTTP Observatory
- 📊 Converts scan results to SARIF format
- 🔐 Integrates with GitHub Code Scanning
- 📝 Provides detailed security recommendations

## Usage

### Basic Example

```yaml
name: HTTP Observatory Scan
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan

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
          host: 'example.com'
          output-file: 'observatory-results.sarif'
      
      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'observatory-results.sarif'
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `host` | The host to scan (e.g., example.com) | Yes | - |
| `output-file` | Output SARIF file path | No | `observatory-results.sarif` |

### Outputs

| Output | Description |
|--------|-------------|
| `sarif-file` | Path to the generated SARIF file |

## What Does This Action Scan?

The MDN HTTP Observatory performs security scans that check for:

- **HTTP Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
- **Cookies**: Secure flags, HttpOnly flags, SameSite attributes
- **Subresource Integrity**: Verification of external resources
- **Referrer Policy**: Privacy-related headers
- **Cross-Origin Policies**: CORS, CORP, COEP configurations
- **TLS/SSL Configuration**: Certificate validation and TLS versions

## SARIF Output

The action converts Observatory scan results into SARIF format, which includes:

- **Rules**: Each Observatory test is converted to a SARIF rule
- **Results**: Failed tests are reported as warnings or errors based on severity
- **Severity Levels**:
  - `error`: Tests with score modifier < -10
  - `warning`: Tests with score modifier < 0
  - `note`: Informational findings

## Development

### Building

```bash
npm install
npm run build
```

### Local Testing

You can test the scanner locally:

```bash
npx @mdn/mdn-http-observatory example.com
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## References

- [MDN HTTP Observatory](https://developer.mozilla.org/en-US/observatory)
- [SARIF Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
