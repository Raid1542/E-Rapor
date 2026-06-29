/**
 * Nama File: authorize.js
 * Fungsi: Middleware factory untuk role-based access control (RBAC)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

// Factory function: buat middleware otorisasi berdasarkan role (support string/array/variadic)
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;

        // Step 1: Validasi keberadaan role user
        if (!userRole) {
            return res.status(403).json({ message: 'Anda tidak memiliki akses' });
        }

        // Step 2: Normalisasi input role (flatten array)
        let rolesArray = [];
        for (const role of allowedRoles) {
            if (Array.isArray(role)) rolesArray.push(...role);
            else rolesArray.push(role);
        }

        // Step 3: Case-insensitive comparison
        const normalizedUserRole = userRole.toLowerCase();
        const normalizedAllowedRoles = rolesArray.map(r => r.toLowerCase());

        // Step 4: Validasi role
        if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
            return res.status(403).json({ message: 'Anda tidak memiliki akses' });
        }

        next();
    };
};

module.exports = authorize;