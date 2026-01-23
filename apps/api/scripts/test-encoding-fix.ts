/**
 * Test script for encoding fix utilities
 * Run with: npx ts-node apps/api/scripts/test-encoding-fix.ts
 */

import { fixFileNameEncodingSimple, fixFileNameEncoding } from '../src/common/utils/encoding.util';

console.log('=== Testing fixFileNameEncodingSimple ===\n');

// Test case 1: Simulate Multer corruption (UTF-8 bytes decoded as Latin1)
// Original: "Thông báo khám sức khỏe Định kỳ.pdf"
// UTF-8 bytes: [0x54, 0x68, 0xC3, 0xB4, 0x6E, 0x67, ...]
// Multer decodes as Latin1: "ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf"
const originalUtf8 = 'Thông báo khám sức khỏe Định kỳ.pdf';
// Simulate what Multer does: take UTF-8 bytes and decode as Latin1
const utf8Bytes = Buffer.from(originalUtf8, 'utf8');
const multerCorrupted = utf8Bytes.toString('latin1'); // This is what Multer produces

const result1 = fixFileNameEncodingSimple(multerCorrupted);
console.log('Test 1 - Vietnamese mojibake (simulated Multer corruption):');
console.log(`  Original UTF-8: ${originalUtf8}`);
console.log(`  Multer output:  ${multerCorrupted}`);
console.log(`  Fixed output:   ${result1}`);
console.log(`  Match:          ${result1 === originalUtf8 ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Test case 2: Control characters
const test2 = {
  input: 'test\x07\x10file.pdf',
  expected: 'testfile.pdf',
};

const result2 = fixFileNameEncodingSimple(test2.input);
console.log('Test 2 - Control characters:');
console.log(`  Input:    ${JSON.stringify(test2.input)}`);
console.log(`  Output:   ${result2}`);
console.log(`  Expected: ${test2.expected}`);
console.log(`  Match:    ${result2 === test2.expected ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Test case 3: Already correct UTF-8
const test3 = {
  input: 'BPVN. Thông báo khám sức khỏe Định kỳ.pdf',
  expected: 'BPVN. Thông báo khám sức khỏe Định kỳ.pdf',
};

const result3 = fixFileNameEncodingSimple(test3.input);
console.log('Test 3 - Already correct UTF-8:');
console.log(`  Input:    ${test3.input}`);
console.log(`  Output:   ${result3}`);
console.log(`  Expected: ${test3.expected}`);
console.log(`  Match:    ${result3 === test3.expected ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Test case 4: Chinese characters (if corrupted)
const test4 = {
  input: 'ä»¥çŽ©.pdf', // Example corrupted Chinese
};

const result4 = fixFileNameEncodingSimple(test4.input);
console.log('Test 4 - Chinese characters:');
console.log(`  Input:    ${test4.input}`);
console.log(`  Output:   ${result4}`);
console.log(`  No mojibake: ${!result4.includes('Ã') && !result4.includes('á»') ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Test case 5: Empty string
const test5 = {
  input: '',
  expected: '',
};

const result5 = fixFileNameEncodingSimple(test5.input);
console.log('Test 5 - Empty string:');
console.log(`  Input:    ${JSON.stringify(test5.input)}`);
console.log(`  Output:   ${JSON.stringify(result5)}`);
console.log(`  Match:    ${result5 === test5.expected ? '✅ PASS' : '❌ FAIL'}`);
console.log();

console.log('=== Summary ===');
const allTests = [
  { name: 'Vietnamese mojibake', pass: result1 === originalUtf8 },
  { name: 'Control characters', pass: result2 === test2.expected },
  { name: 'Already correct UTF-8', pass: result3 === test3.expected },
  { name: 'Chinese characters', pass: !result4.includes('Ã') && !result4.includes('á»') },
  { name: 'Empty string', pass: result5 === test5.expected },
];

const passed = allTests.filter(t => t.pass).length;
const total = allTests.length;

allTests.forEach(test => {
  console.log(`  ${test.pass ? '✅' : '❌'} ${test.name}`);
});

console.log(`\n${passed}/${total} tests passed`);
