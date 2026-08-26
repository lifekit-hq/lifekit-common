// Polyfills for jsdom test environment.
// Chart.js uses ResizeObserver to monitor chart container size changes.
// jsdom does not implement ResizeObserver; stub it so chart tests can
// run without throwing while still exercising component logic.
globalThis.ResizeObserver = class ResizeObserver {
  public observe(): void {
    return;
  }

  public unobserve(): void {
    return;
  }

  public disconnect(): void {
    return;
  }
};
