/**
 * Nama File: authorize.js
 * Fungsi: Middleware factory untuk role-based access control (RBAC).
 *         Memvalidasi apakah role user termasuk dalam daftar role yang diizinkan.
 *         Mendukung input role sebagai string tunggal atau array.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

// ═════════════════════════════════════════════════════════════════════════════
// AUTHORIZATION MIDDLEWARE FACTORY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Factory function untuk membuat middleware otorisasi berdasarkan role.
 * 
 * Penggunaan:
 *   router.get('/data', authenticate, authorize('admin'), controller.getData);
 *   router.get('/data', authenticate, authorize(['admin', 'guru_kelas']), controller.getData);
 *   router.get('/data', authenticate, authorize('admin', 'guru_kelas'), controller.getData);
 * 
 * Fitur:
 *   - Validasi role user dari req.user.role (setelah authenticate middleware)
 *   - Support input variadic: authorize('admin'), authorize('admin', 'guru')
 *   - Support input array: authorize(['admin', 'guru_kelas'])
 *   - Case-insensitive comparison
 * 
 * @param {...(string|string[])} allowedRoles - Daftar role yang diizinkan
 * @returns {Function} Middleware Express untuk validasi role
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;

        // Step 1: Validasi keberadaan role user
        if (!userRole) {
            return res.status(403).json({ 
                message: 'Anda tidak memiliki akses' 
            });
        }

        // Step 2: Normalisasi input role (flatten array)
        let rolesArray = [];
        for (const role of allowedRoles) {
            if (Array.isArray(role)) {
                rolesArray.push(...role);
            } else {
                rolesArray.push(role);
            }
        }

        // Step 3: Case-insensitive comparison
        const normalizedUserRole = userRole.toLowerCase();
        const normalizedAllowedRoles = rolesArray.map(r => r.toLowerCase());

        // Step 4: Validasi role
        if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
            return res.status(403).json({ 
                message: 'Anda tidak memiliki akses' 
            });
        }

        next();
    };
};

module.exports = authorize;