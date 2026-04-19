import { Injectable } from '@angular/core';

export interface BiometricRegistration {
  credentialId: string;          // base64
  webAuthnUserId: string;        // hex
  attestationObject: string;     // base64
  publicKey: string | null;      // base64 DER-encoded SPKI — from getPublicKey()
  publicKeyAlgorithm: string;    // e.g. 'ES256' or 'RS256'
  origin: string;
  registeredAt: number;
}

export interface BiometricVerification {
  verified: boolean;
  lastSignature: string;      // base64
}

@Injectable({ providedIn: 'root' })
export class BiometricService {
  isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential;
  }

  async registerBiometric(username: string): Promise<BiometricRegistration> {
    if (!this.isSupported()) throw new Error('WebAuthn is not supported on this device');

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = crypto.getRandomValues(new Uint8Array(16));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'R&D Attendance System', id: window.location.hostname },
        user: { id: userIdBytes, name: username, displayName: username },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) throw new Error('Credential creation was cancelled');

    const response = credential.response as AuthenticatorAttestationResponse;
    const clientData = JSON.parse(new TextDecoder().decode(response.clientDataJSON)) as { origin: string };

    // getPublicKey() returns SubjectPublicKeyInfo (SPKI) DER bytes — available Chrome 85+, Firefox 117+, Safari 16+
    const pubKeyBuffer = response.getPublicKey?.() ?? null;
    const pubKeyBase64 = pubKeyBuffer
      ? btoa(String.fromCharCode(...new Uint8Array(pubKeyBuffer)))
      : null;

    // getPublicKeyAlgorithm() returns the COSE algorithm integer (-7 = ES256, -257 = RS256)
    const alg = response.getPublicKeyAlgorithm?.() ?? 0;
    const publicKeyAlgorithm = alg === -7 ? 'ES256 (ECDSA P-256)' : alg === -257 ? 'RS256 (RSASSA-PKCS1-v1_5)' : `COSE ${alg}`;

    return {
      credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      webAuthnUserId: [...userIdBytes].map(b => b.toString(16).padStart(2, '0')).join(''),
      attestationObject: btoa(String.fromCharCode(...new Uint8Array(response.attestationObject))),
      publicKey: pubKeyBase64,
      publicKeyAlgorithm,
      origin: clientData.origin,
      registeredAt: Date.now(),
    };
  }

  async verifyBiometric(credentialId: string): Promise<BiometricVerification> {
    if (!this.isSupported()) throw new Error('WebAuthn is not supported on this device');

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawId = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));

    try {
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{ id: rawId, type: 'public-key', transports: ['internal'] }],
          userVerification: 'required',
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!assertion) return { verified: false, lastSignature: '' };

      const response = assertion.response as AuthenticatorAssertionResponse;
      const lastSignature = btoa(String.fromCharCode(...new Uint8Array(response.signature)));

      return { verified: true, lastSignature };
    } catch {
      return { verified: false, lastSignature: '' };
    }
  }
}
