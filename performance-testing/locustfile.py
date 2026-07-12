from locust import HttpUser, task, between
import random

# ════════════════════════════════════════════════════════════════════════════
# KONFIGURASI DATA UJI (SUDAH SESUAI DATABASE 100%)
# ═════════════════════════════════════════════════════════════════════════════
DATA_UJI = {
    "guru_kelas": {
        "email": "raid@sekolah.id",
        "password": "sekolah123",
        "role": "guru_kelas"
    },
    "admin": {
        "email": "admin@sekolah.id",
        "password": "sekolah123",
        "role": "admin"
    },
    "guru_bidang_studi": {
        "email": "raid@sekolah.id",
        "password": "sekolah123",
        "role": "guru_bidang_studi"
    },
    # ✅ DATA VALID DARI DATABASE:
    "siswa_id": 1,              # Sudah di-assign ke kelas 1A
    "mapel_id": 8,              # Bahasa Inggris - yang diajar raid@sekolah.id
    "kelas_id": 1,              # 1 A
    "tahun_ajaran_id": 3,       # ✅ 2025/2026 Ganjil (TA AKTIF SEKARANG!)
    "semester": ["Ganjil"],     # ✅ HANYA Ganjil (sesuai TA aktif)
    "jenis_penilaian": ["PTS"]  # ✅ HANYA PTS (status_pts = aktif)
}

# Timeout untuk semua request (mencegah ConnectionResetError)
REQUEST_TIMEOUT = 30


