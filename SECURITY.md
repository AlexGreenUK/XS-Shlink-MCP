# Security Policy

## Reporting a vulnerability

Do not open a public issue containing exploit details, API keys, or private
Shlink data. Use
[GitHub private vulnerability reporting](https://github.com/AlexGreenUK/XS-Shlink-MCP/security/advisories/new).

## Deployment guidance

- Store `SHLINK_API_KEY` in the MCP client's environment or secret store.
- Use the narrowest Shlink API-key roles that satisfy the intended workflows.
- Leave `SHLINK_ALLOW_DESTRUCTIVE` set to `false` unless deletion is required.
- Do not expose a local MCP Inspector proxy to untrusted networks.
- Use HTTPS for the Shlink base URL.
- Rotate an API key immediately if it appears in logs, screenshots, commits, or
  shell history.
