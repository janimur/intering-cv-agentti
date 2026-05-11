import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../../components/FileUpload';

describe('FileUpload', () => {
  it('renderöi labelin', () => {
    render(
      <FileUpload
        label="CV-tiedosto"
        onFileSelect={vi.fn()}
        selectedFile={null}
      />
    );
    expect(screen.getByText('CV-tiedosto')).toBeInTheDocument();
  });

  it('file-valinta kutsuu onFileSelect-propin', async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileUpload
        label="CV"
        onFileSelect={onFileSelect}
        selectedFile={null}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'cv.pdf', { type: 'application/pdf' });
    await user.upload(input, file);

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('drag-and-drop kutsuu onFileSelect', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileUpload
        label="CV"
        onFileSelect={onFileSelect}
        selectedFile={null}
      />
    );

    const dropZone = container.querySelector('div.border-dashed') as HTMLElement;
    const file = new File(['content'], 'drop.pdf', { type: 'application/pdf' });
    const dataTransfer = { files: [file] };

    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });
    Object.defineProperty(dropEvent, 'preventDefault', { value: vi.fn() });
    dropZone.dispatchEvent(dropEvent);

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('selectedFile-prop näyttää tiedoston nimen', () => {
    const file = new File(['content'], 'minun-cv.pdf', { type: 'application/pdf' });
    render(
      <FileUpload
        label="CV"
        onFileSelect={vi.fn()}
        selectedFile={file}
      />
    );
    expect(screen.getByText('minun-cv.pdf')).toBeInTheDocument();
  });

  it('required näyttää punaisen tähden', () => {
    const { container } = render(
      <FileUpload
        label="CV"
        onFileSelect={vi.fn()}
        selectedFile={null}
        required
      />
    );
    const star = container.querySelector('.text-red-500');
    expect(star).toBeInTheDocument();
    expect(star?.textContent).toBe('*');
  });
});
