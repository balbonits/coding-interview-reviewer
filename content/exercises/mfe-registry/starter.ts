export interface MfeConfig {
  name: string;
  url: string;
  routes: string[];
}

// TODO: implement MfeRegistry.
// See the problem statement for the full behaviour spec.
export class MfeRegistry {
  register(_config: MfeConfig): void {
    // throw if name already registered
    // throw if any route is already claimed
  }

  resolve(_path: string): MfeConfig | undefined {
    // return the config whose route prefix is the longest match for _path
    return undefined;
  }

  list(): MfeConfig[] {
    // insertion order
    return [];
  }

  unregister(_name: string): boolean {
    // remove MFE + its route claims; return true if found
    return false;
  }
}
