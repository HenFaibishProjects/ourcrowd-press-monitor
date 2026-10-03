import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './core/nav/nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent],
  template: `
    <app-nav />
    <main>
      <router-outlet />
    </main>
    <footer class="app-footer">
      <span>NestJS · Angular · PostgreSQL · Local Ollama</span>
      <span class="footer-divider" aria-hidden="true">·</span>
      <span class="footer-muted">Live discovery: GDELT&nbsp;&nbsp;·&nbsp;&nbsp;Deterministic review: FileNewsProvider</span>
    </footer>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }

    main {
      flex: 1;
    }

    .app-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 14px 32px;
      border-top: 1px solid var(--border);
      background: white;
      font-size: 11px;
      color: #8a98aa;
    }

    .footer-divider {
      color: var(--border);
    }

    .footer-muted {
      color: #a8b4c0;
    }

    @media (max-width: 560px) {
      .app-footer {
        padding: 12px 16px;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .footer-divider {
        display: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
