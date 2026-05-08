import type {
  UploadResponse,
  PositioningDocument,
  LinkedInOutput,
  CVDocument,
  InteringOutput,
  WriterType,
  IteratePayload,
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

async function _request<T>(
  path: string,
  init: RequestInit & { sessionId?: string | null } = {}
): Promise<T> {
  const { sessionId, ...restInit } = init;
  const headers = new Headers(restInit.headers);
  if (sessionId) {
    headers.set("X-Session-ID", sessionId);
  }
  const response = await fetch(path, { ...restInit, headers });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      detail = data.detail || detail;
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

  runPositioning: (sessionId: string) =>
    _request<PositioningDocument>("/api/positioning", {
      method: "POST",
      sessionId,
    }),

  updatePositioning: (sessionId: string, doc: PositioningDocument) =>
    _request<PositioningDocument>("/api/positioning", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
      sessionId,
    }),

  runWriter: <T = LinkedInOutput | CVDocument | InteringOutput>(
    sessionId: string,
    type: WriterType
  ) =>
    _request<T>(`/api/writers/${type}`, {
      method: "POST",
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
};

export { ApiError };
