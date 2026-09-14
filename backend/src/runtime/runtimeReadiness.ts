import { distributedStateEnabled } from './distributedConfig.js';

let realtimeProbe: (() => boolean) | undefined;
export function registerRuntimeRealtimeProbe(probe: () => boolean) {
  realtimeProbe = probe;
}
export function runtimeRealtimeReady() {
  return !distributedStateEnabled() || realtimeProbe?.() === true;
}
