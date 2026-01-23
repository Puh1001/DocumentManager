# Implementation Details - Comprehensive Encoding Fix

**Date:** 2026-01-23  
**Plan:** `plan.md`

---

## Core Algorithm Design

### Multi-Strategy Fix Engine

```typescript
export function fixFileNameEncoding(fileName: string): string {
  if (!fileName) return fileName;
  
  // Quick validation - already correct?
  if (isValidUtf8(fileName) && !hasMojibake(fileName)) {
    return fileName;
  }
  
  const strategies = [
    tryLatin1ToUtf8,
    tryDoubleEncodingFix,
    tryByteReconstruction,
    tryVietnamesePatternMatching,
    tryChinesePatternMatching,
  ];
  
  const results: Array<{ result: string; score: number }> = [];
  
  for (const strategy of strategies) {
    try {
      const result = strategy(fileName);
      const score = evaluateFixQuality(fileName, result);
      results.push({ result, score });
      
      // Early exit if perfect fix
      if (score === 1.0) {
        return result;
      }
    } catch (error) {
      // Strategy failed, continue
    }
  }
  
  // Return best result
  results.sort((a, b) => b.score - a.score);
  return results[0]?.result || fileName;
}
```

### Strategy 1: Enhanced Latin1 → UTF-8

```typescript
function tryLatin1ToUtf8(fileName: string): string {
  const buffer = Buffer.from(fileName, 'latin1');
  const fixed = buffer.toString('utf8');
  
  // Check if result is better
  if (isBetterThanOriginal(fileName, fixed)) {
    return fixed;
  }
  
  // Try with replacement char handling
  return handleReplacementChars(fixed);
}
```

### Strategy 2: Double Encoding Fix

```typescript
function tryDoubleEncodingFix(fileName: string): string {
  // First pass
  let result = tryLatin1ToUtf8(fileName);
  
  // If still has mojibake, try second pass
  if (hasMojibake(result)) {
    result = tryLatin1ToUtf8(result);
  }
  
  // If still has mojibake, try third pass
  if (hasMojibake(result)) {
    result = tryLatin1ToUtf8(result);
  }
  
  return result;
}
```

### Strategy 3: Byte Reconstruction

```typescript
function tryByteReconstruction(fileName: string): string {
  const bytes = Array.from(Buffer.from(fileName, 'latin1'));
  const reconstructed: number[] = [];
  
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    
    // Check if this starts a valid UTF-8 sequence
    if (isValidUtf8Start(byte)) {
      const sequence = extractUtf8Sequence(bytes, i);
      if (isValidUtf8Sequence(sequence)) {
        reconstructed.push(...sequence);
        i += sequence.length - 1;
      } else {
        // Attempt reconstruction
        const fixed = reconstructUtf8Sequence(sequence);
        reconstructed.push(...fixed);
        i += sequence.length - 1;
      }
    } else {
      // Single byte character
      reconstructed.push(byte);
    }
  }
  
  return Buffer.from(reconstructed).toString('utf8');
}
```

### Strategy 4: Vietnamese Pattern Matching

```typescript
function tryVietnamesePatternMatching(fileName: string): string {
  let result = fileName;
  
  // Apply Vietnamese pattern replacements
  for (const [corrupted, correct] of VIETNAMESE_PATTERNS) {
    result = result.replace(new RegExp(corrupted, 'g'), correct);
  }
  
  return result;
}

const VIETNAMESE_PATTERNS = [
  // Common Vietnamese character corruptions
  ['ThÃ´ng', 'Thông'],
  ['bÃ¡o', 'báo'],
  ['khÃ¡m', 'khám'],
  ['sá»©c', 'sức'],
  ['khá»e', 'khỏe'],
  ['Äá»nh', 'Định'],
  ['ká»³', 'kỳ'],
  ['Tá»·', 'Tỷ'],
  ['lá»', 'lệ'],
  ['xá»', 'xử'],
  ['lÃ½', 'lý'],
  ['khiáº¿u', 'khiếu'],
  ['náº¡i', 'nại'],
  ['Sá»', 'Số'],
  ['láº§n', 'lần'],
  ['PhÃ¡t', 'Phát'],
  ['chi phÃ', 'chi phí'],
  ['ngoÃ i', 'ngoài'],
  ['kÃ hoÃ ch', 'kế hoạch'],
  // ... more patterns
];
```

