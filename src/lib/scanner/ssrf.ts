import dns from 'dns';
import net from 'net';
import { Agent } from 'undici';

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
  hostname?: string;
  isPrivate?: boolean;
}

/**
 * Normalizes user-submitted URLs (e.g. "mybusiness.com" -> "https://mybusiness.com")
 */
export function normalizeSubmittedUrl(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) return '';

  // Remove leading/trailing quotes or backslashes
  trimmed = trimmed.replace(/^["']|["']$/g, '');

  // If an explicit protocol is already provided (e.g. http://, https://, ftp://, file://)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // If no protocol is provided, default to https://
  return `https://${trimmed}`;
}

/**
 * Checks if an IPv4 address is in a private, loopback, or reserved range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 100.100.100.200 (Alibaba Cloud metadata)
  if (a === 100 && b === 100 && c === 100 && d === 200) return true;

  // 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1 documentation)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmark testing)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, or reserved range.
 */
export function isPrivateIPv6(ip: string): boolean {
  // Strip brackets if present (e.g. "[::1]" -> "::1")
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');

  // ::1 loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // :: unspecified
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // Unique local addresses (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local unicast (fe80::/10)
  if (
    normalized.startsWith('fe8') || 
    normalized.startsWith('fe9') || 
    normalized.startsWith('fea') || 
    normalized.startsWith('feb')
  ) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:x.x.x.x or ::ffff:xxxx:xxxx)
  if (normalized.includes('::ffff:')) {
    const part = normalized.split('::ffff:')[1];
    if (part) {
      if (net.isIPv4(part)) {
        return isPrivateIPv4(part);
      }
      // Hex representation e.g. "7f00:1" (127.0.0.1) or "a9fe:a9fe" (169.254.169.254)
      const hexParts = part.split(':');
      if (hexParts.length === 2) {
        const w1 = parseInt(hexParts[0], 16);
        const w2 = parseInt(hexParts[1], 16);
        if (!isNaN(w1) && !isNaN(w2)) {
          const b0 = (w1 >> 8) & 0xff;
          const b1 = w1 & 0xff;
          const b2 = (w2 >> 8) & 0xff;
          const b3 = w2 & 0xff;
          return isPrivateIPv4(`${b0}.${b1}.${b2}.${b3}`);
        }
      }
    }
  }

  // IPv4-compatible IPv6 (deprecated ::x.x.x.x)
  if (normalized.startsWith('::') && !normalized.slice(2).includes(':') && normalized.includes('.')) {
    const ipv4Part = normalized.replace(/^::/, '');
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  return false;
}

/**
 * Checks if an IP string is private/internal/loopback.
 */
export function isPrivateIP(ip: string): boolean {
  const cleanIp = ip.replace(/^\[|\]$/g, '');
  if (net.isIPv4(cleanIp)) return isPrivateIPv4(cleanIp);
  if (net.isIPv6(cleanIp)) return isPrivateIPv6(cleanIp);
  return false;
}

/**
 * Validates a target URL against SSRF rules:
 * - Scheme must be http: or https:
 * - Cannot contain user credentials (username/password)
 * - Port must be 80, 443, or empty
 * - Hostname cannot be localhost, internal domain, or metadata service
 * - Resolves DNS and ensures resolved IP is not in a private/internal range
 */
export async function validateUrlForScan(inputUrl: string): Promise<UrlValidationResult> {
  const normalized = normalizeSubmittedUrl(inputUrl);
  if (!normalized) {
    return { valid: false, error: 'Empty URL provided' };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // 1. Protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { 
      valid: false, 
      error: `Disallowed protocol: ${parsed.protocol}. Only http: and https: are supported.` 
    };
  }

  // 2. Reject credentials in URL (e.g. http://admin:pass@example.com)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: 'URLs containing user credentials are not permitted.',
    };
  }

  // 3. Port check (allow standard web ports only)
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { 
      valid: false, 
      error: `Disallowed port: ${parsed.port}. Only ports 80 and 443 are supported.` 
    };
  }

  // 4. Hostname normalization
  let hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

  // 5. Obvious loopback and hostname checks
  if (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === '0.0.0.0' ||
    cleanHost === '::1' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.local') ||
    cleanHost.endsWith('.internal') ||
    cleanHost.endsWith('.lan') ||
    cleanHost.endsWith('.corp') ||
    cleanHost.endsWith('.home') ||
    cleanHost === 'instance-data' ||
    cleanHost === 'metadata.google.internal'
  ) {
    return { 
      valid: false, 
      isPrivate: true, 
      hostname, 
      error: 'Cannot scan localhost or internal-network destinations.' 
    };
  }

  // 6. If hostname is a literal IP address
  if (net.isIP(cleanHost)) {
    if (isPrivateIP(cleanHost)) {
      return { 
        valid: false, 
        isPrivate: true, 
        hostname, 
        error: 'Target resolves to a private or reserved network IP address.' 
      };
    }
  }

  // 7. DNS Resolution SSRF check
  try {
    const lookup = await dns.promises.lookup(cleanHost, { all: true });
    if (!lookup || lookup.length === 0) {
      return { 
        valid: false, 
        hostname, 
        error: 'Domain does not resolve (DNS lookup failed).' 
      };
    }

    for (const record of lookup) {
      if (isPrivateIP(record.address)) {
        return { 
          valid: false, 
          isPrivate: true, 
          hostname, 
          error: `Domain resolves to a restricted private IP address (${record.address}).` 
        };
      }
    }
  } catch (err: any) {
    return { 
      valid: false, 
      hostname, 
      error: `DNS resolution failed: ${err.message || 'unknown error'}` 
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname,
  };
}

/**
 * Creates an Undici Agent that intercepts DNS resolution at socket connection time.
 * Prevents DNS-rebinding / TOCTOU attacks where a domain resolves to a public IP
 * during validateUrlForScan but shifts to 127.0.0.1 or 169.254.169.254 when fetch connects.
 */
export function createSsrfSafeAgent(): Agent {
  return new Agent({
    connect: {
      lookup: (hostname, options, callback) => {
        const cleanHost = hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '');
        dns.lookup(cleanHost, options, (err, address, family) => {
          if (err) {
            return callback(err, address as any, family as any);
          }

          const addrs = Array.isArray(address) ? address : [{ address, family }];
          for (const item of addrs) {
            if (item.address && isPrivateIP(item.address)) {
              return callback(
                new Error(`DNS resolution to restricted IP (${item.address}) blocked at socket connection.`),
                address as any,
                family as any
              );
            }
          }

          callback(null, address as any, family as any);
        });
      },
    },
  });
}
