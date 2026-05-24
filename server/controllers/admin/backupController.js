/**
 * Nama File: backupController.js
 * Fungsi: Backup & Restore SELURUH database e-Rapor (semua tahun ajaran)
 * Format: .zip (database.sql + folder uploads) atau .sql langsung
 */

const db = require('../../config/db');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver'); // Untuk buat ZIP
const AdmZip = require('adm-zip');    // Untuk extract ZIP saat restore

// Folder temp untuk proses backup/restore
const TEMP_DIR = path.join(__dirname, '../../temp_backup');

// ==========================================
// BACKUP (Download ZIP)
// ==========================================
exports.downloadBackup = async (req, res) => {
    try {
        // 1. Pastikan folder temp ada
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        const timestamp = Date.now();
        const fileName = `Backup_E-Rapor_${timestamp}.zip`;
        const zipPath = path.join(TEMP_DIR, fileName);
        const sqlPath = path.join(TEMP_DIR, 'database.sql');

        console.log('Memulai backup database...');

        // 2. Ambil SEMUA tabel di database (dinamis, tidak perlu hardcode)
        const [tables] = await db.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        console.log(`Ditemukan ${tableNames.length} tabel:`, tableNames);

        // 3. Generate SQL Dump (Struktur + Data)
        let sqlDump = `-- Backup Database E-Rapor SDIT Ulil Albab\n`;
        sqlDump += `-- Tanggal: ${new Date().toISOString()}\n`;
        sqlDump += `-- Total Tabel: ${tableNames.length}\n\n`;
        sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`; // Nonaktifkan FK sementara

        for (const tableName of tableNames) {
            try {
                // a. DROP TABLE IF EXISTS (agar restore bersih)
                sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n\n`;

                // b. Ambil struktur tabel (CREATE TABLE)
                const [createTable] = await db.execute(`SHOW CREATE TABLE \`${tableName}\``);
                sqlDump += `${createTable[0]['Create Table']};\n\n`;

                // c. Ambil SEMUA data di tabel ini
                const [rows] = await db.execute(`SELECT * FROM \`${tableName}\``);
                
                if (rows.length > 0) {
                    // Generate INSERT statements untuk setiap baris
                    for (const row of rows) {
                        const values = Object.values(row).map(val => {
                            if (val === null) return 'NULL';
                            if (typeof val === 'string') {
                                // Escape single quote agar tidak error di SQL
                                return `'${val.replace(/'/g, "\\'")}'`;
                            }
                            if (typeof val === 'object') {
                                // Handle JSON/Date object
                                return `'${JSON.stringify(val)}'`;
                            }
                            return val; // Number, boolean, dll
                        }).join(', ');
                        
                        sqlDump += `INSERT INTO \`${tableName}\` VALUES (${values});\n`;
                    }
                    sqlDump += `\n`;
                }
            } catch (err) {
                console.warn(`Gagal backup tabel ${tableName}:`, err.message);
                // Lanjutkan ke tabel berikutnya, jangan stop total
            }
        }
        
        sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`; // Aktifkan FK kembali

        // 4. Simpan file SQL sementara
        fs.writeFileSync(sqlPath, sqlDump, 'utf8');
        console.log('File database.sql berhasil dibuat');

        // 5. Buat File ZIP (Gabungkan SQL + Folder Uploads)
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } }); // Kompresi maksimal

        output.on('close', () => {
            const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
            console.log(`ZIP selesai dibuat. Ukuran: ${sizeMB} MB`);
            
            // 6. Kirim File ke Browser (Download)
            res.download(zipPath, fileName, (err) => {
                // Cleanup: Hapus file temp setelah download selesai
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
                
                if (err) {
                    console.error('Error download:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ message: 'Gagal mendownload backup' });
                    }
                }
            });
        });

        archive.on('error', (err) => {
            console.error('Error archive:', err);
            throw err;
        });

        archive.pipe(output);

        // Masukkan file SQL ke dalam ZIP
        archive.file(sqlPath, { name: 'database.sql' });

        // Masukkan folder uploads (Logo, Foto Profil) ke dalam ZIP
        const uploadsPath = path.join(__dirname, '../../public/uploads');
        if (fs.existsSync(uploadsPath)) {
            archive.directory(uploadsPath, 'uploads');
            console.log('Folder uploads ditambahkan ke backup');
        }

        // Finalize ZIP
        archive.finalize();

    } catch (err) {
        console.error('Error Backup:', err);
        res.status(500).json({ 
            message: 'Gagal melakukan backup database', 
            error: err.message 
        });
    }
};

// ==========================================
// RESTORE (Upload & Replace Data)
// ==========================================
exports.uploadRestore = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        // Validasi file upload
        if (!req.file) {
            return res.status(400).json({ message: 'File backup wajib diupload' });
        }

        const filePath = req.file.path;
        let sqlContent = '';

        console.log(`Memproses file: ${req.file.originalname}`);

        // ==========================================
        // HANDLE FILE .ZIP (Extract database.sql)
        // ==========================================
        if (req.file.originalname.endsWith('.zip')) {
            try {
                const zip = new AdmZip(filePath);
                const zipEntries = zip.getEntries();
                
                // Cari file 'database.sql' di dalam ZIP
                const sqlEntry = zipEntries.find(entry => entry.entryName === 'database.sql');
                
                if (!sqlEntry) {
                    fs.unlinkSync(filePath);
                    return res.status(400).json({ 
                        message: 'File ZIP tidak valid. Harus mengandung file database.sql di dalamnya.' 
                    });
                }
                
                // Extract content SQL ke memory
                sqlContent = sqlEntry.getData().toString('utf8');
                console.log('database.sql berhasil diekstrak dari ZIP');
                
            } catch (zipErr) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ 
                    message: 'Gagal membaca file ZIP. Pastikan file tidak corrupt.',
                    error: zipErr.message 
                });
            }
        } 
        // ==========================================
        // HANDLE FILE .SQL (Langsung baca)
        // ==========================================
        else if (req.file.originalname.endsWith('.sql')) {
            sqlContent = fs.readFileSync(filePath, 'utf8');
        } 
        else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ 
                message: 'Format file tidak didukung. Gunakan file .sql atau .zip' 
            });
        }

        // ==========================================
        // EKSEKUSI SQL RESTORE
        // ==========================================
        
        // Split SQL menjadi per statement (berdasarkan tanda titik koma)
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => 
                stmt.length > 0 && 
                !stmt.startsWith('--') && 
                !stmt.startsWith('SET FOREIGN_KEY_CHECKS')
            );

        console.log(`Mengeksekusi ${statements.length} statement SQL...`);

        // Gunakan Transaction agar data aman (atomic)
        await connection.beginTransaction();

        let successCount = 0;
        let errorCount = 0;

        for (const statement of statements) {
            if (statement) {
                try {
                    await connection.execute(statement);
                    successCount++;
                } catch (err) {
                    errorCount++;
                    // Log error tapi JANGAN throw, biar restore lanjut ke statement berikutnya
                    // Ini penting karena kadang ada statement duplikat atau minor issue
                    console.warn(`Statement ke-${successCount} error:`, err.message.substring(0, 100));
                }
            }
        }

        await connection.commit();
        
        // Hapus file upload setelah selesai
        fs.unlinkSync(filePath);

        console.log(`Restore selesai. Sukses: ${successCount}, Error: ${errorCount}`);

        res.json({
            success: true,
            message: `store berhasil! ${successCount} statement dieksekusi.`,
            warning: 'Silakan refresh halaman atau restart aplikasi untuk memastikan data terbaru.'
        });

    } catch (err) {
        // Jika error kritis, ROLLBACK semua perubahan
        await connection.rollback();
        
        console.error('Error Restore:', err);
        
        // Hapus file upload jika ada error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            message: 'Gagal restore database', 
            error: err.message 
        });
    } finally {
        // Pastikan koneksi dilepas
        connection.release();
    }
};