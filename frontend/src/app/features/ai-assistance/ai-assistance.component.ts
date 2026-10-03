import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-ai-assistance',
  standalone: true,
  templateUrl: './ai-assistance.component.html',
  styleUrl: './ai-assistance.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistanceComponent {}
