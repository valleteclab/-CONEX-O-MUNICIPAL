import {
  buildPresetApplication,
  getBusinessSegmentPreset,
  listBusinessSegmentPresets,
} from './business-segment-presets';

describe('business segment presets', () => {
  it('lists the official presets for the curated MEI segments', () => {
    const presets = listBusinessSegmentPresets();

    expect(presets.map((preset) => preset.key)).toEqual([
      'beauty_salon',
      'bakery',
      'mini_market',
      'auto_repair',
      'bike_repair',
      'locksmith',
    ]);
  });

  it('adapts the beauty salon seed kit when the business does not resell products', () => {
    const application = buildPresetApplication('beauty_salon', {
      sells_products: 'false',
      appointment_only: 'true',
      team_size: '3',
    });

    expect(application).not.toBeNull();
    expect(application?.seedProducts.every((item) => item.kind === 'service')).toBe(true);
    expect(application?.directorySuggestion.publicHeadline).toContain('horário marcado');
    expect(application?.directorySuggestion.description).toContain('3 profissionais');
  });

  it('keeps the locksmith focused on services and can enable emergency messaging', () => {
    const application = buildPresetApplication('locksmith', {
      emergency_service: 'true',
      home_service: 'true',
      main_focus: 'locks',
    });

    expect(application?.preset.operationType).toBe('service');
    expect(application?.directorySuggestion.services).toEqual(
      expect.arrayContaining(['Atendimento externo', 'Plantão sob consulta']),
    );
    expect(application?.directorySuggestion.keywords).toContain('urgência');
  });

  it('returns the preset definition by key', () => {
    const preset = getBusinessSegmentPreset('bakery');

    expect(preset?.name).toBe('Padaria');
    expect(preset?.directorySuggestion.modo).toBe('loja');
  });
});
