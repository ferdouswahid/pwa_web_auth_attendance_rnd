import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm = control.get('confirmPassword');
  if (password && confirm && password.value !== confirm.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form = this.fb.group(
    {
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  error = signal<string | null>(null);
  loading = signal(false);
  success = signal(false);

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.register(this.form.value.username!, this.form.value.password!);
      this.success.set(true);
      setTimeout(() => this.router.navigate(['/login']), 1500);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
