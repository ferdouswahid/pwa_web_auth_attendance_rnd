import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  SimpleChanges,
} from '@angular/core';
import * as L from 'leaflet';
import { Zone } from '../../models/zone.model';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.html',
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() userLat: number | null = null;
  @Input() userLng: number | null = null;
  @Input() zones: Zone[] = [];
  @Input() activeZone: Zone | null = null;

  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private userMarker?: L.Marker;
  private zoneCircles: L.Circle[] = [];

  // Track first-fit milestones so we only auto-fit at startup
  private fittedToZones = false;
  private fittedToUser = false;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    // Zones or active zone changed → redraw circles, recolour active one
    if ('zones' in changes || 'activeZone' in changes) {
      this.redrawZones();

      // First time zones arrive: fit the viewport to show them all
      if ('zones' in changes && this.zones.length && !this.fittedToZones) {
        this.fittedToZones = true;
        this.fitBoundsToAll();
      }
    }

    // User position changed → just move the marker
    if (('userLat' in changes || 'userLng' in changes) && this.userLat !== null && this.userLng !== null) {
      this.updateUserMarker();

      // First time we get a position after zones are drawn: refit to include the user
      if (!this.fittedToUser && this.fittedToZones) {
        this.fittedToUser = true;
        this.fitBoundsToAll();
      }
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    // Start with a neutral world view; fitBounds will zoom in once data arrives
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: true }).setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // Draw whatever inputs are already available (e.g. after a hot-reload)
    if (this.zones.length) {
      this.redrawZones();
      this.fittedToZones = true;
      this.fitBoundsToAll();
    }
    if (this.userLat !== null && this.userLng !== null) {
      this.updateUserMarker();
    }
  }

  // ── Zone circles ────────────────────────────────────────────────────────────

  private redrawZones(): void {
    if (!this.map) return;

    this.zoneCircles.forEach(c => c.remove());
    this.zoneCircles = [];

    this.zones.forEach(zone => {
      const isActive = this.activeZone?.id === zone.id;
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color: isActive ? '#22c55e' : '#6366f1',
        fillColor: isActive ? '#22c55e' : '#6366f1',
        fillOpacity: isActive ? 0.2 : 0.1,
        weight: isActive ? 3 : 2,
      })
        .addTo(this.map!)
        .bindPopup(
          `<strong>${zone.name}</strong><br><small>Radius: ${zone.radius} m</small>` +
          (isActive ? '<br><span style="color:#22c55e;font-weight:600">✓ You are here</span>' : ''),
        );
      this.zoneCircles.push(circle);
    });
  }

  // ── User marker ─────────────────────────────────────────────────────────────

  private updateUserMarker(): void {
    if (!this.map || this.userLat === null || this.userLng === null) return;

    const userIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    if (this.userMarker) {
      this.userMarker.setLatLng([this.userLat, this.userLng]);
    } else {
      this.userMarker = L.marker([this.userLat, this.userLng], { icon: userIcon })
        .bindPopup('<strong>Your Location</strong>')
        .addTo(this.map);
    }
  }

  // ── Fit bounds to all zones + optional user pin ──────────────────────────────

  private fitBoundsToAll(): void {
    if (!this.map) return;

    const bounds = L.latLngBounds([]);

    // Extend bounds to cover every zone circle (centre ± radius)
    this.zoneCircles.forEach(c => bounds.extend(c.getBounds()));

    // Include the user's position if available
    if (this.userLat !== null && this.userLng !== null) {
      bounds.extend([this.userLat, this.userLng]);
    }

    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
    }
  }

  // ── Public: pan map to a specific zone ──────────────────────────────────────

  flyToZone(lat: number, lng: number): void {
    if (!this.map) return;
    this.map.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
  }
}
