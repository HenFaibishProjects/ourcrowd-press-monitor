import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { DashboardCompany } from '../../models/dashboard.model';
import { DashboardService } from '../../services/dashboard.service';
import { CompanyDetailsComponent } from './components/company-details.component';
import { coverageStatus, daysDisplay, readableDate } from './dashboard.helpers';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CompanyDetailsComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private dashboardRequest?: Subscription;

  readonly quarters = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];
  readonly quarter = signal('2026-Q3');
  readonly companies = signal<DashboardCompany[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly search = signal('');
  readonly activity = signal('all');
  readonly selectedCompany = signal<DashboardCompany | null>(null);
  readonly readableDate = readableDate;
  readonly coverageStatus = coverageStatus;
  readonly daysDisplay = daysDisplay;

  readonly summary = computed(() => {
    const companies = this.companies();
    return {
      tracked: companies.length,
      mentioned: companies.filter(company => company.mentions.total > 0).length,
      total: companies.reduce((total, company) => total + company.mentions.total, 0),
      positive: companies.reduce((total, company) => total + company.mentions.positive, 0),
    };
  });

  readonly visibleCompanies = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    const activity = this.activity();
    return this.companies().filter(company => {
      const matchesSearch = company.name.toLocaleLowerCase().includes(search);
      const mentioned = company.mentions.total > 0;
      const matchesActivity = activity === 'all' || (activity === 'mentioned' ? mentioned : !mentioned);
      return matchesSearch && matchesActivity;
    }).sort((first, second) => {
      const activityOrder = Number(second.mentions.total > 0) - Number(first.mentions.total > 0);
      const latestOrder = (second.lastMentionedAt ? Date.parse(second.lastMentionedAt) : 0)
        - (first.lastMentionedAt ? Date.parse(first.lastMentionedAt) : 0);
      return activityOrder || latestOrder || first.name.localeCompare(second.name);
    });
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  changeQuarter(quarter: string): void {
    this.quarter.set(quarter);
    this.selectedCompany.set(null);
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.dashboardRequest?.unsubscribe();
    this.loading.set(true);
    this.loadFailed.set(false);
    this.companies.set([]);
    this.dashboardRequest = this.dashboardService.getDashboard(this.quarter())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dashboard => {
          this.companies.set(dashboard.companies);
          this.loading.set(false);
        },
        error: () => {
          this.loadFailed.set(true);
          this.loading.set(false);
        },
      });
  }
}
