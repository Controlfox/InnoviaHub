import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DevicesService, Device } from '../../services/devices.service';
import { SignalrService } from '../../services/signalr.service';
import { interval, Subscription } from 'rxjs';
import {
  AdminTab,
  NavTabsComponent,
} from '../../components/nav-tabs/nav-tabs.component';

type MeasurementSnapshot = { value: number; time: string };
type LatestMap = Record<string, Record<string, MeasurementSnapshot>>;

@Component({
  selector: 'app-sensor-page',
  standalone: true,
  imports: [CommonModule, NavTabsComponent],
  templateUrl: './sensor-page.component.html',
  styleUrls: ['./sensor-page.component.css'],
})
export class SensorPageComponent implements OnInit, OnDestroy {
  isNaN(arg0: number | undefined) {
    throw new Error('Method not implemented.');
  }
  // UI state
  loading = true;
  error: string | null = null;

  // Data
  devices: Device[] = [];
  latest: LatestMap = {};

  private lastUpdated: Record<string, Date> = {};
  private relativeLabels: Record<string, string> = {};
  private tickerSub?: Subscription;

  categories = ['Kontorslandskap', 'Mötesrum', 'VR-headset', 'AI-server'];

  // Vi använder id som sluggar av labels för stabilitet
  private toId = (label: string) =>
    label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // ta bort accenter
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  activeCategory = signal<string>(this.categories[0]);
  activeCategoryId = computed(() => this.toId(this.activeCategory()));

  // Tabs till NavTabsComponent
  /* categoryTabs: AdminTab[] = this.categories.map((label) => ({
    id: this.toId(label),
    label,
  }));

  // När användaren klickar på en tab
  onCategoryChange(tabId: string) {
    const match = this.categories.find((c) => this.toId(c) === tabId);
    if (match) {
      this.activeCategory.set(match);
      this.pageIndex.set(0); // valfritt: nollställ paginering
    }
  }*/

  // Paginering
  pageSize = 10; // antal kort per sida
  pageIndex = signal<number>(0);

  // Vald enhet for future reference
  selectedDeviceId: string | null = null;
  alertsByDevice: Record<string, string> = {};
  private subs: Subscription[] = [];

  constructor(private devicesSvc: DevicesService, private rt: SignalrService) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.rt.startAndJoinTenant();

      // Lyssna på realtime mätningar för "Updated …"
      this.subs.push(
        this.rt.measurements$.subscribe((m) => {
          if (!m) return;
          const id = (m.deviceId ?? '').toLowerCase();
          this.latest[id] ??= {};
          this.latest[id][m.type] = { value: m.value, time: m.time };

          this.lastUpdated[id] = new Date(m.time);
          this.relativeLabels[id] = this.timeSince(this.lastUpdated[id]);
        })
      );

      // Alert
      this.subs.push(
        this.rt.alerts$.subscribe((a) => {
          if (!a) return;
          const id = (a.deviceId ?? '').toLowerCase();
          this.alertsByDevice[id] = 'Varning'; // UI visar bara texten "Varning"

          // Logga hela alerten i konsolen
          console.log('⚠️ ALERT mottagen:', a);
        })
      );

      //Starta tick
      this.tickerSub = interval(1000).subscribe(() => {
        for (const id of Object.keys(this.lastUpdated)) {
          this.relativeLabels[id] = this.timeSince(this.lastUpdated[id]);
        }
      });

      // Hämta devices
      this.subs.push(
        this.devicesSvc.listDevicesForConfigTenant().subscribe({
          next: (list) => {
            this.devices = list ?? [];
            this.loading = false;
          },
          error: (e) => {
            console.error(e);
            this.error = 'Kunde inte hämta enheter.';
            this.loading = false;
          },
        })
      );
    } catch (e) {
      console.error(e);
      this.error = 'Kunde inte ansluta till realtid.';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.tickerSub?.unsubscribe();
  }

  // ————— Helpers —————

  // Här kan du lägga din “kategorilogik”.
  // Just nu: dummy-matchning som grupperar på modellens första ord
  // och låter "Kontorslandskap" visa alla.
  private matchesCategory(d: Device, cat: string): boolean {
    if (cat === 'Kontorslandskap') return true;
    const firstWord = (d.model ?? '').split(' ')[0].toLowerCase();
    return (
      firstWord.includes(cat.toLowerCase()) ||
      (d.serial ?? '').toLowerCase().includes(cat.toLowerCase())
    );
  }

  filtered = computed(() =>
    this.devices.filter((d) => this.matchesCategory(d, this.activeCategory()))
  );

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize))
  );

  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  setCategory(cat: string) {
    this.activeCategory.set(cat);
    this.pageIndex.set(0);
  }

  // “Updated …” text
  updatedLabel(d: Device): string {
    const id = (d.id ?? '').toLowerCase();
    return this.relativeLabels[id] || 'Aldrig uppdaterad';
  }

  private timeSince(last: Date | null): string {
    if (!last) return 'Aldrig uppdaterad';

    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 60) return `Uppdaterad för ${diffSec} sek sedan`;
    if (diffMin < 60) return `Uppdaterad för ${diffMin} min sedan`;
    if (diffHr < 24) return `Uppdaterad för ${diffHr} tim sedan`;

    const diffDays = Math.floor(diffHr / 24);
    return `Uppdaterad för ${diffDays} d sedan`;
  }

  onClickCard(d: Device) {
    this.selectedDeviceId = d.id;
  }

  isActive(d: Device) {
    return (d.status ?? '').toLowerCase() === 'active';
  }
}
