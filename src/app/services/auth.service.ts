import { Injectable, signal } from '@angular/core';
import { DbService } from './db.service';
import { User } from '../models/user.model';
import { BiometricRegistration } from './biometric.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  constructor(private db: DbService) {
    const saved = sessionStorage.getItem('currentUser');
    if (saved) {
      try {
        this._currentUser.set(JSON.parse(saved) as User);
      } catch {
        sessionStorage.removeItem('currentUser');
      }
    }
  }

  async register(username: string, password: string): Promise<void> {
    const existing = await this.db.users.where('username').equalsIgnoreCase(username).first();
    if (existing) throw new Error('Username is already taken');
    const passwordHash = await this.hashPassword(password);
    await this.db.users.add({ username, passwordHash });
  }

  async login(username: string, password: string): Promise<User> {
    const user = await this.db.users.where('username').equalsIgnoreCase(username).first();
    if (!user) throw new Error('User not found');
    const hash = await this.hashPassword(password);
    if (hash !== user.passwordHash) throw new Error('Invalid password');
    this.persist(user);
    return user;
  }

  logout(): void {
    this._currentUser.set(null);
    sessionStorage.removeItem('currentUser');
  }

  async updateCredentialId(userId: number, reg: BiometricRegistration): Promise<void> {
    await this.db.users.update(userId, {
      credentialId: reg.credentialId,
      webAuthnUserId: reg.webAuthnUserId,
      attestationObject: reg.attestationObject,
      publicKey: reg.publicKey,
      publicKeyAlgorithm: reg.publicKeyAlgorithm,
      origin: reg.origin,
      registeredAt: reg.registeredAt,
      lastSignature: undefined,
      lastVerifiedAt: undefined,
    });
    const updated = await this.db.users.get(userId);
    if (updated) this.persist(updated);
  }

  async updateLastVerified(userId: number, lastSignature: string): Promise<void> {
    await this.db.users.update(userId, { lastSignature, lastVerifiedAt: Date.now() });
    const updated = await this.db.users.get(userId);
    if (updated) this.persist(updated);
  }

  async refreshCurrentUser(): Promise<void> {
    const userId = this._currentUser()?.id;
    if (!userId) return;
    const fresh = await this.db.users.get(userId);
    if (fresh) this.persist(fresh);
  }

  private persist(user: User): void {
    this._currentUser.set(user);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  }

  private async hashPassword(password: string): Promise<string> {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
