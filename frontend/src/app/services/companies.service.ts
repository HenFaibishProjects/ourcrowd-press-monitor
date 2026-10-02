import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Mention } from '../models/mention.model';

export interface DateRange {
  from: string;
  to: string;
}

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private readonly http = inject(HttpClient);

  getMentions(companyId: number, dateRange: DateRange): Observable<Mention[]> {
    return this.http.get<Mention[]>(`/api/companies/${companyId}/mentions`, {
      params: { from: dateRange.from, to: dateRange.to },
    });
  }
}
