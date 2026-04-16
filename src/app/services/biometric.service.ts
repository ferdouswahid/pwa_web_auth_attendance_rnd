import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BiometricService {
  isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential;
  }

  async registerBiometric(username: string): Promise<string> {
    if (!this.isSupported()) throw new Error('WebAuthn is not supported on this device');

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'R&D Attendance System', id: window.location.hostname },
        user: { id: userId, name: username, displayName: username },
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
    return btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
  }

  async verifyBiometric(credentialId: string): Promise<boolean> {
    if (!this.isSupported()) throw new Error('WebAuthn is not supported on this device');

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawId = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{ id: rawId, type: 'public-key', transports: ['internal'] }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      return !!assertion;
    } catch {
      return false;
    }
  }
}
