import { Component, signal, computed, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { BiometricService } from '../../services/biometric.service';
import { LocationService, Coordinates } from '../../services/location.service';
import { ZoneService } from '../../services/zone.service';
import { AttendanceService } from '../../services/attendance.service';
import { Zone } from '../../models/zone.model';
import { MapComponent } from '../map/map';
import { NavShellComponent } from '../nav-shell/nav-shell';

@Component({
  selector: 'app-punch',
  standalone: true,
  imports: [MapComponent, DecimalPipe, NavShellComponent],
  templateUrl: './punch.html',
})
export class PunchComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private biometricService = inject(BiometricService);
  private locationService = inject(LocationService);
  private zoneService = inject(ZoneService);
  private attendanceService = inject(AttendanceService);

  user = this.auth.currentUser;

  coords = signal<Coordinates | null>(null);
  zones = signal<Zone[]>([]);
  activeZone = signal<Zone | null>(null);
  nearestZone = signal<{ zone: Zone; distance: number } | null>(null);

  zoneDistances = computed(() => {
    const c = this.coords();
    return this.zones()
      .map(z => ({
        zone: z,
        distance: c
          ? this.zoneService.haversineDistance(c.latitude, c.longitude, z.lat, z.lng)
          : null,
        isActive: c
          ? this.zoneService.haversineDistance(c.latitude, c.longitude, z.lat, z.lng) <= z.radius
          : false,
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  });

  locationError = signal<string | null>(null);
  actionMessage = signal<string | null>(null);
  actionError = signal<string | null>(null);
  loadingState = signal<'location' | 'biometric' | 'punch' | null>(null);

  biometricSupported = this.biometricService.isSupported();
  private browserRegistration = signal<{ userId: number } | null>(null);

  readonly browserLockedToOther = computed(() => {
    const reg = this.browserRegistration();
    return reg !== null && reg.userId !== this.user()?.id;
  });

  readonly browserRegisteredForMe = computed(() => {
    const reg = this.browserRegistration();
    return reg !== null && reg.userId === this.user()?.id;
  });

  @ViewChild(MapComponent) private mapRef?: MapComponent;

  private watchId?: number;

  async ngOnInit(): Promise<void> {
    await this.auth.refreshCurrentUser();
    const allZones = await this.zoneService.loadZones();
    const userZoneIds = new Set(this.user()?.zoneIds ?? []);
    this.zones.set(
      userZoneIds.size > 0
        ? allZones.filter(z => z.id !== undefined && userZoneIds.has(z.id))
        : allZones,
    );
    this.browserRegistration.set(await this.biometricService.getBrowserRegistration());
    this.startLocationWatch();
  }

  ngOnDestroy(): void {
    if (this.watchId !== undefined) {
      this.locationService.clearWatch(this.watchId);
    }
  }

  private startLocationWatch(): void {
    this.loadingState.set('location');
    this.watchId = this.locationService.watchPosition(
      coords => {
        this.coords.set(coords);
        this.loadingState.set(null);
        this.locationError.set(null);
        this.updateZoneStatus(coords);
      },
      error => {
        this.loadingState.set(null);
        this.locationError.set(error.message);
      },
    );
  }

  private updateZoneStatus(coords: Coordinates): void {
    const zones = this.zones();
    const active =
      zones.find(
        z =>
          this.zoneService.haversineDistance(coords.latitude, coords.longitude, z.lat, z.lng) <=
          z.radius,
      ) ?? null;
    this.activeZone.set(active);
    this.nearestZone.set(this.zoneService.getNearestZone(coords.latitude, coords.longitude, zones));
  }

  focusZone(zone: Zone): void {
    this.mapRef?.flyToZone(zone.lat, zone.lng);
  }

  async enableBiometric(): Promise<void> {
    const user = this.user();
    if (!user) return;

    const existing = await this.biometricService.getBrowserRegistration();
    if (existing) {
      this.browserRegistration.set(existing);
      this.actionError.set(
        existing.userId === user.id
          ? 'A fingerprint is already registered from this browser for your account.'
          : 'This browser is already registered to another account.',
      );
      return;
    }

    this.loadingState.set('biometric');
    this.actionError.set(null);
    this.actionMessage.set(null);
    try {
      const reg = await this.biometricService.registerBiometric(user.username);
      await this.auth.updateCredentialId(user.id!, reg);
      await this.biometricService.saveBrowserRegistration(user.id!);
      this.browserRegistration.set({ userId: user.id! });
      this.actionMessage.set('Fingerprint registered successfully!');
    } catch (err) {
      this.actionError.set(
        err instanceof Error ? err.message : 'Biometric registration failed',
      );
    } finally {
      this.loadingState.set(null);
    }
  }

  async punch(type: 'in' | 'out'): Promise<void> {
    const user = this.user();
    const coords = this.coords();
    const activeZone = this.activeZone();

    if (!user || !coords || !activeZone) return;

    if (!user.credentialId) {
      this.actionError.set('Fingerprint authentication is required. Please enable it first.');
      return;
    }

    this.actionError.set(null);
    this.actionMessage.set(null);

    if (user.credentialId) {
      this.loadingState.set('biometric');
      try {
        const result = await this.biometricService.verifyBiometric(user.credentialId);
        if (!result.verified) {
          this.actionError.set('Biometric verification failed. Please try again.');
          return;
        }
        await this.auth.updateLastVerified(user.id!, result.lastSignature);
      } catch (err) {
        this.actionError.set(err instanceof Error ? err.message : 'Biometric error');
        return;
      } finally {
        this.loadingState.set(null);
      }
    }

    this.loadingState.set('punch');
    try {
      if (type === 'in') {
        await this.attendanceService.punchIn(
          user.id!,
          coords.latitude,
          coords.longitude,
          activeZone.name,
        );
        this.actionMessage.set(`Punched IN at ${activeZone.name}`);
      } else {
        await this.attendanceService.punchOut(
          user.id!,
          coords.latitude,
          coords.longitude,
          activeZone.name,
        );
        this.actionMessage.set(`Punched OUT from ${activeZone.name}`);
      }
    } catch (err) {
      this.actionError.set(err instanceof Error ? err.message : 'Punch failed');
    } finally {
      this.loadingState.set(null);
    }
  }

}
