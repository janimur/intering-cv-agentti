// Session-only UI progress; no browser storage or personal content.
const messages = new Map<string, string>();
const listeners = new Set<() => void>();
export function operationScope(sessionId: string, path: string) {
  return `${sessionId}:${path.startsWith('/api/positioning') ? 'positioning' : path.split('/')[3]}`;
}
export function setOperationMessage(scope: string, message: string) {
  if (message) messages.set(scope, message);
  else messages.delete(scope);
  for (const listener of listeners) listener();
}
export function getOperationMessage(scope: string) { return messages.get(scope) ?? ''; }
export function subscribeOperationMessage(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
