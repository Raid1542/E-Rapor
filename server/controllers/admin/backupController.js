/**
 * Nama File: backupController.js
 * Fungsi: Controller backup & restore database (ZIP dengan SQL + uploads)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 *  Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');

const TEMP_DIR = path.join(__dirname, '../../temp_backup');

// GET: Backup seluruh database + folder uploads ke file ZIP
exports.downloadBackup = async (req, res) => {
    try {
        // Step 1: Setup folder temp
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

        const timestamp = Date.now();
        const fileName = `Backup_E-Rapor_${timestamp}.zip`;
        const zipPath = path.join(TEMP_DIR, fileName);
        const sqlPath = path.join(TEMP_DIR, 'database.sql');

        console.log('Memulai backup database...');

        // Step 2: Ambil daftar semua tabel
        const [tables] = await db.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);
        console.log(`Ditemukan ${tableNames.length} tabel`);

        // Step 3: Generate SQL dump
        let sqlDump = `-- Backup Database E-Rapor SDIT Ulil Albab\n`;
        sqlDump += `-- Tanggal: ${new Date().toISOString()}\n`;
        sqlDump += `-- Total Tabel: ${tableNames.length}\n\n`;
        sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

        for (const tableName of tableNames) {
            try {
                // DROP TABLE untuk restore bersih
                sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n\n`;

                // Struktur tabel
                const [createTable] = await db.execute(`SHOW CREATE TABLE \`${tableName}\``);
                sqlDump += `${createTable[0]['Create Table']};\n\n`;

                // Data tabel
                const [rows] = await db.execute(`SELECT * FROM \`${tableName}\``);
                
                if (rows.length > 0) {
                    for (const row of rows) {
                        const values = Object.values(row).map(val => {
                            if (val === null) return 'NULL';
                            if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
                            if (typeof val === 'object') return `'${JSON.stringify(val)}'`;
                            return val;
                        }).join(', ');
                        
                        sqlDump += `INSERT INTO \`${tableName}\` VALUES (${values});\n`;
                    }
                    sqlDump += `\n`;
                }
            } catch (err) {
                console.warn(`Gagal backup tabel ${tableName}:`, err.message);
            }
        }
        
        sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

        // Step 4: Simpan file SQL
        fs.writeFileSync(sqlPath, sqlDump, 'utf8');

        // Step 5: Buat ZIP
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
            console.log(`ZIP selesai dibuat. Ukuran: ${sizeMB} MB`);
            
            // Step 6: Download file
            res.download(zipPath, fileName, (err) => {
                // Cleanup file temp
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
                
                if (err) {
                    console.error('Error download:', err);
                    if (!res.headersSent) res.status(500).json({ message: 'Gagal mendownload backup' });
                }
            });
        });

        archive.on('error', (err) => {
            console.error('Error archive:', err);
            throw err;
        });

        archive.pipe(output);
        archive.file(sqlPath, { name: 'database.sql' });

        // Tambahkan folder uploads ke ZIP
        const uploadsPath = path.join(__dirname, '../../public/uploads');
        if (fs.existsSync(uploadsPath)) archive.directory(uploadsPath, 'uploads');

        archive.finalize();

    } catch (err) {
        console.error('Error Backup:', err);
        res.status(500).json({ message: 'Gagal melakukan backup database', error: err.message });
    }
};

// POST: Restore database dari file .sql atau .zip
exports.uploadRestore = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        // Validasi file
        if (!req.file) return res.status(400).json({ message: 'File backup wajib diupload' });

        const filePath = req.file.path;
        let sqlContent = '';

        console.log(`Memproses file: ${req.file.originalname}`);

        // Step 1: Extract SQL dari ZIP atau baca langsung
        if (req.file.originalname.endsWith('.zip')) {
            try {
                const zip = new AdmZip(filePath);
                const zipEntries = zip.getEntries();
                const sqlEntry = zipEntries.find(entry => entry.entryName === 'database.sql');
                
                if (!sqlEntry) {
                    fs.unlinkSync(filePath);
                    return res.status(400).json({ message: 'File ZIP tidak valid. Harus mengandung file database.sql.' });
                }
                
                sqlContent = sqlEntry.getData().toString('utf8');
            } catch (zipErr) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ message: 'Gagal membaca file ZIP. Pastikan file tidak corrupt.', error: zipErr.message });
            }
        } 
        else if (req.file.originalname.endsWith('.sql')) {
            sqlContent = fs.readFileSync(filePath, 'utf8');
        } 
        else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Format file tidak didukung. Gunakan file .sql atau .zip' });
        }

        // Step 2: Split SQL menjadi per statement
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('SET FOREIGN_KEY_CHECKS'));

        console.log(`Mengeksekusi ${statements.length} statement SQL...`);

        // Step 3: Eksekusi dalam transaction
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
                    console.warn(`Statement error:`, err.message.substring(0, 100));
                }
            }
        }

        await connection.commit();
        fs.unlinkSync(filePath);

        console.log(`Restore selesai. Sukses: ${successCount}, Error: ${errorCount}`);

        res.json({
            success: true,
            message: `Restore berhasil! ${successCount} statement dieksekusi.`,
            warning: 'Silakan refresh halaman atau restart aplikasi untuk memastikan data terbaru.'
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error Restore:', err);
        
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.status(500).json({ message: 'Gagal restore database', error: err.message });
    } finally {
        connection.release();
    }
};