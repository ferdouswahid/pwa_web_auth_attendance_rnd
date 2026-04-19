import { Component } from '@angular/core';

@Component({
  selector: 'app-docs',
  standalone: true,
  template: '',
})
export class DocsComponent {
  constructor() {
    window.location.replace('/docs.html');
  }
}
