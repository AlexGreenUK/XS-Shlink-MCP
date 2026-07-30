# Contributing

## Local setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run validate`.

## Pull requests

- Keep tool names and schemas backward compatible where practical.
- Add tests for API request construction, error mapping, or MCP discovery when
  behavior changes.
- Never include a real Shlink URL, API key, or production response containing
  private analytics.
- Keep destructive tools behind both the server configuration guard and an
  explicit confirmation argument.

## Commit checklist

```shell
npm run validate
npm pack --dry-run
```
