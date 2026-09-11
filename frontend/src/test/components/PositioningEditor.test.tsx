import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PositioningEditor } from '../../components/PositioningEditor';
import { samplePositioning } from '../fixtures';
import type { PositioningDocument } from '../../types/api';

describe('PositioningEditor', () => {
  it('näyttää ja muokkaa myös tukevat näytöt ja osaamisalueet', () => {
    const onChange = vi.fn();
    const doc = { ...samplePositioning, evidence: { ...samplePositioning.evidence, supporting_results: [{ metric: 'Toimitusvarmuus', value: 'Parani', context: 'Johdin muutosta' }] } };
    render(<PositioningEditor positioning={doc} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Tilanne ja oma osuus'), { target: { value: 'Osallistuin muutokseen' } });
    expect(onChange.mock.lastCall?.[0].evidence.supporting_results[0].context).toBe('Osallistuin muutokseen');
    fireEvent.change(screen.getByLabelText('Osaamisalueet 1'), { target: { value: 'Operatiivinen johtaminen' } });
    expect(onChange.mock.lastCall?.[0].evidence.expertise_areas).toEqual(['Operatiivinen johtaminen']);
  });

  it('ei salli yli viittä todistuspistettä', () => {
    const doc = { ...samplePositioning, key_messages: { ...samplePositioning.key_messages, proof_points: ['1', '2', '3', '4', '5'] } };
    render(<PositioningEditor positioning={doc} onChange={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Todistuspisteet (proof points)' });
    expect(within(group).getByRole('button', { name: '+ Lisää' })).toBeDisabled();
  });
  it('renderöi primary_angle-kentän', () => {
    render(<PositioningEditor positioning={samplePositioning} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Testaaja')).toBeInTheDocument();
  });

  it('renderöi target_buyers-listauksen', () => {
    render(<PositioningEditor positioning={samplePositioning} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('CEO')).toBeInTheDocument();
  });

  it('renderöi tone-kentän oikealla otsikolla', () => {
    render(<PositioningEditor positioning={samplePositioning} onChange={vi.fn()} />);
    expect(screen.getByText('Sävy (tone)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Suora')).toBeInTheDocument();
  });

  it('primary_angle-kentän muokkaus kutsuu onChange päivitetyllä dokumentilla', () => {
    const onChange = vi.fn();
    render(<PositioningEditor positioning={samplePositioning} onChange={onChange} />);

    const textarea = screen.getByDisplayValue('Testaaja');
    // fireEvent.change triggeroi React-tapahtuman suoraan, ohittaa controlled-input-ongelmat
    fireEvent.change(textarea, { target: { value: 'Uusi kulma' } });

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PositioningDocument;
    expect(lastCall.positioning.primary_angle).toBe('Uusi kulma');
  });

  it('"+ Lisää"-painike lisää tyhjän rivin listaan', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PositioningEditor positioning={samplePositioning} onChange={onChange} />);

    const addButtons = screen.getAllByText('+ Lisää');
    await user.click(addButtons[0]);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PositioningDocument;
    expect(lastCall.positioning.target_buyers).toContain('');
  });

  it('"Poista"-painike poistaa rivin listasta', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PositioningEditor positioning={samplePositioning} onChange={onChange} />);

    const removeButtons = screen.getAllByText('Poista');
    await user.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PositioningDocument;
    expect(lastCall.positioning.target_buyers).not.toContain('CEO');
  });
});
