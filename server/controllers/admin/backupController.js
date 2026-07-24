/*
 * Nama File: backupController.js
 * Fungsi: Controller backup & restore database (ZIP dengan SQL + uploads).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');

const TEMP_DIR = path.join(__dirname, '../../temp_backup');

/* Fungsi: Backup seluruh database dan folder uploads ke file ZIP. */
exports.downloadBackup = async (req, res) => {
    try {
        // Buat direktori temporary jika belum ada
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        const timestamp = Date.now();
        const fileName = `Backup_E-Rapor_${timestamp}.zip`;
        const zipPath = path.join(TEMP_DIR, fileName);
        const sqlPath = path.join(TEMP_DIR, 'database.sql');

        const [tables] = await db.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        let sqlDump = `-- Backup Database E-Rapor SDIT Ulil Albab\n`;
        sqlDump += `-- Tanggal: ${new Date().toISOString()}\n`;
        sqlDump += `-- Total Tabel: ${tableNames.length}\n\n`;
        sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

        // Loop setiap tabel untuk mengambil struktur dan data
        for (const tableName of tableNames) {
            try {
                sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n\n`;

                const [createTable] = await db.execute(`SHOW CREATE TABLE \`${tableName}\``);
                sqlDump += `${createTable[0]['Create Table']};\n\n`;

                const [rows] = await db.execute(`SELECT * FROM \`${tableName}\``);

                if (rows.length > 0) {
                    const columns = Object.keys(rows[0]);
                    
                    for (const row of rows) {
                        const values = columns.map(col => {
                            const val = row[col];
                            
                            if (val === null) {
                                return 'NULL';
                            }
                            if (typeof val === 'string') {
                                const escaped = val
                                    .replace(/\\/g, '\\\\')
                                    .replace(/'/g, "''")
                                    .replace(/"/g, '\\"')
                                    .replace(/\0/g, '\\0');
                                return `'${escaped}'`;
                            }
                            if (typeof val === 'object') {
                                const jsonStr = JSON.stringify(val).replace(/'/g, "''");
                                return `'${jsonStr}'`;
                            }
                            if (typeof val === 'boolean') {
                                return val ? 1 : 0;
                            }
                            
                            return val;
                        }).join(', ');

                        sqlDump += `INSERT INTO \`${tableName}\` VALUES (${values});\n`;
                    }
                    sqlDump += `\n`;
                }
            } catch (err) {
                // Abaikan error tabel spesifik agar proses backup tetap berjalan
            }
        }

        sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
        fs.writeFileSync(sqlPath, sqlDump, 'utf8');

        // Buat arsip ZIP
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            res.download(zipPath, fileName, (err) => {
                if (fs.existsSync(zipPath)) {
                    fs.unlinkSync(zipPath);
                }
                if (fs.existsSync(sqlPath)) {
                    fs.unlinkSync(sqlPath);
                }

                if (err && !res.headersSent) {
                    res.status(500).json({ message: 'Gagal mendownload backup' });
                }
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);
        archive.file(sqlPath, { name: 'database.sql' });

        const uploadsPath = path.join(__dirname, '../../public/uploads');
        if (fs.existsSync(uploadsPath)) {
            archive.directory(uploadsPath, 'uploads');
        }

        archive.finalize();

    } catch (err) {
        res.status(500).json({ message: 'Gagal melakukan backup database', error: err.message });
    }
};

/* Fungsi: Restore database dari file .sql atau .zip menggunakan Stream Pipe. */
exports.uploadRestore = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File backup wajib diupload' });
        }

        let filePath = req.file.path;
        let sqlFilePath = filePath;

        // Ekstrak file jika formatnya ZIP
        if (req.file.originalname.toLowerCase().endsWith('.zip')) {
            try {
                const zip = new AdmZip(filePath);
                const zipEntries = zip.getEntries();
                const sqlEntry = zipEntries.find(entry => entry.entryName.toLowerCase() === 'database.sql');

                if (!sqlEntry) {
                    fs.unlinkSync(filePath);
                    return res.status(400).json({ message: 'File ZIP tidak valid. Harus mengandung file database.sql.' });
                }

                sqlFilePath = path.join(path.dirname(filePath), `temp_restore_${Date.now()}.sql`);
                fs.writeFileSync(sqlFilePath, sqlEntry.getData());
            } catch (zipErr) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ message: 'Gagal membaca file ZIP.', error: zipErr.message });
            }
        } else if (!req.file.originalname.toLowerCase().endsWith('.sql')) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Format file tidak didukung. Gunakan file .sql atau .zip' });
        }

        // Konfigurasi database dari environment variables
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'erapor_db'
        };

        // Gunakan spawn + pipe untuk kestabilan proses di Windows
        const mysqlProcess = spawn('mysql', [
            `-h${dbConfig.host}`,
            `-u${dbConfig.user}`,
            `-p${dbConfig.password}`,
            dbConfig.database
        ], { shell: true });

        let stderrData = '';

        mysqlProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        // Bungkus dalam Promise untuk menunggu proses selesai
        await new Promise((resolve, reject) => {
            mysqlProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(true);
                } else {
                    reject(new Error(`Proses MySQL gagal dengan kode ${code}. Detail: ${stderrData}`));
                }
            });

            mysqlProcess.on('error', (err) => {
                reject(new Error(`Gagal memulai proses MySQL: ${err.message}. Pastikan 'mysql' sudah terdaftar di Environment Variables (PATH).`));
            });

            // Pipe isi file SQL langsung ke input proses mysql
            const fileStream = fs.createReadStream(sqlFilePath);
            fileStream.pipe(mysqlProcess.stdin);

            fileStream.on('error', (err) => {
                mysqlProcess.kill();
                reject(new Error(`Gagal membaca file SQL: ${err.message}`));
            });
        });

        // Bersihkan file temporary setelah berhasil
        fs.unlinkSync(filePath);
        if (sqlFilePath !== filePath && fs.existsSync(sqlFilePath)) {
            fs.unlinkSync(sqlFilePath);
        }

        res.json({
            success: true,
            message: 'Database berhasil di-restore sepenuhnya.',
            warning: 'Data telah diperbarui. Halaman akan dimuat ulang otomatis.'
        });

    } catch (err) {
        // Bersihkan file temporary jika proses gagal
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            message: 'Restore dibatalkan karena terdapat error pada struktur data atau koneksi.', 
            detail: err.message 
        });
    }
};