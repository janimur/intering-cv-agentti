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
    _request<WorkflowState>("/api/positioning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision }),
      sessionId,
    }),

  updatePositioning: (sessionId: string, revision: number, doc: PositioningDocument, profile: MemberProfile) =>
    _request<WorkflowState>("/api/positioning", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, positioning: doc, profile }),
      sessionId,
    }),

  answerPositioning: (sessionId: string, revision: number, question_id: string, text: string, disposition: AnswerDisposition) =>
    _request<WorkflowState>("/api/positioning/answers", {
      method: "POST", sessionId, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, question_id, text, disposition }),
    }),
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
    _request<T>(`/api/writers/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision }),
      sessionId,
    }),

  iterateWriter: <T = LinkedInOutput | CVDocument | InteringOutput>(
    sessionId: string,
    type: WriterType,
    payload: IteratePayload
  ) =>
    _request<T>(`/api/writers/${type}/iterate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      sessionId,
    }),

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
