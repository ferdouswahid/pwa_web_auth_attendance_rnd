import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { AttendanceRecord } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor(private db: DbService) {}

  async punchIn(userId: number, latitude: number, longitude: number, zoneName: string): Promise<void> {
    await this.db.attendance.add({
      userId,
      type: 'in',
      timestamp: new Date(),
      latitude,
      longitude,
      zoneName,
    });
  }

  async punchOut(userId: number, latitude: number, longitude: number, zoneName: string): Promise<void> {
    await this.db.attendance.add({
      userId,
      type: 'out',
      timestamp: new Date(),
      latitude,
      longitude,
      zoneName,
    });
  }

  async getHistory(userId: number): Promise<AttendanceRecord[]> {
    const records = await this.db.attendance.where('userId').equals(userId).toArray();
    return records.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  async getLastPunch(userId: number): Promise<AttendanceRecord | undefined> {
    const records = await this.getHistory(userId);
    return records[0];
  }

  exportJson(records: AttendanceRecord[]): string {
    return JSON.stringify(records, null, 2);
  }
}
