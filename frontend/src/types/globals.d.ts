export {};

declare global {
  interface Window {
    google?: any;
    webkitAudioContext?: typeof AudioContext;
  }

  interface Element {
    dataset: DOMStringMap;
  }
}
