import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppConfigService } from '../core/app-config.service';

export interface RealtimeMeasurement {
  tenantSlug: string;
  deviceId: string;
  type: string; //"temperature"
  value: number;
  time: string;
}

export interface RealtimeAlert {
  tenantSlug: string;
  deviceId: string;
  type: string;
  value: number;
  time: string;
  ruleId: string;
  severity: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class SignalrService {
  private connection?: signalR.HubConnection;
  private _connected$ = new BehaviorSubject<boolean>(false);
  connected$: Observable<boolean> = this._connected$.asObservable();

  private _measurements$ = new BehaviorSubject<RealtimeMeasurement | null>(
    null
  );
  measurements$: Observable<RealtimeMeasurement | null> =
    this._measurements$.asObservable();

  private _alerts$ = new BehaviorSubject<RealtimeAlert | null>(null);
  alerts$: Observable<RealtimeAlert | null> = this._alerts$.asObservable();

  constructor(private zone: NgZone, private cfg: AppConfigService) {}

  async startAndJoinTenant(): Promise<void> {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.cfg.realtimeHubUrl)
      .withAutomaticReconnect()
      .build();

    this.connection.onreconnected(() =>
      this.zone.run(() => this._connected$.next(true))
    );
    this.connection.onclose(() =>
      this.zone.run(() => this._connected$.next(false))
    );

    this.connection.on('measurementReceived', (m: RealtimeMeasurement) => {
      this.zone.run(() => this._measurements$.next(m));
    });

    this.connection.on('alertRaised', (a: RealtimeAlert) => {
      this.zone.run(() => this._alerts$.next(a));
    });

    await this.connection.start();
    this.zone.run(() => this._connected$.next(true));

    // Join tenant-group by slug
    await this.connection.invoke('JoinTenant', this.cfg.tenantSlug);
  }
}
