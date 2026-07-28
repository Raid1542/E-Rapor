/**
 * Unit test untuk aturPenilaianController.js
 * Menguji fungsi validasi akses (pure function, tanpa database)
 *
 * Cara jalankan: dari folder "server", ketik `npm test`
 */

// Mock koneksi database supaya tidak connect ke MariaDB asli saat unit test berjalan
jest.mock('../config/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn(),
}));

const controller = require('../controllers/guru_kelas/aturPenilaianController');

describe('validateAspekKokurikulerAccess', () => {
  test('menolak akses jika PTS dan PAS sama-sama belum aktif', () => {
    const result = controller._validateAspekKokurikulerAccess(1, 'nonaktif', 'nonaktif');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not_open');
  });

  test('menolak aspek selain Mutaba\'ah (id 5) saat PTS aktif', () => {
    const result = controller._validateAspekKokurikulerAccess(1, 'aktif', 'nonaktif');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('locked_pts');
  });

  test('mengizinkan aspek Mutaba\'ah (id 5) saat PTS aktif', () => {
    const result = controller._validateAspekKokurikulerAccess(5, 'aktif', 'nonaktif');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('default');
  });

  test('mengizinkan aspek apapun saat PAS aktif', () => {
    const result = controller._validateAspekKokurikulerAccess(1, 'nonaktif', 'aktif');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('pas_active');
  });
});

describe('validateDeskripsiRataRataAccess', () => {
  test('mengizinkan akses saat PTS aktif', () => {
    const result = controller._validateDeskripsiRataRataAccess('aktif', 'nonaktif');
    expect(result.allowed).toBe(true);
  });

  test('menolak akses saat PAS aktif (bukan PTS)', () => {
    const result = controller._validateDeskripsiRataRataAccess('nonaktif', 'aktif');
    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/PTS aktif/);
  });

  test('menolak akses saat kedua periode belum aktif', () => {
    const result = controller._validateDeskripsiRataRataAccess('nonaktif', 'nonaktif');
    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/belum aktif/);
  });
});

describe('getJenisPenilaian', () => {
  test('mengambil dari req.jenis_penilaian jika ada', () => {
    const req = { jenis_penilaian: 'PAS', query: {}, body: {} };
    expect(controller._getJenisPenilaian(req)).toBe('PAS');
  });

  test('mengambil dari req.query.jenis jika req.jenis_penilaian kosong', () => {
    const req = { query: { jenis: 'PAS' }, body: {} };
    expect(controller._getJenisPenilaian(req)).toBe('PAS');
  });

  test('mengambil dari req.body.jenis jika query kosong', () => {
    const req = { query: {}, body: { jenis: 'PAS' } };
    expect(controller._getJenisPenilaian(req)).toBe('PAS');
  });

  test('default ke PTS jika semua sumber kosong', () => {
    const req = { query: {}, body: {} };
    expect(controller._getJenisPenilaian(req)).toBe('PTS');
  });
});

describe('getKelasId', () => {
  test('mengambil kelas_id dari req.infoKelasWali', () => {
    const req = { infoKelasWali: { kelas_id: 7 } };
    expect(controller._getKelasId(req)).toBe(7);
  });

  test('mengembalikan undefined jika infoKelasWali tidak ada', () => {
    const req = {};
    expect(controller._getKelasId(req)).toBeUndefined();
  });
});