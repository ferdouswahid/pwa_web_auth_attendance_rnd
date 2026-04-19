import { Injectable, inject } from '@angular/core';
import { DbService } from './db.service';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private db = inject(DbService);

  getAll(): Promise<User[]> {
    return this.db.users.orderBy('username').toArray();
  }

  async createEmployee(username: string, password: string, zoneIds: number[]): Promise<void> {
    const existing = await this.db.users.where('username').equalsIgnoreCase(username).first();
    if (existing) throw new Error('Username already taken');
    const passwordHash = await this.hashPassword(password);
    await this.db.users.add({ username, passwordHash, zoneIds });
  }

  async updateEmployee(
    id: number,
    data: { username: string; password?: string; zoneIds: number[] },
  ): Promise<void> {
    const existing = await this.db.users.where('username').equalsIgnoreCase(data.username).first();
    if (existing && existing.id !== id) throw new Error('Username already taken');
    const update: Partial<User> = { username: data.username, zoneIds: data.zoneIds };
    if (data.password) {
      update.passwordHash = await this.hashPassword(data.password);
    }
    await this.db.users.update(id, update);
  }

  async deleteEmployee(id: number): Promise<void> {
    await this.db.users.delete(id);
  }

  private async hashPassword(password: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
