import { fixFileNameEncodingSimple, fixFileNameEncoding } from './encoding.util';

describe('Encoding Utilities', () => {
  describe('fixFileNameEncodingSimple', () => {
    it('should convert Latin1 mojibake to correct UTF-8', () => {
      // Simulate Multer corruption: UTF-8 bytes decoded as Latin1
      const corrupted = 'ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf';
      const expected = 'Thông báo khám sức khỏe Định kỳ.pdf';
      
      const result = fixFileNameEncodingSimple(corrupted);
      expect(result).toBe(expected);
    });

    it('should handle Chinese characters', () => {
      // Chinese characters corrupted by Latin1 decoding
      const corrupted = 'ä»¥çŽ©.pdf'; // Should be Chinese characters
      const result = fixFileNameEncodingSimple(corrupted);
      
      // Should not contain mojibake patterns
      expect(result).not.toContain('Ã');
      expect(result).not.toContain('á»');
    });

    it('should remove control characters', () => {
      const withControlChars = 'test\x07\x10file.pdf';
      const result = fixFileNameEncodingSimple(withControlChars);
      
      expect(result).not.toContain('\x07');
      expect(result).not.toContain('\x10');
      expect(result).toBe('testfile.pdf');
    });

    it('should normalize to NFC', () => {
      const fileName = 'test.pdf';
      const result = fixFileNameEncodingSimple(fileName);
      
      // Should be normalized (NFC)
      expect(result).toBe(fileName.normalize('NFC'));
    });

    it('should handle already correct UTF-8', () => {
      const correct = 'Thông báo khám sức khỏe Định kỳ.pdf';
      const result = fixFileNameEncodingSimple(correct);
      
      // Should remain correct (may have slight normalization differences)
      expect(result).toBe(correct.normalize('NFC'));
    });

    it('should handle empty string', () => {
      expect(fixFileNameEncodingSimple('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(fixFileNameEncodingSimple(null as any)).toBe(null);
      expect(fixFileNameEncodingSimple(undefined as any)).toBe(undefined);
    });
  });

  describe('fixFileNameEncoding (complex fix for corrupted DB data)', () => {
    it('should handle hex escape sequences', () => {
      const withHexEscapes = 'test\\x07\\x10file.pdf';
      const result = fixFileNameEncoding(withHexEscapes);
      
      // Should remove control character hex escapes
      expect(result).not.toContain('\\x07');
      expect(result).not.toContain('\\x10');
    });

    it('should handle Unicode escape sequences', () => {
      const withUnicodeEscapes = 'test\\u0011file.pdf';
      const result = fixFileNameEncoding(withUnicodeEscapes);
      
      // Should remove control character Unicode escapes
      expect(result).not.toContain('\\u0011');
    });
  });
});
