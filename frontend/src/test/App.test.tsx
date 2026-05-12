import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

vi.mock('../api/client', () => ({
  api: {
    fetchGdpr: vi.fn().mockResolvedValue({ content: 'GDPR-seloste' }),
    runPositioning: vi.fn(),
    uploadFiles: vi.fn(),
    runWriter: vi.fn(),
    iterateWriter: vi.fn(),
    downloadCvPdf: vi.fn(),
    updatePositioning: vi.fn(),
    admin: {
      listPrompts: vi.fn(),
      updatePrompt: vi.fn(),
      resetPrompt: vi.fn(),
    },
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
  setAdminToken: vi.fn(),
  getAdminToken: vi.fn().mockReturnValue(null),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('App', () => {
  it('renderöi LandingPagen aluksi', async () => {
    render(<App />);
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toContain('Myyvempi CV');
    });
  });

  it('GDPR-banneri näkyy oletuksena', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Tietosuoja ja tietojen käsittely')).toBeInTheDocument();
    });
  });

  it('"Aloita"-painikkeen klikkaus GDPR-hyväksynnän jälkeen siirtyy UploadPageen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => screen.getByText('Hyväksyn'));
    await user.click(screen.getByText('Hyväksyn'));

    await waitFor(() => {
      expect(screen.queryByText('Tietosuoja ja tietojen käsittely')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: 'Aloita' });
      expect(buttons[0]).not.toBeDisabled();
    });

    await user.click(screen.getAllByRole('button', { name: 'Aloita' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Lataa CV ja LinkedIn-profiili')).toBeInTheDocument();
    });
  });
});
