import {
  normalizeFiscalDocument,
  parseFiscalDocument,
  supportsCurrentCnpjLookup,
  supportsCurrentPlugNotasDocument,
} from './fiscal-document';

describe('fiscal-document', () => {
  it('normalizes punctuation and lower-case letters', () => {
    expect(normalizeFiscalDocument('12.abC.345/01de-35')).toBe(
      '12ABC34501DE35',
    );
  });

  it('accepts a numeric CNPJ', () => {
    expect(parseFiscalDocument('29.062.609/0001-77')).toEqual({
      normalized: '29062609000177',
      kind: 'cnpj_numeric',
      isValid: true,
    });
  });

  it('accepts an alphanumeric CNPJ with valid DV', () => {
    expect(parseFiscalDocument('12ABC34501DE35')).toEqual({
      normalized: '12ABC34501DE35',
      kind: 'cnpj_alphanumeric',
      isValid: true,
    });
  });

  it('rejects an alphanumeric CNPJ with invalid DV', () => {
    expect(parseFiscalDocument('12ABC34501DE00')).toEqual({
      normalized: '12ABC34501DE00',
      kind: 'invalid',
      isValid: false,
    });
  });

  it('keeps current lookup and PlugNotas support restricted to numeric documents', () => {
    expect(supportsCurrentCnpjLookup('29062609000177')).toBe(true);
    expect(supportsCurrentPlugNotasDocument('29062609000177')).toBe(true);
    expect(supportsCurrentCnpjLookup('12ABC34501DE35')).toBe(false);
    expect(supportsCurrentPlugNotasDocument('12ABC34501DE35')).toBe(false);
  });
});
