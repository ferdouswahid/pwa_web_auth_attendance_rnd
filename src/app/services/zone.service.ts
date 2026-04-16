import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { Zone } from '../models/zone.model';

@Injectable({ providedIn: 'root' })
export class ZoneService {
  constructor(private db: DbService) {}

  loadZones(): Promise<Zone[]> {
    return this.db.zones.toArray();
  }

  async addZone(zone: Omit<Zone, 'id'>): Promise<void> {
    await this.db.zones.add(zone);
  }

  async deleteZone(id: number): Promise<void> {
    await this.db.zones.delete(id);
  }

  async checkUserZone(lat: number, lng: number): Promise<Zone | null> {
    const zones = await this.loadZones();
    return zones.find(z => this.haversineDistance(lat, lng, z.lat, z.lng) <= z.radius) ?? null;
  }

  getNearestZone(lat: number, lng: number, zones: Zone[]): { zone: Zone; distance: number } | null {
    if (!zones.length) return null;
    return zones.reduce<{ zone: Zone; distance: number } | null>((nearest, zone) => {
      const distance = this.haversineDistance(lat, lng, zone.lat, zone.lng);
      return !nearest || distance < nearest.distance ? { zone, distance } : nearest;
    }, null);
  }

  haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
