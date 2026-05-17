const bcrypt = require('bcryptjs');

async function hashPassword() {
    const password = 'sekolah123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Hash:', hash);
}

hashPassword();