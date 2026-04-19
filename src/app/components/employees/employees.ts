import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { ZoneService } from '../../services/zone.service';
import { User } from '../../models/user.model';
import { Zone } from '../../models/zone.model';
import { NavShellComponent } from '../nav-shell/nav-shell';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [ReactiveFormsModule, NavShellComponent],
  templateUrl: './employees.html',
})
export class EmployeesComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private zoneService = inject(ZoneService);
  private fb = inject(FormBuilder);

  employees = signal<User[]>([]);
  zones = signal<Zone[]>([]);
  showForm = signal(false);
  editingUser = signal<User | null>(null);
  loading = signal(false);
  deleteLoadingId = signal<number | null>(null);
  error = signal<string | null>(null);
  selectedZoneIds = signal<Set<number>>(new Set());

  isEditing = computed(() => this.editingUser() !== null);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const [emps, zones] = await Promise.all([
      this.employeeService.getAll(),
      this.zoneService.loadZones(),
    ]);
    this.employees.set(emps);
    this.zones.set(zones);
  }

  getZonesForUser(zoneIds?: number[]): Zone[] {
    if (!zoneIds?.length) return [];
    const all = this.zones();
    return zoneIds.map(id => all.find(z => z.id === id)).filter(Boolean) as Zone[];
  }

  getUserInitial(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  openAddForm(): void {
    this.editingUser.set(null);
    this.form.reset();
    this.form.get('password')!.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')!.updateValueAndValidity();
    this.selectedZoneIds.set(new Set());
    this.error.set(null);
    this.showForm.set(true);
  }

  openEditForm(emp: User): void {
    this.editingUser.set(emp);
    this.form.reset({ username: emp.username, password: '' });
    this.form.get('password')!.setValidators([Validators.minLength(6)]);
    this.form.get('password')!.updateValueAndValidity();
    this.selectedZoneIds.set(new Set(emp.zoneIds ?? []));
    this.error.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingUser.set(null);
    this.error.set(null);
  }

  toggleZone(id: number): void {
    this.selectedZoneIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isZoneSelected(id: number): boolean {
    return this.selectedZoneIds().has(id);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      const { username, password } = this.form.value;
      const zoneIds = Array.from(this.selectedZoneIds());
      const editing = this.editingUser();
      if (editing?.id) {
        await this.employeeService.updateEmployee(editing.id, {
          username: username!,
          password: password || undefined,
          zoneIds,
        });
      } else {
        await this.employeeService.createEmployee(username!, password!, zoneIds);
      }
      this.closeForm();
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteEmployee(emp: User): Promise<void> {
    if (!emp.id) return;
    this.deleteLoadingId.set(emp.id);
    try {
      await this.employeeService.deleteEmployee(emp.id);
      await this.refresh();
    } finally {
      this.deleteLoadingId.set(null);
    }
  }

}
