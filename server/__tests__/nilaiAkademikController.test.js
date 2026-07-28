/**
 * Unit test untuk nilaiAkademikController.js
 * Menguji fungsi calculateSimilarity (Levenshtein Distance) - pure function, tanpa database
 *
 * Cara jalankan: dari folder "server", ketik `npm test`
 */

// Mock koneksi database supaya tidak connect ke MariaDB asli saat unit test berjalan
jest.mock('../config/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn(),
}));

const controller = require('../controllers/guru_kelas/nilaiAkademikController');

describe('calculateSimilarity', () => {
  test('mengembalikan 1 jika dua string identik', () => {
    expect(controller._calculateSimilarity('Ahmad Fauzi', 'Ahmad Fauzi')).toBe(1);
  });

  test('mengembalikan 0 jika salah satu string kosong', () => {
    expect(controller._calculateSimilarity('', 'Ahmad')).toBe(0);
    expect(controller._calculateSimilarity('Ahmad', '')).toBe(0);
  });

  test('mengembalikan 0 jika salah satu argumen null/undefined', () => {
    expect(controller._calculateSimilarity(null, 'Ahmad')).toBe(0);
    expect(controller._calculateSimilarity('Ahmad', undefined)).toBe(0);
  });

  test('mendeteksi typo kecil (1 huruf beda) sebagai sangat mirip', () => {
    // "andi" vs "andy": 1 substitusi dari 4 huruf -> similarity 0.75
    const result = controller._calculateSimilarity('andi', 'andy');
    expect(result).toBeCloseTo(0.75, 2);
  });

  test('mendeteksi perbedaan kapitalisasi sebagai perbedaan 1 karakter', () => {
    // "Ahmad" vs "ahmad": beda di huruf pertama saja -> similarity 0.8
    const result = controller._calculateSimilarity('Ahmad', 'ahmad');
    expect(result).toBeCloseTo(0.8, 2);
  });

  test('mengembalikan 0 untuk dua string yang sama sekali berbeda dan sama panjang', () => {
    // "abc" vs "xyz": semua huruf beda, 3 substitusi dari 3 huruf -> similarity 0
    const result = controller._calculateSimilarity('abc', 'xyz');
    expect(result).toBeCloseTo(0, 2);
  });

  test('nilai similarity selalu antara 0 dan 1', () => {
    const result = controller._calculateSimilarity('Muhammad Hafis', 'M Hafis');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  test('nama dengan tambahan spasi dianggap kurang mirip (spasi dihitung sebagai karakter)', () => {
    const result = controller._calculateSimilarity('Siti Aminah', 'SitiAminah');
    // beda 1 karakter (spasi hilang) dari 11 huruf -> similarity sekitar 0.909
    expect(result).toBeCloseTo(10 / 11, 2);
  });
});