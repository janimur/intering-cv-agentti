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
  vi.useRealTimers();
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

const operation = (id: string, status: string, result: unknown = null, error: unknown = null) => ({ id, status, kind: 'positioning', revision: 0, result, error });

describe('background model requests', () => {
  it('retries a lost POST response with the same key and polls the existing operation', async () => {
    vi.useFakeTimers();
    const payload = { revision: 1, status: 'clarifying' };
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(makeFetchResponse(operation('job-1', 'running')))
      .mockRejectedValueOnce(new TypeError('Temporary connection loss'))
      .mockResolvedValueOnce(makeFetchResponse(operation('job-1', 'succeeded', payload)));
    vi.stubGlobal('fetch', fetchMock);
    const result = api.runPositioning('session-retry', 0);
    await vi.advanceTimersByTimeAsync(6000);
    expect(await result).toEqual(payload);
    const posts = fetchMock.mock.calls.filter(([, init]) => init.method === 'POST');
    expect(posts).toHaveLength(2);
    expect(posts[0][1].headers.get('Idempotency-Key')).toBe(posts[1][1].headers.get('Idempotency-Key'));
    expect(fetchMock.mock.calls[2][0]).toBe('/api/operations/job-1');
  });

  it('shares double clicks and supports writers and iteration using operations', async () => {
    vi.useFakeTimers();
    const payload = { headline: 'Test', source_revision: 3 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeFetchResponse(operation('writer-1', 'running')))
      .mockResolvedValueOnce(makeFetchResponse(operation('writer-1', 'succeeded', payload)))
      .mockResolvedValueOnce(makeFetchResponse(operation('iterate-1', 'succeeded', payload)));
    vi.stubGlobal('fetch', fetchMock);
    const first = api.runWriter('writer-session', 'linkedin', 3);
    const second = api.runWriter('writer-session', 'linkedin', 3);
    expect(first).toBe(second);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await first).toEqual(payload);
    expect(await api.iterateWriter('writer-session', 'linkedin', { revision: 3, note: 'Shorter' })).toEqual(payload);
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(2);
  });

  it('retains the operation id after a connection failure and resumes on user retry', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeFetchResponse(operation('resume-1', 'running')))
      .mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const failed = expect(api.answerPositioning('resume-session', 1, 'q1', 'Answer', 'answered')).rejects.toMatchObject({ status: 0 });
    await vi.advanceTimersByTimeAsync(6000);
    await failed;
    fetchMock.mockResolvedValue(makeFetchResponse(operation('resume-1', 'succeeded', { revision: 2 })));
    expect(await api.answerPositioning('resume-session', 1, 'q1', 'Answer', 'answered')).toEqual({ revision: 2 });
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1);
  });

  it('surfaces a terminal failure and permits a new operation after it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeFetchResponse(operation('failed-1', 'failed', null, { status: 502, detail: 'Mallivirhe' })))
      .mockResolvedValueOnce(makeFetchResponse(operation('new-1', 'succeeded', { revision: 1 })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.runPositioning('failed-session', 0)).rejects.toMatchObject({ status: 502, detail: 'Mallivirhe' });
    await api.runPositioning('failed-session', 0);
    expect(fetchMock.mock.calls[0][1].headers.get('Idempotency-Key')).not.toBe(fetchMock.mock.calls[1][1].headers.get('Idempotency-Key'));
  });

  it('passes the session and payload with an idempotency key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeFetchResponse(operation('quick', 'succeeded', { revision: 1 })));
    vi.stubGlobal('fetch', fetchMock);
    await api.runPositioning('session-abc', 0);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/positioning');
    expect(init.headers.get('X-Session-ID')).toBe('session-abc');
    expect(init.headers.get('Idempotency-Key')).toBeTruthy();
    expect(JSON.parse(init.body)).toEqual({ revision: 0 });
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
    const fetchMock = vi.fn().mockResolvedValue(makeFetchResponse(operation('iter-payload', 'succeeded', payload)));
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
