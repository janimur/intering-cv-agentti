import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useEffect } from 'react';
import { IterateModal } from '../../components/IterateModal';
import { SessionProvider, useSession } from '../../store/SessionContext';
import { sampleLinkedIn, sampleWorkflow } from '../fixtures';

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

import { api } from '../../api/client';

function SessionSetterForIterate({ children }: { children: ReactNode }) {
  const { setSessionId, setWorkflow } = useSession();
  useEffect(() => {
    setSessionId('test-session-id');
    setWorkflow(sampleWorkflow);
  }, [setSessionId, setWorkflow]);
  return <>{children}</>;
}

function wrapperWithSession({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionSetterForIterate>{children}</SessionSetterForIterate>
    </SessionProvider>
  );
}

function wrapperNoSession({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('IterateModal', () => {
  it('renderöityy', () => {
    render(
      <IterateModal writerType="linkedin" onClose={vi.fn()} onDone={vi.fn()} />,
      { wrapper: wrapperNoSession }
    );
    expect(screen.getByText('Iteroi tulosta')).toBeInTheDocument();
  });

  it('sulje-painike kutsuu onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <IterateModal writerType="linkedin" onClose={onClose} onDone={vi.fn()} />,
      { wrapper: wrapperNoSession }
    );

    await user.click(screen.getByText('Sulje'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('tyhjä textarea + submit-nappi on disabloitu eikä kutsu API:a', async () => {
    const user = userEvent.setup();
    render(
      <IterateModal writerType="linkedin" onClose={vi.fn()} onDone={vi.fn()} />,
      { wrapper: wrapperNoSession }
    );

    const submitButton = screen.getByText('Aja uudelleen');
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);
    expect(api.iterateWriter).not.toHaveBeenCalled();
  });

  it('tekstin syöttäminen + submit kutsuu api.iterateWriter oikealla payloadilla', async () => {
    const user = userEvent.setup();
    vi.mocked(api.iterateWriter).mockResolvedValue(sampleLinkedIn);

    render(
      <IterateModal writerType="linkedin" onClose={vi.fn()} onDone={vi.fn()} />,
      { wrapper: wrapperWithSession }
    );

    await user.type(screen.getByPlaceholderText(/Esim/i), 'Tee paremmaksi');
    await user.click(screen.getByText('Aja uudelleen'));

    await waitFor(() => {
      expect(api.iterateWriter).toHaveBeenCalledWith(
        'test-session-id',
        'linkedin',
        { revision: 3, note: 'Tee paremmaksi' }
      );
    });
  });

  it('onnistuneen vastauksen jälkeen onDone kutsutaan tuloksella', async () => {
    const user = userEvent.setup();
    vi.mocked(api.iterateWriter).mockResolvedValue(sampleLinkedIn);
    const onDone = vi.fn();

    render(
      <IterateModal writerType="linkedin" onClose={vi.fn()} onDone={onDone} />,
      { wrapper: wrapperWithSession }
    );

    await user.type(screen.getByPlaceholderText(/Esim/i), 'Paranna');
    await user.click(screen.getByText('Aja uudelleen'));

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(sampleLinkedIn);
    });
  });
});
