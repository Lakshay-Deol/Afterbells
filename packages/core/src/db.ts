import * as fs from 'fs';
import * as path from 'path';
import { Plan, Sample, Order, DxEvent } from './models';

export interface DatabaseState {
  plans: Plan[];
  samples: Sample[];
  orders: Order[];
  dx_events: DxEvent[];
}

export class MemoryOrFileDatabase {
  private state: DatabaseState;
  private filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
    this.state = this.loadInitialState();
  }

  private loadInitialState(): DatabaseState {
    if (this.filePath && fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      } catch {
        // fallback to seed
      }
    }
    return this.createSeedState();
  }

  private save() {
    if (this.filePath) {
      try {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
      } catch {
        // ignore write error in transient envs
      }
    }
  }

  private createSeedState(): DatabaseState {
    // Only captured observations and explicitly saved plans belong in storage.
    return { plans: [], samples: [], orders: [], dx_events: [] };
  }

  // Plan methods
  public getPlans(): Plan[] {
    return this.state.plans;
  }

  public getPlan(id: string): Plan | undefined {
    return this.state.plans.find(p => p.id === id);
  }

  public savePlan(plan: Plan) {
    const idx = this.state.plans.findIndex(p => p.id === plan.id);
    if (idx >= 0) {
      this.state.plans[idx] = plan;
    } else {
      this.state.plans.unshift(plan);
    }
    this.save();
  }

  public deletePlan(id: string) {
    this.state.plans = this.state.plans.filter(p => p.id !== id);
    this.save();
  }

  // Sample methods
  public getSamples(limit: number = 200, ticker?: string): Sample[] {
    let list = this.state.samples;
    if (ticker) {
      list = list.filter(s => s.ticker.toUpperCase() === ticker.toUpperCase());
    }
    return list.slice(-limit);
  }

  public addSample(sample: Omit<Sample, 'id'>): Sample {
    const newSample: Sample = {
      ...sample,
      id: this.state.samples.length + 1
    };
    this.state.samples.push(newSample);
    this.save();
    return newSample;
  }

  // Order methods
  public getOrders(limit: number = 50): Order[] {
    return this.state.orders.slice(-limit).reverse();
  }

  public getOrder(id: string): Order | undefined {
    return this.state.orders.find(o => o.id === id);
  }

  public saveOrder(order: Order) {
    const idx = this.state.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      this.state.orders[idx] = order;
    } else {
      this.state.orders.unshift(order);
    }
    this.save();
  }

  // DxEvent methods
  public getDxEvents(limit: number = 200): DxEvent[] {
    return this.state.dx_events.slice(-limit).reverse();
  }

  public addDxEvent(event: Omit<DxEvent, 'id' | 'ts'>): DxEvent {
    const newEvent: DxEvent = {
      ...event,
      id: this.state.dx_events.length + 1,
      ts: new Date().toISOString()
    };
    this.state.dx_events.push(newEvent);
    this.save();
    return newEvent;
  }
}

// Global default db instance
let defaultDbInstance: MemoryOrFileDatabase | null = null;

export function getDatabase(): MemoryOrFileDatabase {
  if (!defaultDbInstance) {
    const storagePath = path.resolve(process.cwd(), 'data/afterbells.json');
    defaultDbInstance = new MemoryOrFileDatabase(storagePath);
  }
  return defaultDbInstance;
}
