import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardResponse } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDashboard(quarter: string): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>('/api/dashboard', { params: { quarter } });
  }
}
