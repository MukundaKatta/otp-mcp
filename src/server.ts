#!/usr/bin/env node
/**
 * otp MCP server. Three tools: `totp`, `hotp`, `uri`.
 *
 * Backed by `otpauth`. Implements TOTP (RFC 6238) and HOTP (RFC 4226).
 * `uri` builds an `otpauth://` URL suitable for QR-coding into Google
 * Authenticator / Authy / 1Password.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOTP, HOTP, Secret } from 'otpauth';

const VERSION = '0.1.0';

export interface TotpOpts {
  secret: string;
  period?: number;
  digits?: number;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  at?: number;
}

export function totp(opts: TotpOpts): { code: string; counter: number; period: number } {
  const period = opts.period ?? 30;
  const t = new TOTP({
    secret: Secret.fromBase32(opts.secret),
    period,
    digits: opts.digits ?? 6,
    algorithm: opts.algorithm ?? 'SHA1',
  });
  const tsSec = Math.floor((opts.at ?? Date.now()) / 1000);
  return {
    code: t.generate({ timestamp: tsSec * 1000 }),
    counter: Math.floor(tsSec / period),
    period,
  };
}

export interface HotpOpts {
  secret: string;
  counter: number;
  digits?: number;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
}

export function hotp(opts: HotpOpts): string {
  const h = new HOTP({
    secret: Secret.fromBase32(opts.secret),
    digits: opts.digits ?? 6,
    algorithm: opts.algorithm ?? 'SHA1',
  });
  return h.generate({ counter: opts.counter });
}

export interface UriOpts {
  type?: 'totp' | 'hotp';
  secret: string;
  label: string;
  issuer?: string;
  period?: number;
  counter?: number;
  digits?: number;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
}

export function uri(opts: UriOpts): string {
  const type = opts.type ?? 'totp';
  if (type === 'totp') {
    const t = new TOTP({
      issuer: opts.issuer,
      label: opts.label,
      secret: Secret.fromBase32(opts.secret),
      period: opts.period ?? 30,
      digits: opts.digits ?? 6,
      algorithm: opts.algorithm ?? 'SHA1',
    });
    return t.toString();
  }
  const h = new HOTP({
    issuer: opts.issuer,
    label: opts.label,
    secret: Secret.fromBase32(opts.secret),
    counter: opts.counter ?? 0,
    digits: opts.digits ?? 6,
    algorithm: opts.algorithm ?? 'SHA1',
  });
  return h.toString();
}

const server = new Server({ name: 'otp', version: VERSION }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'totp',
    description: 'Generate a TOTP code (RFC 6238). Secret is base32. Default period=30, digits=6, algo=SHA1.',
    inputSchema: {
      type: 'object',
      properties: {
        secret: { type: 'string' },
        period: { type: 'integer', default: 30 },
        digits: { type: 'integer', default: 6, minimum: 4, maximum: 10 },
        algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'], default: 'SHA1' },
        at: { type: 'integer', description: 'Optional Unix ms timestamp; defaults to now.' },
      },
      required: ['secret'],
    },
  },
  {
    name: 'hotp',
    description: 'Generate an HOTP code (RFC 4226). Caller supplies the counter.',
    inputSchema: {
      type: 'object',
      properties: {
        secret: { type: 'string' },
        counter: { type: 'integer', minimum: 0 },
        digits: { type: 'integer', default: 6 },
        algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'], default: 'SHA1' },
      },
      required: ['secret', 'counter'],
    },
  },
  {
    name: 'uri',
    description: 'Build an otpauth:// URI suitable for QR-coding into Google Authenticator etc.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['totp', 'hotp'], default: 'totp' },
        secret: { type: 'string' },
        label: { type: 'string', description: 'e.g. "alice@example.com"' },
        issuer: { type: 'string', description: 'e.g. "Example"' },
        period: { type: 'integer' },
        counter: { type: 'integer' },
        digits: { type: 'integer', default: 6 },
        algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'], default: 'SHA1' },
      },
      required: ['secret', 'label'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name === 'totp') {
      const a = args as unknown as TotpOpts;
      return jsonResult(totp(a));
    }
    if (name === 'hotp') {
      const a = args as unknown as HotpOpts;
      return jsonResult({ code: hotp(a) });
    }
    if (name === 'uri') {
      const a = args as unknown as UriOpts;
      return jsonResult({ uri: uri(a) });
    }
    return errorResult('unknown tool: ' + name);
  } catch (err) {
    return errorResult('otp failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`otp MCP server v${VERSION} ready on stdio\n`);
}
