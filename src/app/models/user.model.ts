export interface User {
  id?: number;
  username: string;
  passwordHash: string;
  // WebAuthn registration fields
  credentialId?: string;          // base64 — public device identifier
  webAuthnUserId?: string;        // hex — random user.id bytes used in navigator.credentials.create
  attestationObject?: string;     // base64 — CBOR attestation object
  publicKey?: string | null;      // base64 DER SPKI — extracted via getPublicKey()
  publicKeyAlgorithm?: string;    // e.g. 'ES256 (ECDSA P-256)'
  origin?: string;                // e.g. https://example.com
  registeredAt?: number;          // Date.now() at registration
  lastSignature?: string;         // base64 — signature from last successful verification
  lastVerifiedAt?: number;        // Date.now() of last successful punch
  zoneIds?: number[];
}
