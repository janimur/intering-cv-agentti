import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { GdprBanner } from '../../components/GdprBanner';
import { SessionProvider, useSession } from '../../store/SessionContext';

vi.mock('../../api/client', () => ({
  api: {
    fetchGdpr: vi.fn().mockResolvedValue({ content: 'GDPR-seloste' }),
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

import { api } from '../../api/client';

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GdprBanner', () => {
  it('renderöityy kun gdprAccepted=false', async () => {
    render(<GdprBanner />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('Tietosuoja ja tietojen käsittely')).toBeInTheDocument();
    });
  });

  it('lataa sisällön api.fetchGdpr-kutsulla mountatessa', async () => {
    render(<GdprBanner />, { wrapper });
    await waitFor(() => {
      expect(api.fetchGdpr).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(screen.getByText('GDPR-seloste')).toBeInTheDocument();
    });
  });

  it('"Hyväksyn"-painike kutsuu acceptGdpr', async () => {
    const user = userEvent.setup();
    render(<GdprBanner />, { wrapper });
    await waitFor(() => screen.getByText('Hyväksyn'));

    await user.click(screen.getByText('Hyväksyn'));
    expect(localStorage.getItem('intering_gdpr_accepted')).toBe('1');
  });
});

describe('GdprBanner ei renderöidy kun gdpr hyväksytty', () => {
  it('ei renderöidy kun gdprAccepted=true', async () => {
    localStorage.setItem('intering_gdpr_accepted', '1');

    function TestComponent() {
      const { gdprAccepted } = useSession();
      return gdprAccepted ? <div>Hyväksytty</div> : <GdprBanner />;
    }

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    expect(screen.queryByText('Tietosuoja ja tietojen käsittely')).not.toBeInTheDocument();
    expect(screen.getByText('Hyväksytty')).toBeInTheDocument();
  });
});
