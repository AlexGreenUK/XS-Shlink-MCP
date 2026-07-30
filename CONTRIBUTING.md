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

## Release checklist

1. Update `CHANGELOG.md`.
2. Run `npm run validate` and `npm audit`.
3. Create the version commit and Git tag with `npm version patch`, `minor`, or
   `major` as appropriate.
4. Push `main` and tags.
5. Publish with `npm publish`.
6. Create GitHub release notes for the new tag.
