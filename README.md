# otp-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/otp-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/otp-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)

MCP server: generate TOTP (RFC 6238) and HOTP (RFC 4226) one-time passwords,
and build `otpauth://` URIs suitable for QR-coding into authenticator apps.

## Tools

### `totp`

```json
{ "secret": "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "digits": 6 }
```

→ `{ "code": "287082", "counter": 56370370, "period": 30 }`

`secret` is base32. Defaults: period 30, digits 6, algorithm SHA1.

### `hotp`

```json
{ "secret": "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "counter": 0 }
```

→ `{ "code": "755224" }`

### `uri`

```json
{ "secret": "...", "label": "alice@example.com", "issuer": "Example" }
```

→ `otpauth://totp/Example:alice@example.com?secret=...&issuer=Example`

## Configure

```json
{ "mcpServers": { "otp": { "command": "npx", "args": ["-y", "@mukundakatta/otp-mcp"] } } }
```

## License

MIT.
