import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../../api/client';

function makeFetchResponse(
  body: unknown,
  options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    contentType?: string;
  } = {}
) {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    contentType = 'application/json',
  } = options;

  const headers = new Headers({ 'content-type': contentType });

  return {
    ok,
    status,
    statusText,
    headers,
    json: vi.fn().mockResolvedValue(body),
    blob: vi.fn().mockResolvedValue(new Blob([String(body)], { type: contentType })),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api.fetchGdpr', () => {
  it('kutsuu /api/gdpr ja palauttaa parsitun JSONin', async () => {
    const payload = { content: 'GDPR-teksti' };
    const fetchMock = vi.fn().mockResolvedValue(makeFetchResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.fetchGdpr();

    expect(fetchMock).toHaveBeenCalledWith('/api/gdpr', expect.any(Object));
    expect(result).toEqual(payload);
  });
});

describe('api.runPositioning', () => {
  it('kutsuu /api/positioning X-Session-ID-headerilla', async () => {
    const payload = { positioning: {}, evidence: {}, key_messages: {}, preferences: {} };
    const fetchMock = vi.fn().mockResolvedValue(makeFetchResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    await api.runPositioning('session-abc', 0);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe('/api/positioning');
    expect(init.headers.get('X-Session-ID')).toBe('session-abc');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ revision: 0 });
  });
});

describe('virheenkäsittely', () => {
  it('4xx-vastaus heittää ApiErrorin oikealla statusilla ja detaililla', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeFetchResponse({ detail: 'Ei löydy' }, { ok: false, status: 404, statusText: 'Not Found' })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.fetchGdpr()).rejects.toMatchObject({
      status: 404,
      detail: 'Ei löydy',
    });
  });

  it('4xx-vastaus on ApiError-instanssi', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeFetchResponse({ detail: 'Kielletty' }, { ok: false, status: 403, statusText: 'Forbidden' })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.fetchGdpr()).rejects.toBeInstanceOf(ApiError);
  });

  it('500-vastaus joka ei ole JSON heittää ApiErrorin jossa detail = statusText', async () => {
    const badResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'text/plain' }),
      json: vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
      blob: vi.fn(),
    };
    const fetchMock = vi.fn().mockResolvedValue(badResponse);
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.fetchGdpr()).rejects.toMatchObject({
      status: 500,
      detail: 'Internal Server Error',
    });
  });
});

describe('api PDF-vastaus', () => {
  it('palauttaa Blobin eikä parsi JSONia', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const pdfResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/pdf' }),
      json: vi.fn(),
      blob: vi.fn().mockResolvedValue(blob),
    };
    const fetchMock = vi.fn().mockResolvedValue(pdfResponse);
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.downloadCvPdf('session-abc');

    expect(result).toBeInstanceOf(Blob);
    expect(pdfResponse.json).not.toHaveBeenCalled();
  });
});

describe('api.uploadFiles', () => {
  it('lähettää FormDatan cv_pdf-kentällä, jättää linkedin_text pois jos tyhjä', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeFetchResponse({ session_id: 's1', cv_text_preview: '', linkedin_available: false })
    );
    vi.stubGlobal('fetch', fetchMock);

    const cvFile = new File(['pdf-content'], 'cv.pdf', { type: 'application/pdf' });
    await api.uploadFiles(cvFile, null, '');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/upload');
    expect(init.method).toBe('POST');

    const formData = init.body as FormData;
    expect(formData.get('cv_pdf')).toBe(cvFile);
    expect(formData.get('linkedin_text')).toBeNull();
  });

  it('lähettää linkedin_text jos ei tyhjä', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeFetchResponse({ session_id: 's1', cv_text_preview: '', linkedin_available: true })
    );
    vi.stubGlobal('fetch', fetchMock);

    const cvFile = new File(['pdf-content'], 'cv.pdf', { type: 'application/pdf' });
    await api.uploadFiles(cvFile, null, 'LinkedIn-teksti');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const formData = init.body as FormData;
    expect(formData.get('linkedin_text')).toBe('LinkedIn-teksti');
  });
});

describe('api.iterateWriter', () => {
  it('lähettää JSONin oikealla payloadilla', async () => {
    const payload = { headline: 'Tulos' };
    const fetchMock = vi.fn().mockResolvedValue(makeFetchResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    await api.iterateWriter('sid123', 'linkedin', { revision: 3, note: 'X' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe('/api/writers/linkedin/iterate');
    expect(init.method).toBe('POST');
    expect(init.headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ revision: 3, note: 'X' });
    expect(init.headers.get('X-Session-ID')).toBe('sid123');
  });
});
