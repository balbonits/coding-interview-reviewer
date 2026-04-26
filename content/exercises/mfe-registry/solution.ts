export interface MfeConfig {
  name: string;
  url: string;
  routes: string[];
}

export class MfeRegistry {
  private byName = new Map<string, MfeConfig>();
  private routeOwner = new Map<string, string>(); // route prefix → owner name

  register(config: MfeConfig): void {
    if (this.byName.has(config.name)) {
      throw new Error(`MFE "${config.name}" is already registered`);
    }
    for (const route of config.routes) {
      const owner = this.routeOwner.get(route);
      if (owner) {
        throw new Error(`Route "${route}" is already claimed by "${owner}"`);
      }
    }
    this.byName.set(config.name, config);
    for (const route of config.routes) {
      this.routeOwner.set(route, config.name);
    }
  }

  resolve(path: string): MfeConfig | undefined {
    let best: string | undefined;
    for (const route of this.routeOwner.keys()) {
      if (path.startsWith(route)) {
        if (!best || route.length > best.length) {
          best = route;
        }
      }
    }
    if (!best) return undefined;
    const name = this.routeOwner.get(best)!;
    return this.byName.get(name);
  }

  list(): MfeConfig[] {
    return [...this.byName.values()];
  }

  unregister(name: string): boolean {
    const config = this.byName.get(name);
    if (!config) return false;
    for (const route of config.routes) {
      this.routeOwner.delete(route);
    }
    this.byName.delete(name);
    return true;
  }
}