### Strategy 5: Chinese Pattern Matching

```typescript
function tryChinesePatternMatching(fileName: string): string {
  // Chinese characters are more complex
  // Need byte-level analysis
  
  const bytes = Array.from(Buffer.from(fileName, 'latin1'));
  const result: number[] = [];
  
  for (let i = 0; i < bytes.length; i++) {
    // Chinese UTF-8 sequences are 3 bytes
    if (i + 2 < bytes.length) {
      const sequence = [bytes[i], bytes[i + 1], bytes[i + 2]];
      if (isChineseUtf8Sequence(sequence)) {
        result.push(...sequence);
        i += 2;
        continue;
      }
    }
    
    // Try to reconstruct Chinese character
    const reconstructed = reconstructChineseCharacter(bytes, i);
    if (reconstructed) {
      result.push(...reconstructed.bytes);
      i += reconstructed.length - 1;
    } else {
      result.push(bytes[i]);
    }
  }
  
  return Buffer.from(result).toString('utf8');
}
```

### Quality Evaluation

```typescript
function evaluateFixQuality(original: string, fixed: string): number {
  let score = 0;
  
  // No mojibake: +0.4
  if (!hasMojibake(fixed)) score += 0.4;
  
  // No replacement chars: +0.3
  if (!fixed.includes('\uFFFD')) score += 0.3;
  
  // Valid UTF-8: +0.2
  if (isValidUtf8(fixed)) score += 0.2;
  
  // Fewer Latin1 chars: +0.1
  const originalLatin1 = (original.match(/[\u0080-\u00FF]/g) || []).length;
  const fixedLatin1 = (fixed.match(/[\u0080-\u00FF]/g) || []).length;
  if (fixedLatin1 < originalLatin1) score += 0.1;
  
  return score;
}
```

---

## Vietnamese Character Support

### Character Mapping Table

```typescript
// Vietnamese diacritics and their common corruptions
const VIETNAMESE_CHAR_MAP = {
  // Vowels with diacritics
  'ô': ['Ã´', 'ÃƒÂ´', 'Ã´'],
  'á': ['Ã¡', 'Ãƒ¡', 'Ã¡'],
  'à': ['Ã ', 'Ãƒ ', 'Ã '],
  'ả': ['Ã£', 'Ãƒ£', 'Ã£'],
  'ã': ['Ã£', 'Ãƒ£', 'Ã£'],
  'ạ': ['áº¡', 'áº¡', 'áº¡'],
  'ố': ['á»', 'á»', 'á»'],
  'ồ': ['á»', 'á»', 'á»'],
  'ổ': ['á»', 'á»', 'á»'],
  'ỗ': ['á»', 'á»', 'á»'],
  'ộ': ['á»', 'á»', 'á»'],
  
  // Special characters
  'Đ': ['Ä', 'Ä', 'Ä'],
  'đ': ['Ä', 'Ä', 'Ä'],
  
  // ... more mappings
};
```

### Pattern Generation

```typescript
// Generate patterns from character map
function generateVietnamesePatterns(): Array<[string, string]> {
  const patterns: Array<[string, string]> = [];
  
  for (const [correct, corruptions] of Object.entries(VIETNAMESE_CHAR_MAP)) {
    for (const corrupted of corruptions) {
      patterns.push([corrupted, correct]);
    }
  }
  
  // Add common word patterns
  patterns.push(
    ['ThÃ´ng', 'Thông'],
    ['bÃ¡o', 'báo'],
    ['khÃ¡m', 'khám'],
    // ... more word patterns
  );
  
  return patterns;
}
```

---

## Chinese Character Support

### UTF-8 Byte Analysis

