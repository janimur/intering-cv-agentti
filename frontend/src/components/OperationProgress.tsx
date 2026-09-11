import { useSyncExternalStore } from 'react';
import { getOperationMessage, subscribeOperationMessage } from '../api/operationProgress';
export function OperationProgress({ sessionId, scope }: { sessionId: string | null; scope: string }) {
  const message = useSyncExternalStore(subscribeOperationMessage, () => getOperationMessage(`${sessionId}:${scope}`));
  return message ? <p role="status" className="text-sm text-gray-600 my-3">{message}</p> : null;
}
