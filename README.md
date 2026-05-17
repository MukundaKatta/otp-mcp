# otp-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/otp-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/otp-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An MCP server that gives a Claude / Cursor / Cline / Zed agent the ability
to generate TOTP and HOTP one-time passwords from a base32 secret, and
build `otpauth://` URIs for QR-coding into Google Authenticator / 1Password
/ Authy.

## Why this exists

I kept writing the same scratch script every time I needed to test a
2FA-protected staging account from an agent: paste the base32 secret,
generate the current code, drop it into a form, move on. Wrapping it as
an MCP means the agent can do that step itself, and I get a tested
implementation (RFC 6238 and RFC 4226 test vectors are part of the test
suite) instead of a one-off snippet that's wrong about HMAC-SHA1 vs
HMAC-SHA256 the first time.

Backed by [`otpauth`](https://github.com/hectorm/otpauth), so the
cryptography is the well-reviewed implementation everyone trusts.

## Configure

`claude_desktop_config.json` / `cline_mcp_settings.json` /
`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "otp": { "command": "npx", "args": ["-y", "@mukundakatta/otp-mcp"] }
  }
}
```

## Tools

### `totp` — current code for a TOTP secret

```json
{ "secret": "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "digits": 6 }
```

→ `{ "code": "287082", "counter": 56370370, "period": 30 }`

| Field       | Default | Notes                                            |
|-------------|---------|--------------------------------------------------|
| `secret`    | —       | base32 (the string you got from the QR setup)    |
| `period`    | 30      | seconds per code (Google Authenticator default)  |
| `digits`    | 6       | 6 or 8                                           |
| `algorithm` | SHA1    | `SHA1` / `SHA256` / `SHA512`                     |
| `at`        | now     | optional Unix ms for testing                     |

Verified against the RFC 6238 vectors at `t=59` and `t=1111111109`
(see `test/server.test.ts`).

### `hotp` — counter-based code

```json
{ "secret": "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "counter": 0 }
```

→ `{ "code": "755224" }`

Counter values 0 and 1 match the RFC 4226 reference (`755224`, `287082`).

### `uri` — QR-codeable enrollment URI

```json
{
  "secret": "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  "label":  "alice@example.com",
  "issuer": "Example"
}
```

→ `otpauth://totp/Example:alice@example.com?secret=...&issuer=Example`

Pass `type: "hotp"` and `counter` for the HOTP variant.

## When this is the wrong tool

- **Storing user-facing secrets**: this is for agent-side test/dev use. A
  production 2FA system keeps secrets in a vault, not in your agent's
  conversation context.
- **Hashing passwords**: that's a one-way operation, not TOTP. Use
  [`bcrypt-mcp`](https://www.npmjs.com/package/@mukundakatta/bcrypt-mcp).
- **Validating a code at server scale**: call `otpauth` directly from your
  Node service; an MCP roundtrip is wasted latency for that path.

## License

MIT.
