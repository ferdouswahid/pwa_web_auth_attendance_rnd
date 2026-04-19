import { Component, signal, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ZoneService } from '../../services/zone.service';
import { Zone } from '../../models/zone.model';
import { NavShellComponent } from '../nav-shell/nav-shell';

@Component({
  selector: 'app-zones',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, NavShellComponent],
  templateUrl: './zones.html',
})
export class ZonesComponent implements OnInit {
  private zoneService = inject(ZoneService);
  private fb = inject(FormBuilder);

  zones = signal<Zone[]>([]);
  showZoneForm = signal(false);
  editingZone = signal<Zone | null>(null);
  zoneLoading = signal(false);
  zoneError = signal<string | null>(null);

  zoneForm = this.fb.group({
    name: ['', [Validators.required]],
    lat: [null as number | null, [Validators.required, Validators.min(-90), Validators.max(90)]],
    lng: [null as number | null, [Validators.required, Validators.min(-180), Validators.max(180)]],
    radius: [200, [Validators.required, Validators.min(10), Validators.max(50000)]],
  });

  async ngOnInit(): Promise<void> {
    await this.refreshZones();
  }

  async refreshZones(): Promise<void> {
    this.zones.set(await this.zoneService.loadZones());
  }

  toggleZoneForm(): void {
    this.showZoneForm.update(v => !v);
    this.editingZone.set(null);
    this.zoneError.set(null);
    this.zoneForm.reset({ radius: 200 });
  }

  openEditForm(zone: Zone): void {
    this.editingZone.set(zone);
    this.zoneForm.setValue({ name: zone.name, lat: zone.lat, lng: zone.lng, radius: zone.radius });
    this.zoneError.set(null);
    this.showZoneForm.set(true);
  }

  async submitZone(): Promise<void> {
    if (this.zoneForm.invalid || this.zoneLoading()) return;
    this.zoneError.set(null);
    this.zoneLoading.set(true);
    try {
      const { name, lat, lng, radius } = this.zoneForm.value;
      const editing = this.editingZone();
      if (editing) {
        await this.zoneService.updateZone(editing.id!, { name: name!, lat: lat!, lng: lng!, radius: radius! });
      } else {
        await this.zoneService.addZone({ name: name!, lat: lat!, lng: lng!, radius: radius! });
      }
      this.zoneForm.reset({ radius: 200 });
      this.editingZone.set(null);
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

}