```typescript
// Chinese characters use 3-byte UTF-8 sequences
// Range: U+4E00 to U+9FFF (CJK Unified Ideographs)

function isChineseUtf8Sequence(bytes: number[]): boolean {
  if (bytes.length < 3) return false;
  
  // Chinese UTF-8 pattern: 1110xxxx 10xxxxxx 10xxxxxx
  const byte1 = bytes[0];
  const byte2 = bytes[1];
  const byte3 = bytes[2];
  
  // Check UTF-8 encoding
  if ((byte1 & 0xF0) === 0xE0 && 
      (byte2 & 0xC0) === 0x80 && 
      (byte3 & 0xC0) === 0x80) {
    // Decode Unicode code point
    const codePoint = ((byte1 & 0x0F) << 12) | 
                      ((byte2 & 0x3F) << 6) | 
                      (byte3 & 0x3F);
    
    // Check if in Chinese range
    return codePoint >= 0x4E00 && codePoint <= 0x9FFF;
  }
  
  return false;
}
```

### Character Reconstruction

```typescript
function reconstructChineseCharacter(
  bytes: number[], 
  startIndex: number
): { bytes: number[]; length: number } | null {
  // Try to find valid Chinese character sequence
  for (let len = 3; len <= 6; len++) {
    if (startIndex + len > bytes.length) break;
    
    const sequence = bytes.slice(startIndex, startIndex + len);
    if (isValidChineseSequence(sequence)) {
      return { bytes: sequence, length: len };
    }
  }
  
  return null;
}
```

---

## Testing Strategy

### Test Cases

```typescript
describe('fixFileNameEncoding', () => {
  // Vietnamese tests
  it('should fix standard Vietnamese mojibake', () => {
    const input = 'BPVN. ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf';
    const expected = 'BPVN. Thông báo khám sức khỏe Định kỳ.pdf';
    const result = fixFileNameEncoding(input);
    expect(result).toBe(expected);
  });
  
  // Chinese tests
  it('should fix Chinese mojibake', () => {
    const input = 'ы(PhÃ¡t sinh.pdf';
    const expected = '比率(Phát sinh.pdf';
    const result = fixFileNameEncoding(input);
    expect(result).toBe(expected);
  });
  
  // Double encoding tests
  it('should fix double encoding', () => {
    const input = 'ThÃƒÂ´ng bÃƒÂ¡o.pdf';
    const expected = 'Thông báo.pdf';
    const result = fixFileNameEncoding(input);
    expect(result).toBe(expected);
  });
  
  // Mixed language tests
  it('should fix mixed Vietnamese and Chinese', () => {
    const input = 'ы(PhÃ¡t sinh sá»± cá» chi phÃ ngoÃ i kÃ hoÃ ch.pdf';
    const expected = '比率(Phát sinh sự cố chi phí ngoài kế hoạch.pdf';
    const result = fixFileNameEncoding(input);
    expect(result).toBe(expected);
  });
});
```

---

## Performance Optimization

### Caching

```typescript
// Cache pattern matching results
const patternCache = new Map<string, string>();

function getCachedPatternMatch(input: string): string | null {
  return patternCache.get(input) || null;
}

function cachePatternMatch(input: string, output: string): void {
  if (patternCache.size > 1000) {
    // Clear old entries
    const firstKey = patternCache.keys().next().value;
    patternCache.delete(firstKey);
  }
  patternCache.set(input, output);
}
```

### Early Exit

```typescript
// Exit early if result is perfect
if (score === 1.0) {
  return result;
}
```

---

## Migration Strategy

### Backward Compatibility

1. Keep existing function signature
2. Add new strategies incrementally
3. Maintain existing behavior for edge cases
4. Add feature flags for gradual rollout

### Rollout Plan

1. **Phase 1:** Deploy to staging, test thoroughly
2. **Phase 2:** Enable for new uploads only
3. **Phase 3:** Enable for all uploads
4. **Phase 4:** Run migration script for existing files

---

## Monitoring & Logging

### Logging

```typescript
function fixFileNameEncoding(fileName: string): string {
  const original = fileName;
  const result = /* ... fix logic ... */;
  
  if (result !== original) {
    logger.debug('Encoding fix applied', {
      original,
      fixed: result,
      strategy: usedStrategy,
      score: evaluateFixQuality(original, result),
    });
  }
  
  return result;
}
```

### Metrics

- Fix success rate
- Average fix time
- Strategy usage distribution
- Error rate
