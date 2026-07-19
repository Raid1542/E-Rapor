// test-render.js
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const templatePath = path.join(__dirname, 'templates', 'rapor', 'template_pts_ganjil.docx');

console.log('Cek template ada?', fs.existsSync(templatePath));
console.log('Path lengkap:', templatePath);

const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);

const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '<<', end: '>>' },
    nullGetter: () => '–',
});

doc.render({
    nama: 'TES NAMA SISWA',
    kelas: 'TES KELAS',
    nis: '12345',
    nisn: '67890',
    fase: 'B',
    semester: '1 (Ganjil)',
    ta: '2025/2026',
    semuaMapel: [
        { no: 1, nama_mapel: 'Matematika', nilai_mapel: 90, deskripsi_mapel: 'Sangat baik' },
        { no: 2, nama_mapel: 'IPA', nilai_mapel: 85, deskripsi_mapel: 'Baik' }
    ],
    ratarata: '87.50',
    ckratarata: 'Baik sekali',
    my: 90, gmy: 'A', dmy: 'Sangat konsisten',
    cttwalikelas: 'Anak yang rajin',
    s: 1, i: 0, a: 0,
    tanggalraporpts: '19 Juli 2026',
    namagurukelas: 'TES NAMA GURU',
});

const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync('hasil-test.docx', buf);
console.log('SELESAI — cek file hasil-test.docx di folder ini');