/**
 * Unit test untuk penilaianBobotController.js
 * Menguji fungsi validasi bobot penilaian - pure function, tanpa database
 *
 * Cara jalankan: dari folder "server", ketik `npm test`
 */

// Mock koneksi database supaya tidak connect ke MariaDB asli saat unit test berjalan
jest.mock('../config/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn(),
}));

const controller = require('../controllers/guru_bidang_studi/penilaianBobotController');

describe('validateKelasId', () => {
  test('menolak jika kelas_id kosong/tidak diisi', () => {
    const result = controller._validateKelasId(undefined);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/wajib diisi/);
  });

  test('menolak jika kelas_id bukan angka', () => {
    const result = controller._validateKelasId('abc');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/tidak valid/);
  });

  test('menolak jika kelas_id nol atau negatif', () => {
    expect(controller._validateKelasId('0').valid).toBe(false);
    expect(controller._validateKelasId('-5').valid).toBe(false);
  });

  test('menerima kelas_id angka positif dan mengembalikan angkanya', () => {
    const result = controller._validateKelasId('7');
    expect(result.valid).toBe(true);
    expect(result.kelasIdNum).toBe(7);
  });
});

describe('validateSingleBobot', () => {
  test('menolak jika komponen_id tidak ada', () => {
    const result = controller._validateSingleBobot({ bobot: 50 });
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/tidak lengkap/);
  });

  test('menolak jika bobot undefined', () => {
    const result = controller._validateSingleBobot({ komponen_id: 1 });
    expect(result.valid).toBe(false);
  });

  test('menolak bobot bukan angka', () => {
    const result = controller._validateSingleBobot({ komponen_id: 1, bobot: 'abc' });
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/tidak valid/);
  });

  test('menolak bobot negatif', () => {
    const result = controller._validateSingleBobot({ komponen_id: 1, bobot: -10 });
    expect(result.valid).toBe(false);
  });

  test('menolak bobot lebih dari 100', () => {
    const result = controller._validateSingleBobot({ komponen_id: 1, bobot: 150 });
    expect(result.valid).toBe(false);
  });

  test('menerima bobot valid antara 0-100', () => {
    expect(controller._validateSingleBobot({ komponen_id: 1, bobot: 0 }).valid).toBe(true);
    expect(controller._validateSingleBobot({ komponen_id: 1, bobot: 50 }).valid).toBe(true);
    expect(controller._validateSingleBobot({ komponen_id: 1, bobot: 100 }).valid).toBe(true);
  });
});

describe('validateTotalBobot', () => {
  test('menerima jika total tepat 100', () => {
    const result = controller._validateTotalBobot([
      { komponen_id: 1, bobot: 40 },
      { komponen_id: 2, bobot: 60 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.total).toBe(100);
  });

  test('menolak jika total kurang dari 100', () => {
    const result = controller._validateTotalBobot([
      { komponen_id: 1, bobot: 40 },
      { komponen_id: 2, bobot: 50 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/90.00%/);
  });

  test('menolak jika total lebih dari 100', () => {
    const result = controller._validateTotalBobot([
      { komponen_id: 1, bobot: 70 },
      { komponen_id: 2, bobot: 50 },
    ]);
    expect(result.valid).toBe(false);
  });

  test('menerima toleransi pembulatan kecil (selisih <= 0.01)', () => {
    const result = controller._validateTotalBobot([
      { komponen_id: 1, bobot: 33.33 },
      { komponen_id: 2, bobot: 33.33 },
      { komponen_id: 3, bobot: 33.34 },
    ]);
    expect(result.valid).toBe(true);
  });
});