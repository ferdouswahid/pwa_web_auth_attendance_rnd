import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AttendanceService } from '../../services/attendance.service';
import { ZoneService } from '../../services/zone.service';
import { AttendanceRecord } from '../../models/attendance.model';
import { Zone } from '../../models/zone.model';
import { NavShellComponent } from '../nav-shell/nav-shell';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, NavShellComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private attendanceService = inject(AttendanceService);
  private zoneService = inject(ZoneService);

  user = this.auth.currentUser;

  history = signal<AttendanceRecord[]>([]);
  lastPunch = signal<AttendanceRecord | undefined>(undefined);
  historyLoading = signal(true);
  zoneCount = signal(0);
  assignedZones = signal<Zone[]>([]);
  todayPunchIn = signal<AttendanceRecord | undefined>(undefined);
  todayPunchOut = signal<AttendanceRecord | undefined>(undefined);

  async ngOnInit(): Promise<void> {
    const user = this.user();
    if (!user?.id) return;
    const [records, zones] = await Promise.all([
      this.attendanceService.getHistory(user.id),
      this.zoneService.loadZones(),
    ]);
    this.history.set(records.slice(0, 15));
    this.lastPunch.set(records[0]);
    this.zoneCount.set(zones.length);
    const userZoneIds = new Set(user.zoneIds ?? []);
    this.assignedZones.set(zones.filter(z => z.id !== undefined && userZoneIds.has(z.id)));
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayRecords = records.filter(r => {
      const t = new Date(r.timestamp);
      return t >= todayStart && t <= todayEnd;
    });
    const inRecords = todayRecords.filter(r => r.type === 'in');
    const outRecords = todayRecords.filter(r => r.type === 'out');
    this.todayPunchIn.set(inRecords.at(-1));
    this.todayPunchOut.set(outRecords[0]);
    this.historyLoading.set(false);
  }

  // ── Attendance ─────────────────────────────────────────────────────────────

  async exportData(): Promise<void> {
    const user = this.user();
    if (!user?.id) return;
    const records = await this.attendanceService.getHistory(user.id);
    const json = this.attendanceService.exportJson(records);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${user.username}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getTypeLabel(type: 'in' | 'out'): string {
    return type === 'in' ? 'IN' : 'OUT';
  }
}
