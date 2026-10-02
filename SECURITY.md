# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |
| 0.2.x–0.5.x | Not yet specified |

The existing 0.1.x support commitment is unchanged. This policy has not yet specified support for later version lines; preparing or publishing a version does not by itself change that support policy.

## Reporting a Vulnerability

Please report security vulnerabilities through [GitHub Private Vulnerability Reporting](https://github.com/TakashiKakizoe1109/cc-backlog-connect/security/advisories/new).

**Do not open a public issue for security vulnerabilities.**

### Scope

The following areas are considered in scope:

- API key leakage through logs, error messages, or generated files
- Configuration file injection or tampering
- Unauthorized file writes outside the expected `docs/backlog/` directory
- Path traversal via crafted issue keys or project keys

### Out of Scope

- Management of your own Backlog API key (storing it securely is your responsibility)
- Vulnerabilities in Backlog's API itself
- Issues requiring physical access to the machine

### Response

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation within 7 days for confirmed vulnerabilities.
