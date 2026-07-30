# XS Shlink MCP

[![npm version](https://img.shields.io/npm/v/xs-shlink-mcp.svg)](https://www.npmjs.com/package/xs-shlink-mcp)
[![CI](https://github.com/AlexGreenUK/XS-Shlink-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexGreenUK/XS-Shlink-MCP/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/xs-shlink-mcp.svg)](https://www.npmjs.com/package/xs-shlink-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A local [Model Context Protocol](https://modelcontextprotocol.io/) server for
managing and analyzing a [Shlink](https://shlink.io/) URL-shortener instance.

XS Shlink MCP runs over `stdio`, keeps the Shlink API key on the machine running
the MCP client, and does not require Docker or a separate hosted service.

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

The initial release was tested with Shlink 5.1.5 and REST API version 3.

## Quick start

Configure an MCP client to launch the published npm package:

```json
{
  "mcpServers": {
    "shlink": {
      "command": "npx",
      "args": ["-y", "xs-shlink-mcp"],
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

On Windows, use `"command": "npx.cmd"` if the MCP client does not resolve the
`.cmd` shim automatically.

The MCP client starts and stops the server automatically. Do not run ordinary
interactive commands through the server's standard input because `stdio` is
reserved for MCP protocol messages.

## Configuration

| Variable | Required | Default | Description |
|---|---:|---:|---|
| `SHLINK_BASE_URL` | Yes | - | Shlink origin without `/rest`, such as `https://s.example.com` |
| `SHLINK_API_KEY` | Yes | - | Shlink API key |
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

`get_qr_code_url` supports Shlink's QR-code customization parameters: size,
margin, PNG or SVG format, error-correction level, block-size rounding, and
foreground/background colors. Shlink deprecated its built-in QR-code endpoint
in version 4.5, so this tool is provided for compatibility with instances that
still expose it.

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

Set the API key in the current shell, then launch the published package.

PowerShell:

```powershell
$env:SHLINK_API_KEY="replace-me"
npx.cmd -y @modelcontextprotocol/inspector -e "SHLINK_BASE_URL=https://s.example.com" -e "SHLINK_API_KEY=$env:SHLINK_API_KEY" -e "SHLINK_API_VERSION=3" -e "SHLINK_ALLOW_DESTRUCTIVE=false" -- npx.cmd -y xs-shlink-mcp
```

macOS or Linux:

```shell
export SHLINK_API_KEY="replace-me"
npx -y @modelcontextprotocol/inspector \
  -e SHLINK_BASE_URL=https://s.example.com \
  -e SHLINK_API_KEY="$SHLINK_API_KEY" \
  -e SHLINK_API_VERSION=3 \
  -e SHLINK_ALLOW_DESTRUCTIVE=false \
  -- npx -y xs-shlink-mcp
```

Start with `shlink_health`, followed by `list_short_urls`.

## Local development

```shell
git clone https://github.com/AlexGreenUK/XS-Shlink-MCP.git
cd XS-Shlink-MCP
npm install
npm run validate
```

The automated tests use mocked Shlink responses. They do not require or modify
a live Shlink instance.

Useful commands:

```shell
npm run dev
npm run build
npm test
npm pack --dry-run
```

## Releases

- [npm package](https://www.npmjs.com/package/xs-shlink-mcp)
- [GitHub releases](https://github.com/AlexGreenUK/XS-Shlink-MCP/releases)
- [Changelog](CHANGELOG.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md). Use GitHub's private vulnerability reporting
instead of opening a public issue for sensitive reports.

## License

[MIT](LICENSE)
