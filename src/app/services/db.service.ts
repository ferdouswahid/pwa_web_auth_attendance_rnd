import { Injectable } from '@angular/core';
import Dexie, { type Table } from 'dexie';
import { User } from '../models/user.model';
import { AttendanceRecord } from '../models/attendance.model';
import { Zone } from '../models/zone.model';

@Injectable({ providedIn: 'root' })
export class DbService extends Dexie {
  users!: Table<User, number>;
  attendance!: Table<AttendanceRecord, number>;
  zones!: Table<Zone, number>;

  constructor() {
    super('AttendanceDB');
    this.version(1).stores({
      users: '++id, username',
      attendance: '++id, userId, timestamp',
    });
    // v2 adds the zones table; existing users/attendance data is preserved
    this.version(2).stores({
      zones: '++id, name',
    });
  }
}
