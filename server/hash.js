const bcrypt = require('bcrypt');
const saltRounds = 10;

// Ganti 'password123' dengan password yang ingin kamu gunakan
const passwordAsli = 'sekolah123'; 

bcrypt.hash(passwordAsli, saltRounds, (err, hash) => {
    if (err) {
        console.error("Gagal melakukan hash:", err);
        return;
    }
    console.log("--------------------------------------");
    console.log("Password Asli :", passwordAsli);
    console.log("Hasil Hash    :", hash);
    console.log("--------------------------------------");
    console.log("Silakan COPY hasil hash di atas ke kolom password di database.");
});