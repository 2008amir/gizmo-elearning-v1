// Minimal RFC 8291 (aes128gcm) Web Push sender using Web Crypto.
// Works on Cloudflare Workers / edge — no Node-only deps.

function strBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function b64uDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64uEncode(buf: Uint8Array): string {
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm as unknown as BufferSource, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as unknown as BufferSource, info: info as unknown as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function vapidJwt(audience: string): Promise<string> {
  const pubRaw = b64uDecode(process.env.VAPID_PUBLIC_KEY!);
  const priv = process.env.VAPID_PRIVATE_KEY!;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };
  const unsigned =
    b64uEncode(strBytes(JSON.stringify(header))) + "." + b64uEncode(strBytes(JSON.stringify(payload)));

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: b64uEncode(pubRaw.slice(1, 33)),
    y: b64uEncode(pubRaw.slice(33, 65)),
    d: priv,
    ext: true,
  };
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, strBytes(unsigned) as unknown as BufferSource),
  );
  return unsigned + "." + b64uEncode(sig);
}

async function encryptPayload(
  payload: Uint8Array,
  clientP256dhB64u: string,
  clientAuthB64u: string,
): Promise<Uint8Array> {
  const clientPubRaw = b64uDecode(clientP256dhB64u); // 65 bytes, 0x04||x||y
  const authSecret = b64uDecode(clientAuthB64u);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Local ECDH keypair
  const localPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;
  const localPubJwk = (await crypto.subtle.exportKey("jwk", localPair.publicKey)) as JsonWebKey;
  const localPubRaw = new Uint8Array(65);
  localPubRaw[0] = 0x04;
  localPubRaw.set(b64uDecode(localPubJwk.x!), 1);
  localPubRaw.set(b64uDecode(localPubJwk.y!), 33);

  // Import client public
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPubRaw as unknown as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, localPair.privateKey, 256),
  );

  // key_info = "WebPush: info\0" || clientPub || localPub  (RFC 8291)
  const keyInfo = concat(strBytes("WebPush: info\0"), clientPubRaw, localPubRaw);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  const cek = await hkdf(salt, ikm, strBytes("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, strBytes("Content-Encoding: nonce\0"), 12);

  // Pad delimiter byte 0x02 (last record)
  const padded = new Uint8Array(payload.length + 1);
  padded.set(payload, 0);
  padded[payload.length] = 0x02;

  const aesKey = await crypto.subtle.importKey("raw", cek as unknown as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as unknown as BufferSource }, aesKey, padded as unknown as BufferSource),
  );

  // aes128gcm header: salt(16) || rs(4, BE) || idlen(1) || keyid
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = 65;
  header.set(localPubRaw, 21);

  return concat(header, ciphertext);
}

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body?: string;
  link?: string;
  image?: string;
}

export async function sendWebPush(sub: PushSub, payload: PushPayload): Promise<{ ok: boolean; status: number }> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await vapidJwt(audience);
  const body = await encryptPayload(strBytes(JSON.stringify(payload)), sub.p256dh, sub.auth);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${process.env.VAPID_PUBLIC_KEY}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "60",
    },
    body: body as BodyInit,
  });
  return { ok: res.ok, status: res.status };
}
