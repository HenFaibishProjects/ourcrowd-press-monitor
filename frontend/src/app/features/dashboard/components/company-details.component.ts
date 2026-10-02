import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardCompany } from '../../../models/dashboard.model';
import { Mention } from '../../../models/mention.model';
import { CompaniesService } from '../../../services/companies.service';
import { quarterDateRange, readableDate } from '../dashboard.helpers';

@Component({
  selector: 'app-company-details',
  standalone: true,
  templateUrl: './company-details.component.html',
  styleUrl: './company-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyDetailsComponent implements AfterViewInit {
  readonly company = input.required<DashboardCompany>();
  readonly quarter = input.required<string>();
  readonly dismiss = output<void>();
  readonly mentions = signal<Mention[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly readableDate = readableDate;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly companiesService = inject(CompaniesService);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
    this.loadMentions();
  }

  loadMentions(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.companiesService.getMentions(this.company().id, quarterDateRange(this.quarter()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: mentions => {
          this.mentions.set(mentions);
          this.loading.set(false);
        },
        error: () => {
          this.loadFailed.set(true);
          this.loading.set(false);
        },
      });
  }

  articleUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : null;
    } catch {
      return null;
    }
  }
}
