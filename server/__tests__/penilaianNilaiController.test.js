/**
 * Unit test untuk penilaianNilaiController.js
 * Menguji fungsi calculateSimilarity (Levenshtein Distance) - pure function, tanpa database
 *
 * Cara jalankan: dari folder "server", ketik `npm test`
 */

// Mock koneksi database supaya tidak connect ke MariaDB asli saat unit test berjalan
jest.mock('../config/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn(),
}));

const controller = require('../controllers/guru_bidang_studi/penilaianNilaiController');

describe('calculateSimilarity (GBS)', () => {
  test('mengembalikan 1 jika dua string identik', () => {
    expect(controller._calculateSimilarity('Kansya Citra Nivira', 'Kansya Citra Nivira')).toBe(1);
  });

  test('mengembalikan 0 jika salah satu string kosong', () => {
    expect(controller._calculateSimilarity('', 'Kansya')).toBe(0);
    expect(controller._calculateSimilarity('Kansya', '')).toBe(0);
  });

  test('mengembalikan 0 jika salah satu argumen null/undefined', () => {
    expect(controller._calculateSimilarity(null, 'Kansya')).toBe(0);
    expect(controller._calculateSimilarity('Kansya', undefined)).toBe(0);
  });

  test('mendeteksi typo kecil (1 huruf beda) sebagai sangat mirip', () => {
    // "shahnaz" vs "shahnas": 1 substitusi dari 7 huruf -> similarity ~0.857
    const result = controller._calculateSimilarity('shahnaz', 'shahnas');
    expect(result).toBeCloseTo(6 / 7, 2);
  });

  test('mendeteksi nama yang jauh berbeda sebagai tidak mirip', () => {
    const result = controller._calculateSimilarity('Anisa', 'Jerimy');
    expect(result).toBeLessThan(0.5);
  });

  test('nilai similarity selalu antara 0 dan 1', () => {
    const result = controller._calculateSimilarity('Faizah Nabila Sari', 'Faizah N Sari');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  test('nama dengan singkatan tetap terdeteksi cukup mirip (di atas ambang batas 0.7)', () => {
    // Skenario nyata: dipakai controller untuk toleransi typo saat import Excel
    const result = controller._calculateSimilarity('m hafis danugraha', 'm. hafis danugraha');
    expect(result).toBeGreaterThanOrEqual(0.7);
  });
});