# ═════════════════════════════════════════════════════════════════════════════
# 1. GURU KELAS USER
# ═════════════════════════════════════════════════════════════════════════════
class GuruKelasUser(HttpUser):
    """Simulasi Guru Kelas - Wali Kelas 1A"""
    wait_time = between(1, 3)
    token = None
    
    def on_start(self):
        """Login sebagai guru kelas"""
        response = self.client.post("/api/auth/login", json={
            "email_sekolah": DATA_UJI["guru_kelas"]["email"],
            "password": DATA_UJI["guru_kelas"]["password"],
            "role": DATA_UJI["guru_kelas"]["role"]
        }, timeout=REQUEST_TIMEOUT)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("token")
                if self.token:
                    self.client.headers.update({"Authorization": f"Bearer {self.token}"})
            except:
                pass
    
    @task(3)
    def view_dashboard(self):
        """Dashboard Guru Kelas - CORE FEATURE"""
        self.client.get("/api/guru-kelas/dashboard", 
                       name="/api/guru-kelas/dashboard",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_kelas(self):
        """Lihat Kelas Saya - CORE FEATURE"""
        self.client.get("/api/guru-kelas/kelas", 
                       name="/api/guru-kelas/kelas",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_siswa(self):
        """Lihat Data Siswa - CORE FEATURE"""
        self.client.get("/api/guru-kelas/siswa", 
                       name="/api/guru-kelas/siswa",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_mapel(self):
        """Lihat Mata Pelajaran - CORE FEATURE"""
        self.client.get("/api/guru-kelas/mapel", 
                       name="/api/guru-kelas/mapel",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_rekapan_nilai(self):
        """Rekap Nilai - CORE FEATURE"""
        self.client.get("/api/guru-kelas/rekapan-nilai", 
                       name="/api/guru-kelas/rekapan-nilai",
                       timeout=REQUEST_TIMEOUT)
    
    @task(1)
    def view_tahun_ajaran_aktif(self):
        """Tahun Ajaran Aktif"""
        self.client.get("/api/guru-kelas/tahun-ajaran/aktif", 
                       name="/api/guru-kelas/tahun-ajaran/aktif",
                       timeout=REQUEST_TIMEOUT)
    
    @task(1)
    def generate_rapor_pdf(self):
        """Cetak Rapor PDF - CORE FEATURE (Hanya PTS & Ganjil)"""
        self.client.get(f"/api/guru-kelas/generate-rapor/{DATA_UJI['siswa_id']}/PTS/Ganjil",
                       name="/api/guru-kelas/generate-rapor/:id/:jenis/:semester",
                       timeout=REQUEST_TIMEOUT)


# ═════════════════════════════════════════════════════════════════════════════
# 2. ADMIN USER
# ═════════════════════════════════════════════════════════════════════════════
class AdminUser(HttpUser):
    """Simulasi Admin - Akses Global"""
    wait_time = between(2, 5)
    token = None
    
    def on_start(self):
        """Login sebagai admin"""
        response = self.client.post("/api/auth/login", json={
            "email_sekolah": DATA_UJI["admin"]["email"],
            "password": DATA_UJI["admin"]["password"],
            "role": DATA_UJI["admin"]["role"]
        }, timeout=REQUEST_TIMEOUT)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("token")
                if self.token:
                    self.client.headers.update({"Authorization": f"Bearer {self.token}"})
            except:
                pass
    
    @task(3)
    def view_dashboard_admin(self):
        """Dashboard Admin - CORE FEATURE"""
        self.client.get("/api/admin/dashboard/stats", 
                       name="/api/admin/dashboard/stats",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_progress_guru(self):
        """Progress Guru - CORE FEATURE"""
        self.client.get("/api/admin/dashboard/progress-guru", 
                       name="/api/admin/dashboard/progress-guru",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_data_guru(self):
        """Kelola Data Guru - CORE FEATURE"""
        self.client.get("/api/admin/guru", 
                       name="/api/admin/guru",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_data_siswa(self):
        """Kelola Data Siswa - CORE FEATURE"""
        self.client.get("/api/admin/siswa-master", 
                       name="/api/admin/siswa-master",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_tahun_ajaran(self):
        """Kelola Tahun Ajaran - CORE FEATURE"""
        self.client.get("/api/admin/tahun-ajaran", 
                       name="/api/admin/tahun-ajaran",
                       timeout=REQUEST_TIMEOUT)
        self.client.get("/api/admin/semester-list", 
                       name="/api/admin/semester-list",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_kelengkapan_rapor(self):
        """Kelengkapan Rapor - CORE FEATURE"""
        self.client.get("/api/admin/dashboard/kelengkapan-rapor", 
                       name="/api/admin/dashboard/kelengkapan-rapor",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_arsip_rapor_tahun_ajaran(self):
        """Arsip Rapor - CORE FEATURE"""
        self.client.get("/api/admin/arsip-rapor/tahun-ajaran", 
                       name="/api/admin/arsip-rapor/tahun-ajaran",
                       timeout=REQUEST_TIMEOUT)
    
    @task(1)
    def view_arsip_rapor_kelas(self):
        """Arsip Rapor Kelas - CORE FEATURE"""
        self.client.get(f"/api/admin/arsip-rapor/kelas?tahun_ajaran_id={DATA_UJI['tahun_ajaran_id']}&semester=Ganjil",
                       name="/api/admin/arsip-rapor/kelas",
                       timeout=REQUEST_TIMEOUT)


# ═════════════════════════════════════════════════════════════════════════════
# 3. GURU BIDANG STUDI USER
# ═════════════════════════════════════════════════════════════════════════════
class GuruBidangStudiUser(HttpUser):
    """Simulasi Guru Bidang Studi - Guru Bahasa Inggris"""
    wait_time = between(1, 4)
    token = None
    
    def on_start(self):
        """Login sebagai guru bidang studi"""
        response = self.client.post("/api/auth/login", json={
            "email_sekolah": DATA_UJI["guru_bidang_studi"]["email"],
            "password": DATA_UJI["guru_bidang_studi"]["password"],
            "role": DATA_UJI["guru_bidang_studi"]["role"]
        }, timeout=REQUEST_TIMEOUT)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("token")
                if self.token:
                    self.client.headers.update({"Authorization": f"Bearer {self.token}"})
            except:
                pass
    
    @task(3)
    def view_dashboard(self):
        """Dashboard Guru Bidang Studi - CORE FEATURE"""
        self.client.get("/api/guru-bidang-studi/dashboard", 
                       name="/api/guru-bidang-studi/dashboard",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_mapel(self):
        """Daftar Mapel yang Diampu - CORE FEATURE"""
        self.client.get("/api/guru-bidang-studi/atur-penilaian/mapel", 
                       name="/api/guru-bidang-studi/atur-penilaian/mapel",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_kelas(self):
        """Daftar Kelas yang Diampu - CORE FEATURE"""
        self.client.get("/api/guru-bidang-studi/atur-penilaian/kelas",
                       name="/api/guru-bidang-studi/atur-penilaian/kelas",
                       timeout=REQUEST_TIMEOUT)
    
    @task(2)
    def view_kelas_by_mapel(self):
        """Kelas by Mapel - CORE FEATURE (mapel_id=8 = Bahasa Inggris)"""
        self.client.get(f"/api/guru-bidang-studi/atur-penilaian/kelas-by-mapel?mapel_id={DATA_UJI['mapel_id']}",
                       name="/api/guru-bidang-studi/atur-penilaian/kelas-by-mapel",
                       timeout=REQUEST_TIMEOUT)
    
    @task(1)
    def view_komponen_penilaian(self):
        """Komponen Penilaian - CORE FEATURE"""
        self.client.get("/api/guru-bidang-studi/atur-penilaian/komponen",
                       name="/api/guru-bidang-studi/atur-penilaian/komponen",
                       timeout=REQUEST_TIMEOUT)


# ═════════════════════════════════════════════════════════════════════════════
# 4. LOGIN USER
# ═════════════════════════════════════════════════════════════════════════════
class LoginUser(HttpUser):
    """Testing endpoint login"""
    wait_time = between(3, 6)
    
    @task(1)
    def login_test(self):
        """Test login dengan berbagai role"""
        roles = ["guru_kelas", "admin", "guru_bidang_studi"]
        role = random.choice(roles)
        
        self.client.post("/api/auth/login", json={
            "email_sekolah": DATA_UJI[role]["email"],
            "password": DATA_UJI[role]["password"],
            "role": role
        }, name="/api/auth/login", timeout=REQUEST_TIMEOUT)