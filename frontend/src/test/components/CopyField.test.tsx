import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CopyField } from '../../components/CopyField';

describe('CopyField', () => {
  it('renderöi labelin', () => {
    render(<CopyField label="Otsikko" text="Teksti" />);
    expect(screen.getByText('Otsikko')).toBeInTheDocument();
  });

  it('renderöi tekstin', () => {
    render(<CopyField label="Otsikko" text="Testi-teksti" />);
    expect(screen.getByText('Testi-teksti')).toBeInTheDocument();
  });

  it('multiline-prop renderöi pre-elementin', () => {
    const { container } = render(<CopyField label="Otsikko" text="Teksti" multiline />);
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('ilman multiline-proppia ei renderöi pre-elementtiä', () => {
    const { container } = render(<CopyField label="Otsikko" text="Teksti" />);
    expect(container.querySelector('pre')).not.toBeInTheDocument();
  });
});
