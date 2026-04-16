import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { BiometricService } from '../../services/biometric.service';
import { LocationService, Coordinates } from '../../services/location.service';
import { ZoneService } from '../../services/zone.service';
import { AttendanceService } from '../../services/attendance.service';
import { Zone } from '../../models/zone.model';
import { MapComponent } from '../map/map';

@Component({
  selector: 'app-punch',
  standalone: true,
  imports: [MapComponent, DecimalPipe],
  templateUrl: './punch.html',
})
export class PunchComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private biometricService = inject(BiometricService);
  private locationService = inject(LocationService);
  private zoneService = inject(ZoneService);
  private attendanceService = inject(AttendanceService);
  private router = inject(Router);

  user = this.auth.currentUser;

  coords = signal<Coordinates | null>(null);
  zones = signal<Zone[]>([]);
  activeZone = signal<Zone | null>(null);
  nearestZone = signal<{ zone: Zone; distance: number } | null>(null);

  locationError = signal<string | null>(null);
  actionMessage = signal<string | null>(null);
  actionError = signal<string | null>(null);
  loadingState = signal<'location' | 'biometric' | 'punch' | null>(null);

  biometricSupported = this.biometricService.isSupported();

  private watchId?: number;

  async ngOnInit(): Promise<void> {
    this.zones.set(await this.zoneService.loadZones());
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

  async enableBiometric(): Promise<void> {
    const user = this.user();
    if (!user) return;
    this.loadingState.set('biometric');
    this.actionError.set(null);
    this.actionMessage.set(null);
    try {
      const credentialId = await this.biometricService.registerBiometric(user.username);
      await this.auth.updateCredentialId(user.id!, credentialId);
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
        const verified = await this.biometricService.verifyBiometric(user.credentialId);
        if (!verified) {
          this.actionError.set('Biometric verification failed. Please try again.');
          return;
        }
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

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
