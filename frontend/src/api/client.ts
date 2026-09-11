import { operationScope, setOperationMessage } from "./operationProgress";
import type {
  UploadResponse,
  PositioningDocument,
  LinkedInOutput,
  CVDocument,
  InteringOutput,
  WriterType,
  IteratePayload,
  PromptItem,
  WorkflowState,
  MemberProfile,
  AnswerDisposition,
  ModelOperation,
} from "../types/api";

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

// Tallenna admin-token sessionStorageen jotta se sailyy reload:n yli
let _adminToken: string | null = sessionStorage.getItem("admin_token");

export function setAdminToken(token: string | null) {
  _adminToken = token;
  if (token) sessionStorage.setItem("admin_token", token);
  else sessionStorage.removeItem("admin_token");
}

export function getAdminToken(): string | null {
  return _adminToken;
}

async function _request<T>(
  path: string,
  init: RequestInit & { sessionId?: string | null } = {}
): Promise<T> {
  const { sessionId, ...restInit } = init;
  const headers = new Headers(restInit.headers);
  if (sessionId) {
    headers.set("X-Session-ID", sessionId);
  }
  if (_adminToken && path.startsWith("/api/admin/")) {
    headers.set("X-Admin-Token", _adminToken);
  }
  const response = await fetch(path, { ...restInit, headers });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      detail = typeof data.detail === "string" ? data.detail : "Tarkista syötetyt tiedot ja yritä uudelleen.";
    } catch {
      // ignore parse error, use statusText
    }
    throw new ApiError(response.status, detail);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/pdf")) {
    return (await response.blob()) as unknown as T;
  }
  return await response.json();
}

interface PendingOperation { key: string; id?: string; promise?: Promise<unknown> }
const pendingOperations = new Map<string, PendingOperation>();
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const transient = (error: unknown) => error instanceof TypeError ||
  (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) ||
  (error instanceof ApiError && [408, 429, 502, 503, 504].includes(error.status));

function modelRequest<T>(sessionId: string, path: string, payload: object): Promise<T> {
  const fingerprint = JSON.stringify([sessionId, path, payload]);
  let entry = pendingOperations.get(fingerprint);
  if (entry?.promise) return entry.promise as Promise<T>;
  if (!entry) {
    if (pendingOperations.size >= 128) return Promise.reject(new ApiError(429, "Liian monta keskeneräistä työtä. Jatka aiempaa työtä ennen uuden aloittamista."));
    entry = { key: crypto.randomUUID() };
    pendingOperations.set(fingerprint, entry);
  }
  const pending = entry;
  const scope = operationScope(sessionId, path);
  const request = async (url: string, init: RequestInit = {}) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await _request<ModelOperation<T>>(url, { ...init, sessionId, signal: AbortSignal.timeout(10000) });
      } catch (error) {
        if (!transient(error) || attempt >= 2) throw error;
        setOperationMessage(scope, "Yhteys katkesi. Yhdistetään samaan työhön uudelleen…");
        await delay(2000);
      }
    }
  };
  const execute = async (): Promise<T> => {
    try {
      setOperationMessage(scope, pending.id ? "Haetaan aiemmin käynnistetyn työn tilaa…" : "Käynnistetään työ…");
      let operation = pending.id
        ? await request(`/api/operations/${pending.id}`)
        : await request(path, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": pending.key }, body: JSON.stringify(payload) });
      pending.id = operation.id;
      while (operation.status === "running") {
        setOperationMessage(scope, "Työ on käynnissä. Voit odottaa tässä; tulos haetaan automaattisesti.");
        await delay(1500);
        operation = await request(`/api/operations/${pending.id}`);
      }
      // A definite terminal result permits a genuinely new run next time.
      pendingOperations.delete(fingerprint);
      if (operation.status === "failed") throw new ApiError(operation.error?.status ?? 500, operation.error?.detail ?? "Työ epäonnistui. Voit yrittää uudelleen.");
      if (operation.status !== "succeeded" || operation.result == null) throw new ApiError(502, "Palvelimen työn vastaus oli virheellinen.");
      return operation.result;
    } catch (error) {
      if (transient(error) && pendingOperations.has(fingerprint)) {
        throw new ApiError(0, "Yhteys työn seurantaan katkesi. Yritä uudelleen jatkaaksesi saman työn seurantaa. Älä päivitä sivua.");
      }
      pendingOperations.delete(fingerprint);
      throw error;
    } finally {
      pending.promise = undefined;
      setOperationMessage(scope, "");
    }
  };
  pending.promise = execute();
  return pending.promise as Promise<T>;
}

export const api = {
  uploadFiles: async (
    cvFile: File,
    linkedinFile: File | null,
    linkedinText: string
  ): Promise<UploadResponse> => {
    const fd = new FormData();
    fd.append("cv_pdf", cvFile);
    if (linkedinFile) fd.append("linkedin_pdf", linkedinFile);
    if (linkedinText) fd.append("linkedin_text", linkedinText);
    return _request("/api/upload", { method: "POST", body: fd });
  },

  getPositioning: (sessionId: string) =>
    _request<WorkflowState>("/api/positioning", { sessionId }),

  runPositioning: (sessionId: string, revision: number) =>
    modelRequest<WorkflowState>(sessionId, "/api/positioning", { revision }),

  updatePositioning: (sessionId: string, revision: number, doc: PositioningDocument, profile: MemberProfile) =>
    _request<WorkflowState>("/api/positioning", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, positioning: doc, profile }),
      sessionId,
    }),

  answerPositioning: (sessionId: string, revision: number, question_id: string, text: string, disposition: AnswerDisposition) =>
    modelRequest<WorkflowState>(sessionId, "/api/positioning/answers", { revision, question_id, text, disposition }),
  finishPositioning: (sessionId: string, revision: number) =>
    _request<WorkflowState>("/api/positioning/finish", {
      method: "POST", sessionId, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision }),
    }),
  approvePositioning: (sessionId: string, revision: number) =>
    _request<WorkflowState>("/api/positioning/approve", {
      method: "POST", sessionId, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision }),
    }),

  runWriter: <T = LinkedInOutput | CVDocument | InteringOutput>(
    sessionId: string,
    type: WriterType,
    revision: number
  ) =>
    modelRequest<T>(sessionId, `/api/writers/${type}`, { revision }),

  iterateWriter: <T = LinkedInOutput | CVDocument | InteringOutput>(
    sessionId: string,
    type: WriterType,
    payload: IteratePayload
  ) =>
    modelRequest<T>(sessionId, `/api/writers/${type}/iterate`, payload),

  downloadCvPdf: (sessionId: string) =>
    _request<Blob>("/api/cv/pdf", { method: "GET", sessionId }),

  fetchGdpr: () => _request<{ content: string }>("/api/gdpr"),

  admin: {
    listPrompts: () => _request<PromptItem[]>("/api/admin/prompts"),
    updatePrompt: (name: string, content: string) =>
      _request<PromptItem>(`/api/admin/prompts/${name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    resetPrompt: (name: string) =>
      _request<PromptItem>(`/api/admin/prompts/${name}`, {
        method: "DELETE",
      }),
  },
};

export { ApiError };
