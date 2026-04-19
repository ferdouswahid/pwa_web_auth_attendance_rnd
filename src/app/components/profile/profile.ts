import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ZoneService } from '../../services/zone.service';
import { Zone } from '../../models/zone.model';
import { NavShellComponent } from '../nav-shell/nav-shell';

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
  onLine: boolean;
  biometricSupported: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [DatePipe, NavShellComponent],
  templateUrl: './profile.html',
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private zoneService = inject(ZoneService);

  user = this.auth.currentUser;

  assignedZones = signal<Zone[]>([]);
  loading = signal(true);
  deviceInfo = signal<DeviceInfo | null>(null);

  async ngOnInit(): Promise<void> {
    await this.auth.refreshCurrentUser();
    const u = this.user();
    if (!u?.id) return;

    const allZones = await this.zoneService.loadZones();

    const userZoneIds = new Set(u.zoneIds ?? []);
    this.assignedZones.set(allZones.filter(z => z.id !== undefined && userZoneIds.has(z.id)));

    this.deviceInfo.set({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width} × ${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      onLine: navigator.onLine,
      biometricSupported: typeof PublicKeyCredential !== 'undefined',
    });

    this.loading.set(false);
  }

  truncateCredential(id: string): string {
    return id.length > 20 ? id.slice(0, 10) + '…' + id.slice(-10) : id;
  }
}
