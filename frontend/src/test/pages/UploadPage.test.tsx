import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { UploadPage } from '../../pages/UploadPage';
import { SessionProvider } from '../../store/SessionContext';

vi.mock('../../api/client', () => ({
  api: {
    fetchGdpr: vi.fn().mockResolvedValue({ content: 'GDPR' }),
    runPositioning: vi.fn(),
    uploadFiles: vi.fn(),
    runWriter: vi.fn(),
    iterateWriter: vi.fn(),
    downloadCvPdf: vi.fn(),
    updatePositioning: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(detail);
      this.status = status;
      this.detail = detail;
    }
  },
}));

import { api, ApiError } from '../../api/client';

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UploadPage', () => {
  it('renderöi kaksi FileUpload-komponenttia', () => {
    render(<UploadPage onBack={vi.fn()} onUploaded={vi.fn()} />, { wrapper });
    expect(screen.getByText('CV (pakollinen)')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn PDF (valinnainen)')).toBeInTheDocument();
  });

  it('renderöi textarean LinkedIn-tekstille', () => {
    render(<UploadPage onBack={vi.fn()} onUploaded={vi.fn()} />, { wrapper });
    expect(screen.getByPlaceholderText(/Kopioi LinkedIn/i)).toBeInTheDocument();
  });

  it('"Lataa ja jatka"-painike on disabloitu ilman CV-tiedostoa', () => {
    render(<UploadPage onBack={vi.fn()} onUploaded={vi.fn()} />, { wrapper });
    expect(screen.getByText('Lataa ja jatka')).toBeDisabled();
  });

  it('onnistunut upload kutsuu onUploaded', async () => {
    const user = userEvent.setup();
    vi.mocked(api.uploadFiles).mockResolvedValue({
      session_id: 'session-xyz',
      cv_text_preview: 'CV-teksti',
      linkedin_available: false,
    });
    const onUploaded = vi.fn();

    const { container } = render(
      <UploadPage onBack={vi.fn()} onUploaded={onUploaded} />,
      { wrapper }
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const cvInput = inputs[0] as HTMLInputElement;
    const cvFile = new File(['pdf'], 'cv.pdf', { type: 'application/pdf' });
    await user.upload(cvInput, cvFile);

    await user.click(screen.getByText('Lataa ja jatka'));

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledOnce();
    });
  });

  it('epäonnistunut upload näyttää virheviestin', async () => {
    const user = userEvent.setup();
    vi.mocked(api.uploadFiles).mockRejectedValue(
      new ApiError(500, 'Palvelinvirhe')
    );

    const { container } = render(
      <UploadPage onBack={vi.fn()} onUploaded={vi.fn()} />,
      { wrapper }
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const cvInput = inputs[0] as HTMLInputElement;
    const cvFile = new File(['pdf'], 'cv.pdf', { type: 'application/pdf' });
    await user.upload(cvInput, cvFile);

    await user.click(screen.getByText('Lataa ja jatka'));

    await waitFor(() => {
      expect(screen.getByText('Palvelinvirhe')).toBeInTheDocument();
    });
  });
});
