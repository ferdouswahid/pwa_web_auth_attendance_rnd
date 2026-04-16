import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  error = signal<string | null>(null);
  loading = signal(false);

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.login(this.form.value.username!, this.form.value.password!);
      this.router.navigate(['/dashboard']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
