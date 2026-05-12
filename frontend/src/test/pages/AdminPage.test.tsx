import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPage } from '../../pages/AdminPage';
import type { PromptItem } from '../../types/api';

const mockPrompts: PromptItem[] = [
  { name: 'kartoittaja_system', content: 'Kartoittaja prompti', is_overlay: false },
  { name: 'kirjoittaja_linkedin_system', content: 'LinkedIn prompti', is_overlay: false },
  { name: 'kirjoittaja_cv_system', content: 'CV prompti', is_overlay: true },
  { name: 'kirjoittaja_intering_system', content: 'Intering prompti', is_overlay: false },
];

vi.mock('../../api/client', () => ({
  api: {
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
}));

import { api } from '../../api/client';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.admin.listPrompts).mockResolvedValue(mockPrompts);
});

describe('AdminPage', () => {
  it('renderoi otsikon', async () => {
    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    expect(screen.getByText('Admin: Promptit')).toBeInTheDocument();
  });

  it('lataa promptit ja renderoi 4 textareaa', async () => {
    render(<AdminPage />);
    await waitFor(() => {
      const textareas = screen.getAllByRole('textbox');
      expect(textareas).toHaveLength(4);
    });
  });

  it('nayttaa prompttien sisallon textareaissa', async () => {
    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Kartoittaja prompti')).toBeInTheDocument();
      expect(screen.getByDisplayValue('LinkedIn prompti')).toBeInTheDocument();
    });
  });

  it('tallenna kutsuu api.admin.updatePrompt', async () => {
    const user = userEvent.setup();
    vi.mocked(api.admin.updatePrompt).mockResolvedValue({
      name: 'kartoittaja_system',
      content: 'Kartoittaja prompti muokattu',
      is_overlay: true,
    });

    render(<AdminPage />);
    await waitFor(() => screen.getAllByRole('textbox'));

    const textareas = screen.getAllByRole('textbox');
    await user.clear(textareas[0]);
    await user.type(textareas[0], 'Kartoittaja prompti muokattu');

    const saveButtons = screen.getAllByRole('button', { name: 'Tallenna' });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(api.admin.updatePrompt).toHaveBeenCalledWith(
        'kartoittaja_system',
        'Kartoittaja prompti muokattu'
      );
    });
  });

  it('palauta kutsuu api.admin.resetPrompt', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.admin.resetPrompt).mockResolvedValue({
      name: 'kirjoittaja_cv_system',
      content: 'CV prompti alkuperainen',
      is_overlay: false,
    });

    render(<AdminPage />);
    await waitFor(() => screen.getAllByRole('textbox'));

    // CV prompti on is_overlay=true, joten silla on "Palauta oletukseen"-painike
    const resetButton = screen.getByRole('button', { name: 'Palauta oletukseen' });
    await user.click(resetButton);

    await waitFor(() => {
      expect(api.admin.resetPrompt).toHaveBeenCalledWith('kirjoittaja_cv_system');
    });
  });

  it('nayttaa is_overlay-merkin muokatulle promptille', async () => {
    render(<AdminPage />);
    await waitFor(() => screen.getAllByRole('textbox'));

    // kirjoittaja_cv_system on is_overlay=true
    expect(screen.getByText('Muokattu (overlay)')).toBeInTheDocument();
    // Muut ovat oletuksia
    expect(screen.getAllByText('Oletus (git)').length).toBeGreaterThan(0);
  });

  it('nayttaa virheen kun lataus epaonnistuu', async () => {
    const { ApiError } = await import('../../api/client');
    vi.mocked(api.admin.listPrompts).mockRejectedValue(
      new ApiError(401, 'Virheellinen admin-token')
    );

    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Virheellinen admin-token')).toBeInTheDocument();
    });
  });
});
