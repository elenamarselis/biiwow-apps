// Normal (non-demo) builds resolve '../demo/client' to this stub, so the in-browser
// store and its bundled catalog are never shipped with the real app.
export function demoClient(): never {
  throw new Error('Demo client is only available in the demo build');
}
export function resetDemo() {}
