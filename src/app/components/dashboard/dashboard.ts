import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AttendanceService } from '../../services/attendance.service';
import { ZoneService } from '../../services/zone.service';
import { AttendanceRecord } from '../../models/attendance.model';
import { Zone } from '../../models/zone.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private attendanceService = inject(AttendanceService);
  private zoneService = inject(ZoneService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  user = this.auth.currentUser;

  // Attendance
  history = signal<AttendanceRecord[]>([]);
  lastPunch = signal<AttendanceRecord | undefined>(undefined);
  historyLoading = signal(true);

  // Zones
  zones = signal<Zone[]>([]);
  showZoneForm = signal(false);
  zoneLoading = signal(false);
  zoneError = signal<string | null>(null);

  zoneForm = this.fb.group({
    name: ['', [Validators.required]],
    lat: [null as number | null, [Validators.required, Validators.min(-90), Validators.max(90)]],
    lng: [null as number | null, [Validators.required, Validators.min(-180), Validators.max(180)]],
    radius: [200, [Validators.required, Validators.min(10), Validators.max(50000)]],
  });

  async ngOnInit(): Promise<void> {
    const user = this.user();
    if (!user?.id) return;
    const [records] = await Promise.all([
      this.attendanceService.getHistory(user.id),
      this.refreshZones(),
    ]);
    this.history.set(records.slice(0, 15));
    this.lastPunch.set(records[0]);
    this.historyLoading.set(false);
  }

  // ── Zone management ────────────────────────────────────────────────────────

  async refreshZones(): Promise<void> {
    this.zones.set(await this.zoneService.loadZones());
  }

  toggleZoneForm(): void {
    this.showZoneForm.update(v => !v);
    this.zoneError.set(null);
    this.zoneForm.reset({ radius: 200 });
  }

  async submitZone(): Promise<void> {
    if (this.zoneForm.invalid || this.zoneLoading()) return;
    this.zoneError.set(null);
    this.zoneLoading.set(true);
    try {
      const { name, lat, lng, radius } = this.zoneForm.value;
      await this.zoneService.addZone({ name: name!, lat: lat!, lng: lng!, radius: radius! });
      this.zoneForm.reset({ radius: 200 });
      this.showZoneForm.set(false);
      await this.refreshZones();
    } catch (err) {
      this.zoneError.set(err instanceof Error ? err.message : 'Failed to save zone');
    } finally {
      this.zoneLoading.set(false);
    }
  }

  async deleteZone(id: number): Promise<void> {
    await this.zoneService.deleteZone(id);
    await this.refreshZones();
  }

  // ── Attendance ─────────────────────────────────────────────────────────────

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

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
