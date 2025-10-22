import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from '../core/app-config.service';
import { map, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}
export interface Device {
  id: string;
  tenantId: string;
  roomId?: string;
  model: string;
  serial: string;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class DevicesService {
  constructor(private http: HttpClient, private cfg: AppConfigService) {}

  //Hämtar tenant via slug
  getTenantBySlug(slug: string): Observable<Tenant> {
    const baseUrl = this.cfg.deviceRegistryUrl;
    return this.http.get<Tenant>(`${baseUrl}/api/tenants/by-slug/${slug}`);
  }

  //Hämtar och gör lista av devices kopplade till tenantId
  listDevices(tenantId: string): Observable<Device[]> {
    const baseUrl = this.cfg.deviceRegistryUrl;
    return this.http.get<Device[]>(
      `${baseUrl}/api/tenants/${tenantId}/devices`
    );
  }

  //HELPER
  //Om tenantId är satt använd det, annars kolla via slug
  listDevicesForConfigTenant(): Observable<Device[]> {
    if (this.cfg.tenantId && !this.cfg.tenantId.startsWith('REPLACE')) {
      return this.listDevices(this.cfg.tenantId);
    }
    return this.getTenantBySlug(this.cfg.tenantSlug).pipe(
      switchMap((t) => this.listDevices(t.id))
    );
  }
}
