import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppConfigService } from '../core/app-config.service';
import { Observable } from 'rxjs';

export interface SeriesPoint {
  t: string; // timestamp
  v: number; // value
}

export interface SeriesResponse {
  deviceId: string;
  type: string;
  from: string;
  to: string;
  points: SeriesPoint[];
}

export interface MeasurementsRow {
  time: string;
  type: string;
  value: number;
}

export interface MeasurementsResponse {
  deviceId: string;
  count: number;
  from?: string;
  to?: string;
  type?: string;
  measurements: MeasurementsRow[];
}

@Injectable({
  providedIn: 'root',
})
export class PortalService {
  constructor(private http: HttpClient, private cfg: AppConfigService) {}

  //Hämtar serie för device och metric typ
  getSeries(
    tenantId: string,
    deviceId: string,
    type: string,
    fromIso: string,
    toIso: string
  ): Observable<SeriesResponse> {
    const baseUrl = this.cfg.portalUrl;
    const params = new HttpParams()
      .set('type', type)
      .set('from', fromIso)
      .set('to', toIso);

    return this.http.get<SeriesResponse>(
      `${baseUrl}/portal/${tenantId}/devices/${deviceId}/series`,
      { params }
    );
  }

  //Hämta alla mätningar
  getMeasurements(
    tenantId: string,
    deviceId: string,
    opts?: { from?: string; to?: string; type?: string }
  ): Observable<MeasurementsResponse> {
    const baseUrl = this.cfg.portalUrl;
    let params = new HttpParams();
    if (opts?.from) params = params.set('from', opts.from);
    if (opts?.to) params = params.set('to', opts.to);
    if (opts?.type) params = params.set('type', opts.type);

    return this.http.get<MeasurementsResponse>(
      `${baseUrl}/portal/${tenantId}/devices/${deviceId}/measurements`,
      { params }
    );
  }
}
