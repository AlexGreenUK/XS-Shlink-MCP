# XS Shlink MCP

An MCP server for managing and analyzing a
[Shlink](https://shlink.io/) URL-shortener instance.

It runs locally over `stdio`, keeps the Shlink API key on the machine running
the MCP client, and does not require Docker.

## Features

- 23 tools for short URLs, visits, tags, domains, redirect rules, QR codes, and
  Mercure integration information
- Typed and validated tool inputs
- Structured Shlink API errors with request IDs
- Bounded pagination and request timeouts
- Destructive operations disabled by default
- Windows, macOS, and Linux support through Node.js

## Requirements

- Node.js 20 or newer
- A reachable Shlink instance
- A Shlink API key

## Run from a local checkout

```shell
npm install
npm run build
```

Add the server to an MCP client:

```json
{
  "mcpServers": {
    "shlink": {
      "command": "node",
      "args": ["/absolute/path/to/shlink-mcp/dist/index.js"],
      "env": {
        "SHLINK_BASE_URL": "https://s.example.com",
        "SHLINK_API_KEY": "replace-me",
        "SHLINK_API_VERSION": "3",
        "SHLINK_ALLOW_DESTRUCTIVE": "false"
      }
    }
  }
}
```

On Windows, use a fully escaped absolute path:

```json
"args": ["C:\\path\\to\\shlink-mcp\\dist\\index.js"]
```

## Run the published package

After the package is published to npm, an MCP client can launch it with:

```json
{
  "mcpServers": {
    "shlink": {
      "command": "npx",
      "args": ["-y", "xs-shlink-mcp"],
      "env": {
        "SHLINK_BASE_URL": "https://s.example.com",
        "SHLINK_API_KEY": "replace-me"
      }
    }
  }
}
```

## Configuration

| Variable | Required | Default | Description |
|---|---:|---:|---|
| `SHLINK_BASE_URL` | Yes | — | Shlink origin without `/rest`, such as `https://s.example.com` |
| `SHLINK_API_KEY` | Yes | — | Shlink API key |
| `SHLINK_API_VERSION` | No | `3` | REST API major version |
| `SHLINK_TIMEOUT_MS` | No | `10000` | Per-request timeout in milliseconds |
| `SHLINK_ALLOW_DESTRUCTIVE` | No | `false` | Enables deletion tools when set to `true` |

Never commit an API key. Tool results and errors do not include it.

## Tools

### Short URLs

- `list_short_urls`
- `get_short_url`
- `create_short_url`
- `edit_short_url`
- `delete_short_url`
- `get_qr_code_url`

### Analytics and visits

- `get_visit_stats`
- `get_short_url_visits`
- `get_tag_visits`
- `get_domain_visits`
- `list_orphan_visits`
- `list_non_orphan_visits`
- `delete_short_url_visits`
- `delete_orphan_visits`

### Redirect rules, tags, and domains

- `get_redirect_rules`
- `set_redirect_rules`
- `list_tags`
- `rename_tag`
- `delete_tags`
- `list_domains`
- `set_domain_redirects`

### Monitoring and integrations

- `shlink_health`
- `get_mercure_info`

All deletion tools require both `SHLINK_ALLOW_DESTRUCTIVE=true` and an explicit
`confirm: true` tool argument.

## Test with MCP Inspector

Build first, then pass the server environment explicitly:

```shell
npx -y @modelcontextprotocol/inspector \
  -e SHLINK_BASE_URL=https://s.example.com \
  -e SHLINK_API_KEY=replace-me \
  -- node /absolute/path/to/shlink-mcp/dist/index.js
```

Start with `shlink_health`, followed by `list_short_urls`.

## Development

```shell
npm run check
npm test
npm run validate
```

The automated tests use mocked Shlink responses. They do not require or modify
a live Shlink instance.

## Security

See [SECURITY.md](SECURITY.md) for reporting security issues and guidance for
deploying API keys safely.

## License

MIT
