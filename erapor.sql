/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.23-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: erapor_db
-- ------------------------------------------------------
-- Server version	10.6.23-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `absensi`
--

DROP TABLE IF EXISTS `absensi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `absensi` (
  `id_absensi` int(11) NOT NULL AUTO_INCREMENT,
  `siswa_id` int(11) NOT NULL,
  `kelas_id` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `semester` enum('Ganjil','Genap') NOT NULL DEFAULT 'Genap',
  `jenis_penilaian` enum('PTS','PAS') NOT NULL DEFAULT 'PAS',
  `sakit` int(11) DEFAULT NULL,
  `izin` int(11) DEFAULT NULL,
  `alpha` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_absensi`),
  KEY `siswa_id` (`siswa_id`),
  KEY `kelas_id` (`kelas_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `absensi_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`),
  CONSTRAINT `absensi_ibfk_2` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`),
  CONSTRAINT `absensi_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `absensi`
--

LOCK TABLES `absensi` WRITE;
/*!40000 ALTER TABLE `absensi` DISABLE KEYS */;
INSERT INTO `absensi` VALUES (8,24,52,11,'Ganjil','PTS',1,0,0,'2025-12-30 17:32:42','2025-12-30 17:32:42');
/*!40000 ALTER TABLE `absensi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `arsip_rapor`
--

DROP TABLE IF EXISTS `arsip_rapor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `arsip_rapor` (
  `id_arsip_rapor` int(11) NOT NULL AUTO_INCREMENT,
  `id_siswa` int(11) NOT NULL,
  `id_tahun_ajaran` int(11) NOT NULL,
  `semester` enum('Ganjil','Genap') NOT NULL,
  `jenis` enum('PTS','PAS') NOT NULL,
  `data_rapor` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`data_rapor`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_arsip_rapor`),
  UNIQUE KEY `unique_rapor` (`id_siswa`,`id_tahun_ajaran`,`semester`,`jenis`),
  KEY `id_tahun_ajaran` (`id_tahun_ajaran`),
  CONSTRAINT `arsip_rapor_ibfk_1` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`),
  CONSTRAINT `arsip_rapor_ibfk_2` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `arsip_rapor`
--

LOCK TABLES `arsip_rapor` WRITE;
/*!40000 ALTER TABLE `arsip_rapor` DISABLE KEYS */;
INSERT INTO `arsip_rapor` VALUES (29,24,11,'Ganjil','PTS','{\"akademik\":[{\"kode_mapel\":\"BINDO\",\"nama_mapel\":\"Bahasa Indonesia\",\"nilai\":78,\"deskripsi\":\"Cukup\"},{\"kode_mapel\":\"IPAS\",\"nama_mapel\":\"Ilmu Pengetahuan Alam dan Sosial\",\"nilai\":100,\"deskripsi\":\"Sempurna\"},{\"kode_mapel\":\"KKA\",\"nama_mapel\":\"Koding dan Kecerdasan Artifisial\",\"nilai\":95,\"deskripsi\":\"Sempurna\"},{\"kode_mapel\":\"MTK\",\"nama_mapel\":\"Matematika\",\"nilai\":90,\"deskripsi\":\"Bagus\"},{\"kode_mapel\":\"PAIBP\",\"nama_mapel\":\"Pendidikan Agama Islam\",\"nilai\":85,\"deskripsi\":\"Bagus\"},{\"kode_mapel\":\"SBM\",\"nama_mapel\":\"Seni Budaya Melayu\",\"nilai\":80,\"deskripsi\":\"Sempurna\"},{\"kode_mapel\":\"SENI\",\"nama_mapel\":\"Seni Tari\",\"nilai\":83,\"deskripsi\":\"Sempurna\"},{\"kode_mapel\":\"ATZ\",\"nama_mapel\":\"Al-Qur\'an Tahfizt\",\"nilai\":70,\"deskripsi\":\"Bagus\"},{\"kode_mapel\":\"AT\",\"nama_mapel\":\"Al-Qur\'an Tilawah\",\"nilai\":57,\"deskripsi\":\"Sangat Baik\"},{\"kode_mapel\":\"BARAB\",\"nama_mapel\":\"Bahasa Arab\",\"nilai\":80,\"deskripsi\":\"Boleh Juga\"},{\"kode_mapel\":\"BING\",\"nama_mapel\":\"Bahasa Inggris\",\"nilai\":95,\"deskripsi\":\"Baik\"},{\"kode_mapel\":\"PJOK\",\"nama_mapel\":\"Pendidikan Jasmani, Olahraga, dan Kesehatan\",\"nilai\":90,\"deskripsi\":\"Boleh juga\"}],\"kokurikuler\":{\"nilai_mutabaah\":89,\"nilai_bpi\":0,\"nilai_literasi\":0,\"nilai_proyek\":0,\"nama_judul_proyek\":null},\"absensi\":{\"sakit\":1,\"izin\":0,\"alpha\":0},\"ekskul\":[],\"catatan_wali_kelas\":\"Lumayan baugs\",\"naik_tingkat\":null}','2025-12-31 09:40:59'),(31,24,11,'Ganjil','PAS','{\"akademik\":[{\"kode_mapel\":\"BINDO\",\"nama_mapel\":\"Bahasa Indonesia\",\"nilai\":78,\"deskripsi\":\"Cukup\"}],\"kokurikuler\":{\"nilai_mutabaah\":null,\"nilai_bpi\":null,\"nilai_literasi\":null,\"nilai_proyek\":null,\"nama_judul_proyek\":null},\"absensi\":{\"sakit\":0,\"izin\":0,\"alpha\":0},\"ekskul\":[],\"catatan_wali_kelas\":\"\",\"naik_tingkat\":null}','2025-12-30 10:20:32');
/*!40000 ALTER TABLE `arsip_rapor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aspek_kokurikuler`
--

DROP TABLE IF EXISTS `aspek_kokurikuler`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `aspek_kokurikuler` (
  `id_aspek_kokurikuler` int(11) NOT NULL AUTO_INCREMENT,
  `kode` varchar(50) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `urutan` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_aspek_kokurikuler`),
  UNIQUE KEY `kode` (`kode`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aspek_kokurikuler`
--

LOCK TABLES `aspek_kokurikuler` WRITE;
/*!40000 ALTER TABLE `aspek_kokurikuler` DISABLE KEYS */;
INSERT INTO `aspek_kokurikuler` VALUES (1,'MTB','Mutaba\'ah Yaumiyah',NULL,'2025-12-18 18:04:15'),(2,'LTR','Literasi',NULL,'2025-12-18 18:04:15'),(3,'BPI','BPI',NULL,'2025-12-18 18:04:15'),(4,'PRJ','Proyek',NULL,'2025-12-18 18:04:15');
/*!40000 ALTER TABLE `aspek_kokurikuler` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catatan_wali_kelas`
--

DROP TABLE IF EXISTS `catatan_wali_kelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `catatan_wali_kelas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `siswa_id` int(11) NOT NULL,
  `kelas_id` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `semester` enum('Ganjil','Genap') NOT NULL,
  `jenis_penilaian` enum('PTS','PAS') NOT NULL DEFAULT 'PAS',
  `catatan_wali_kelas` text NOT NULL,
  `naik_tingkat` enum('ya','tidak') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_siswa_kelas_ta_semester` (`siswa_id`,`kelas_id`,`tahun_ajaran_id`,`semester`),
  UNIQUE KEY `unique_catatan` (`siswa_id`,`tahun_ajaran_id`,`semester`,`jenis_penilaian`),
  KEY `kelas_id` (`kelas_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `catatan_wali_kelas_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE,
  CONSTRAINT `catatan_wali_kelas_ibfk_2` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `catatan_wali_kelas_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catatan_wali_kelas`
--

LOCK TABLES `catatan_wali_kelas` WRITE;
/*!40000 ALTER TABLE `catatan_wali_kelas` DISABLE KEYS */;
INSERT INTO `catatan_wali_kelas` VALUES (16,24,52,11,'Ganjil','PTS','Lumayan baugs',NULL,'2025-12-30 10:34:06','2025-12-30 10:34:06');
/*!40000 ALTER TABLE `catatan_wali_kelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ekstrakurikuler`
--

DROP TABLE IF EXISTS `ekstrakurikuler`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ekstrakurikuler` (
  `id_ekskul` int(11) NOT NULL AUTO_INCREMENT,
  `nama_ekskul` varchar(255) NOT NULL,
  `nama_pembina` varchar(255) DEFAULT NULL,
  `keterangan` text DEFAULT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_ekskul`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `ekstrakurikuler_ibfk_1` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ekstrakurikuler`
--

LOCK TABLES `ekstrakurikuler` WRITE;
/*!40000 ALTER TABLE `ekstrakurikuler` DISABLE KEYS */;
INSERT INTO `ekstrakurikuler` VALUES (9,'Basket','Eko',NULL,11,'2025-12-29 14:00:36','2025-12-29 14:00:36'),(10,'Sepak Bola','Rahmat',NULL,11,'2025-12-29 14:01:23','2025-12-29 14:01:23'),(11,'Voli','Rahmat',NULL,11,'2025-12-29 14:02:26','2025-12-29 14:02:26');
/*!40000 ALTER TABLE `ekstrakurikuler` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `guru`
--

DROP TABLE IF EXISTS `guru`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `guru` (
  `id_guru` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `niy` varchar(20) NOT NULL,
  `nuptk` varchar(30) NOT NULL,
  `tempat_lahir` varchar(100) DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `no_telepon` varchar(20) DEFAULT NULL,
  `foto_path` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_guru`),
  UNIQUE KEY `nip` (`niy`),
  UNIQUE KEY `unique_nuptk` (`nuptk`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `guru_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guru`
--

LOCK TABLES `guru` WRITE;
/*!40000 ALTER TABLE `guru` DISABLE KEYS */;
INSERT INTO `guru` VALUES (1,1,'0012345678','00000123323','Batam',NULL,'Laki-laki','Batu Aji','08993966755','/uploads/profil_1765769808165-297451781.jpg','2025-12-04 21:55:19','2025-12-15 16:26:23'),(2,2,'00890234223','000000231324398','Batam','2006-02-04','Laki-laki','Batui Aji','08993455234',NULL,'2025-12-04 22:09:58','2025-12-04 22:09:58'),(3,3,'1234567190','1223435676','Jakarta','1990-07-08','Perempuan','Jl. Merdeka No. 1','81234567891',NULL,'2025-12-04 22:39:05','2025-12-04 22:39:05'),(4,4,'1234567891','7645321456','Bandung','1990-07-09','Laki-laki','Jl. Sudirman No. 2','81234567892',NULL,'2025-12-04 22:39:05','2025-12-04 22:39:05'),(5,5,'1234567892','7645321656','Surabaya','1990-07-10','Perempuan','Jl. Pahlawan No. 3','81234567893',NULL,'2025-12-04 22:39:05','2025-12-04 22:39:05'),(6,6,'1234567893','7645311456','Medan','1990-07-11','Laki-laki','Jl. Diponegoro No. 4','81234567894',NULL,'2025-12-04 22:39:05','2025-12-04 22:39:05'),(7,7,'00111222244444','9876543210784654','Batam','2006-06-06','Laki-laki','Batu Aji','08667543455',NULL,'2025-12-07 12:16:35','2025-12-07 12:16:35'),(8,8,'003322445543','000005433432232','Batam','2003-02-11','Perempuan','Batam Centre ddlkj','08221143821','uploads/profil_1766347921880-319997632.png','2025-12-10 10:26:43','2025-12-22 03:12:01'),(9,9,'0011111111111111','11111111111111111122','Batam','2004-01-04','Perempuan','Batu Aji','08111222211111','uploads/profil_1766236658384-123163362.png','2025-12-11 19:31:58','2025-12-20 20:17:38'),(10,10,'00332221223','000022343312231','Batam','2005-01-31','Laki-laki','Batu Aji','083344332322',NULL,'2025-12-13 21:56:00','2025-12-13 21:56:00'),(11,11,'001232132142341','000003442543342','Batam',NULL,'Laki-laki','Batu ','081234569890','/uploads/profil_1765782378204-574841658.jpg','2025-12-14 21:32:26','2025-12-15 16:26:23'),(12,12,'0033322232323','000005433112232','Batam','2005-02-16','Laki-laki','Batu Aji','08993411134',NULL,'2025-12-15 14:10:52','2025-12-15 14:10:52'),(13,13,'1232143321','1233241232131','Batam','2005-06-29','Laki-laki','Batam Centre','9080983432',NULL,'2025-12-29 15:46:14','2025-12-29 15:46:14');
/*!40000 ALTER TABLE `guru` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `guru_kelas`
--

DROP TABLE IF EXISTS `guru_kelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `guru_kelas` (
  `id_guru_kelas` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `kelas_id` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_guru_kelas`),
  UNIQUE KEY `unique_kelas_ta` (`kelas_id`,`tahun_ajaran_id`),
  KEY `user_id` (`user_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `guru_kelas_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `guru_kelas_ibfk_2` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `guru_kelas_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guru_kelas`
--

LOCK TABLES `guru_kelas` WRITE;
/*!40000 ALTER TABLE `guru_kelas` DISABLE KEYS */;
INSERT INTO `guru_kelas` VALUES (9,10,52,11,'2025-12-29 13:36:55','2025-12-29 13:36:55');
/*!40000 ALTER TABLE `guru_kelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `judul_proyek_per_tahun_ajaran`
--

DROP TABLE IF EXISTS `judul_proyek_per_tahun_ajaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `judul_proyek_per_tahun_ajaran` (
  `id_judul_proyek` int(11) NOT NULL AUTO_INCREMENT,
  `id_tahun_ajaran` int(11) NOT NULL,
  `judul` varchar(255) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_judul_proyek`),
  UNIQUE KEY `unique_ta` (`id_tahun_ajaran`),
  CONSTRAINT `judul_proyek_per_tahun_ajaran_ibfk_1` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `judul_proyek_per_tahun_ajaran`
--

LOCK TABLES `judul_proyek_per_tahun_ajaran` WRITE;
/*!40000 ALTER TABLE `judul_proyek_per_tahun_ajaran` DISABLE KEYS */;
/*!40000 ALTER TABLE `judul_proyek_per_tahun_ajaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kategori_grade_kokurikuler`
--

DROP TABLE IF EXISTS `kategori_grade_kokurikuler`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kategori_grade_kokurikuler` (
  `id_kategori_grade_kokurikuler` int(11) NOT NULL AUTO_INCREMENT,
  `id_aspek_kokurikuler` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `semester` varchar(10) NOT NULL,
  `rentang_min` decimal(5,2) NOT NULL,
  `rentang_max` decimal(5,2) NOT NULL,
  `grade` char(1) NOT NULL,
  `urutan` int(11) DEFAULT NULL,
  `deskripsi` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_kategori_grade_kokurikuler`),
  KEY `id_aspek_kokurikuler` (`id_aspek_kokurikuler`),
  CONSTRAINT `kategori_grade_kokurikuler_ibfk_1` FOREIGN KEY (`id_aspek_kokurikuler`) REFERENCES `aspek_kokurikuler` (`id_aspek_kokurikuler`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kategori_grade_kokurikuler`
--

LOCK TABLES `kategori_grade_kokurikuler` WRITE;
/*!40000 ALTER TABLE `kategori_grade_kokurikuler` DISABLE KEYS */;
INSERT INTO `kategori_grade_kokurikuler` VALUES (36,1,11,'Ganjil',85.00,100.00,'A',0,'Sempurna','2025-12-29 16:49:22','2025-12-29 16:49:22'),(37,1,11,'Ganjil',80.00,84.00,'B',0,'Baik','2025-12-29 16:49:45','2025-12-29 16:49:45'),(38,1,11,'Ganjil',75.00,79.00,'C',0,'Cukup','2025-12-29 16:50:21','2025-12-29 16:50:21'),(39,1,11,'Ganjil',0.00,74.00,'D',0,'Buruk','2025-12-29 16:50:42','2025-12-29 16:50:42'),(40,2,11,'Ganjil',85.00,100.00,'A',0,'Sempurna','2025-12-29 16:51:35','2025-12-29 16:51:35'),(41,2,11,'Ganjil',80.00,84.00,'B',0,'Baik juga','2025-12-29 16:51:54','2025-12-29 16:51:54'),(42,2,11,'Ganjil',75.00,79.00,'C',0,'Cukup','2025-12-29 16:52:10','2025-12-29 16:52:10'),(43,2,11,'Ganjil',0.00,74.00,'D',0,'Buruk ','2025-12-29 16:53:55','2025-12-29 16:53:55'),(44,3,11,'Ganjil',85.00,100.00,'A',0,'Sempurna','2025-12-29 16:55:00','2025-12-29 16:55:20'),(45,3,11,'Ganjil',80.00,84.00,'B',0,'Baik','2025-12-29 16:55:48','2025-12-29 16:55:48'),(46,3,11,'Ganjil',75.00,79.00,'C',0,'Cukup\n','2025-12-29 16:56:20','2025-12-29 16:56:20'),(47,3,11,'Ganjil',0.00,74.00,'D',0,'Sangat Buruk','2025-12-29 17:23:23','2025-12-29 17:23:23'),(48,4,11,'Ganjil',85.00,100.00,'A',0,'Sempurna','2025-12-29 17:24:24','2025-12-29 17:24:24'),(49,4,11,'Ganjil',80.00,84.00,'B',0,'Baik','2025-12-29 17:24:50','2025-12-29 17:24:50'),(50,4,11,'Ganjil',75.00,79.00,'C',0,'Cukup','2025-12-29 17:25:21','2025-12-29 17:26:40'),(53,4,11,'Ganjil',0.00,74.00,'D',0,'Sangat Buruk','2026-01-01 17:33:27','2026-01-01 17:33:27');
/*!40000 ALTER TABLE `kategori_grade_kokurikuler` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kelas`
--

DROP TABLE IF EXISTS `kelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kelas` (
  `id_kelas` int(11) NOT NULL AUTO_INCREMENT,
  `nama_kelas` varchar(50) NOT NULL,
  `fase` enum('A','B','C') NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tahun_ajaran_id` int(11) NOT NULL,
  PRIMARY KEY (`id_kelas`),
  UNIQUE KEY `unique_nama_kelas_per_tahun` (`nama_kelas`,`tahun_ajaran_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `kelas_ibfk_1` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kelas`
--

LOCK TABLES `kelas` WRITE;
/*!40000 ALTER TABLE `kelas` DISABLE KEYS */;
INSERT INTO `kelas` VALUES (52,'1 A','A','2025-12-29 20:36:41','2025-12-29 20:36:55',11);
/*!40000 ALTER TABLE `kelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `komponen_penilaian`
--

DROP TABLE IF EXISTS `komponen_penilaian`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `komponen_penilaian` (
  `id_komponen` int(11) NOT NULL AUTO_INCREMENT,
  `nama_komponen` varchar(50) NOT NULL,
  `urutan` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_komponen`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `komponen_penilaian`
--

LOCK TABLES `komponen_penilaian` WRITE;
/*!40000 ALTER TABLE `komponen_penilaian` DISABLE KEYS */;
INSERT INTO `komponen_penilaian` VALUES (1,'UH1',1,'2025-12-30 09:16:07','2025-12-30 09:16:07'),(2,'UH2',2,'2025-12-30 09:16:07','2025-12-30 09:16:07'),(3,'UH3',3,'2025-12-30 09:16:07','2025-12-30 09:16:07'),(4,'UH4',4,'2025-12-30 09:16:07','2025-12-30 09:16:07'),(5,'UH5',5,'2025-12-30 09:16:07','2025-12-30 09:16:07'),(6,'PTS',6,'2025-12-30 09:16:07','2025-12-30 09:23:03'),(7,'PAS',7,'2025-12-30 09:16:07','2025-12-30 09:23:03');
/*!40000 ALTER TABLE `komponen_penilaian` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `konfigurasi_mapel_komponen`
--

DROP TABLE IF EXISTS `konfigurasi_mapel_komponen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `konfigurasi_mapel_komponen` (
  `id_config` int(11) NOT NULL AUTO_INCREMENT,
  `mapel_id` int(11) NOT NULL,
  `komponen_id` int(11) NOT NULL,
  `bobot` decimal(5,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_config`),
  KEY `mapel_id` (`mapel_id`),
  KEY `komponen_id` (`komponen_id`),
  CONSTRAINT `konfigurasi_mapel_komponen_ibfk_1` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran` (`id_mata_pelajaran`),
  CONSTRAINT `konfigurasi_mapel_komponen_ibfk_2` FOREIGN KEY (`komponen_id`) REFERENCES `komponen_penilaian` (`id_komponen`)
) ENGINE=InnoDB AUTO_INCREMENT=491 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `konfigurasi_mapel_komponen`
--

LOCK TABLES `konfigurasi_mapel_komponen` WRITE;
/*!40000 ALTER TABLE `konfigurasi_mapel_komponen` DISABLE KEYS */;
INSERT INTO `konfigurasi_mapel_komponen` VALUES (323,41,1,0.00,1,'2025-12-30 09:17:32','2025-12-30 09:17:32'),(324,41,2,0.00,1,'2025-12-30 09:17:32','2025-12-30 09:17:32'),(325,41,3,0.00,1,'2025-12-30 09:17:32','2025-12-30 09:17:32'),(326,41,4,0.00,1,'2025-12-30 09:17:32','2025-12-30 09:17:32'),(327,41,5,0.00,1,'2025-12-30 09:17:32','2025-12-30 09:17:32'),(328,41,6,100.00,1,'2025-12-30 09:17:32','2025-12-30 09:17:32'),(329,41,7,0.00,1,'2025-12-30 09:17:32','2025-12-30 09:17:32'),(337,46,1,0.00,1,'2025-12-30 09:17:41','2025-12-30 09:17:41'),(338,46,2,0.00,1,'2025-12-30 09:17:41','2025-12-30 09:17:41'),(339,46,3,0.00,1,'2025-12-30 09:17:41','2025-12-30 09:17:41'),(340,46,4,0.00,1,'2025-12-30 09:17:41','2025-12-30 09:17:41'),(341,46,5,0.00,1,'2025-12-30 09:17:41','2025-12-30 09:17:41'),(342,46,6,100.00,1,'2025-12-30 09:17:41','2025-12-30 09:17:41'),(343,46,7,0.00,1,'2025-12-30 09:17:41','2025-12-30 09:17:41'),(351,39,1,0.00,1,'2025-12-30 09:17:48','2025-12-30 09:17:48'),(352,39,2,0.00,1,'2025-12-30 09:17:48','2025-12-30 09:17:48'),(353,39,3,0.00,1,'2025-12-30 09:17:48','2025-12-30 09:17:48'),(354,39,4,0.00,1,'2025-12-30 09:17:48','2025-12-30 09:17:48'),(355,39,5,0.00,1,'2025-12-30 09:17:48','2025-12-30 09:17:48'),(356,39,6,100.00,1,'2025-12-30 09:17:48','2025-12-30 09:17:48'),(357,39,7,0.00,1,'2025-12-30 09:17:48','2025-12-30 09:17:48'),(365,36,1,0.00,1,'2025-12-30 09:17:55','2025-12-30 09:17:55'),(366,36,2,0.00,1,'2025-12-30 09:17:55','2025-12-30 09:17:55'),(367,36,3,0.00,1,'2025-12-30 09:17:55','2025-12-30 09:17:55'),(368,36,4,0.00,1,'2025-12-30 09:17:55','2025-12-30 09:17:55'),(369,36,5,0.00,1,'2025-12-30 09:17:55','2025-12-30 09:17:55'),(370,36,6,100.00,1,'2025-12-30 09:17:55','2025-12-30 09:17:55'),(371,36,7,0.00,1,'2025-12-30 09:17:55','2025-12-30 09:17:55'),(379,38,1,0.00,1,'2025-12-30 09:18:01','2025-12-30 09:18:01'),(380,38,2,0.00,1,'2025-12-30 09:18:01','2025-12-30 09:18:01'),(381,38,3,0.00,1,'2025-12-30 09:18:01','2025-12-30 09:18:01'),(382,38,4,0.00,1,'2025-12-30 09:18:01','2025-12-30 09:18:01'),(383,38,5,0.00,1,'2025-12-30 09:18:01','2025-12-30 09:18:01'),(384,38,6,100.00,1,'2025-12-30 09:18:01','2025-12-30 09:18:01'),(385,38,7,0.00,1,'2025-12-30 09:18:01','2025-12-30 09:18:01'),(393,45,1,0.00,1,'2025-12-30 09:18:17','2025-12-30 09:18:17'),(394,45,2,0.00,1,'2025-12-30 09:18:17','2025-12-30 09:18:17'),(395,45,3,0.00,1,'2025-12-30 09:18:17','2025-12-30 09:18:17'),(396,45,4,0.00,1,'2025-12-30 09:18:17','2025-12-30 09:18:17'),(397,45,5,0.00,1,'2025-12-30 09:18:17','2025-12-30 09:18:17'),(398,45,6,100.00,1,'2025-12-30 09:18:17','2025-12-30 09:18:17'),(399,45,7,0.00,1,'2025-12-30 09:18:17','2025-12-30 09:18:17'),(407,42,1,0.00,1,'2025-12-30 09:19:28','2025-12-30 09:19:28'),(408,42,2,0.00,1,'2025-12-30 09:19:28','2025-12-30 09:19:28'),(409,42,3,0.00,1,'2025-12-30 09:19:28','2025-12-30 09:19:28'),(410,42,4,0.00,1,'2025-12-30 09:19:28','2025-12-30 09:19:28'),(411,42,5,0.00,1,'2025-12-30 09:19:28','2025-12-30 09:19:28'),(412,42,6,100.00,1,'2025-12-30 09:19:28','2025-12-30 09:19:28'),(413,42,7,0.00,1,'2025-12-30 09:19:28','2025-12-30 09:19:28'),(414,37,1,0.00,1,'2025-12-30 09:48:17','2025-12-30 09:48:17'),(415,37,2,0.00,1,'2025-12-30 09:48:17','2025-12-30 09:48:17'),(416,37,3,0.00,1,'2025-12-30 09:48:17','2025-12-30 09:48:17'),(417,37,4,0.00,1,'2025-12-30 09:48:17','2025-12-30 09:48:17'),(418,37,5,0.00,1,'2025-12-30 09:48:17','2025-12-30 09:48:17'),(419,37,6,50.00,1,'2025-12-30 09:48:17','2025-12-30 09:48:17'),(420,37,7,50.00,1,'2025-12-30 09:48:17','2025-12-30 09:48:17'),(456,48,1,0.00,1,'2025-12-30 12:46:15','2025-12-30 12:46:15'),(457,48,2,0.00,1,'2025-12-30 12:46:15','2025-12-30 12:46:15'),(458,48,3,0.00,1,'2025-12-30 12:46:15','2025-12-30 12:46:15'),(459,48,4,0.00,1,'2025-12-30 12:46:15','2025-12-30 12:46:15'),(460,48,5,0.00,1,'2025-12-30 12:46:15','2025-12-30 12:46:15'),(461,48,6,100.00,1,'2025-12-30 12:46:15','2025-12-30 12:46:15'),(462,48,7,0.00,1,'2025-12-30 12:46:15','2025-12-30 12:46:15'),(463,47,1,0.00,1,'2025-12-30 12:46:25','2025-12-30 12:46:25'),(464,47,2,0.00,1,'2025-12-30 12:46:25','2025-12-30 12:46:25'),(465,47,3,0.00,1,'2025-12-30 12:46:25','2025-12-30 12:46:25'),(466,47,4,0.00,1,'2025-12-30 12:46:25','2025-12-30 12:46:25'),(467,47,5,0.00,1,'2025-12-30 12:46:25','2025-12-30 12:46:25'),(468,47,6,100.00,1,'2025-12-30 12:46:25','2025-12-30 12:46:25'),(469,47,7,0.00,1,'2025-12-30 12:46:25','2025-12-30 12:46:25'),(470,44,1,0.00,1,'2025-12-30 12:46:36','2025-12-30 12:46:36'),(471,44,2,0.00,1,'2025-12-30 12:46:36','2025-12-30 12:46:36'),(472,44,3,0.00,1,'2025-12-30 12:46:36','2025-12-30 12:46:36'),(473,44,4,0.00,1,'2025-12-30 12:46:36','2025-12-30 12:46:36'),(474,44,5,0.00,1,'2025-12-30 12:46:36','2025-12-30 12:46:36'),(475,44,6,100.00,1,'2025-12-30 12:46:36','2025-12-30 12:46:36'),(476,44,7,0.00,1,'2025-12-30 12:46:36','2025-12-30 12:46:36'),(477,43,1,0.00,1,'2025-12-30 12:46:50','2025-12-30 12:46:50'),(478,43,2,0.00,1,'2025-12-30 12:46:50','2025-12-30 12:46:50'),(479,43,3,0.00,1,'2025-12-30 12:46:50','2025-12-30 12:46:50'),(480,43,4,0.00,1,'2025-12-30 12:46:50','2025-12-30 12:46:50'),(481,43,5,0.00,1,'2025-12-30 12:46:50','2025-12-30 12:46:50'),(482,43,6,100.00,1,'2025-12-30 12:46:50','2025-12-30 12:46:50'),(483,43,7,0.00,1,'2025-12-30 12:46:50','2025-12-30 12:46:50'),(484,40,1,0.00,1,'2025-12-30 12:46:57','2025-12-30 12:46:57'),(485,40,2,0.00,1,'2025-12-30 12:46:57','2025-12-30 12:46:57'),(486,40,3,0.00,1,'2025-12-30 12:46:57','2025-12-30 12:46:57'),(487,40,4,0.00,1,'2025-12-30 12:46:57','2025-12-30 12:46:57'),(488,40,5,0.00,1,'2025-12-30 12:46:57','2025-12-30 12:46:57'),(489,40,6,100.00,1,'2025-12-30 12:46:57','2025-12-30 12:46:57'),(490,40,7,0.00,1,'2025-12-30 12:46:57','2025-12-30 12:46:57');
/*!40000 ALTER TABLE `konfigurasi_mapel_komponen` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `konfigurasi_nilai_rapor`
--

DROP TABLE IF EXISTS `konfigurasi_nilai_rapor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `konfigurasi_nilai_rapor` (
  `id_config` int(11) NOT NULL AUTO_INCREMENT,
  `mapel_id` int(11) DEFAULT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `min_nilai` int(11) DEFAULT NULL,
  `max_nilai` int(11) NOT NULL,
  `deskripsi` text NOT NULL,
  `urutan` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_config`),
  KEY `mapel_id` (`mapel_id`),
  CONSTRAINT `konfigurasi_nilai_rapor_ibfk_1` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran` (`id_mata_pelajaran`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `konfigurasi_nilai_rapor`
--

LOCK TABLES `konfigurasi_nilai_rapor` WRITE;
/*!40000 ALTER TABLE `konfigurasi_nilai_rapor` DISABLE KEYS */;
INSERT INTO `konfigurasi_nilai_rapor` VALUES (71,37,11,85,100,'Sempurna',0,1,'2025-12-29 17:46:19','2025-12-29 17:46:19'),(72,37,11,80,84,'Baik',0,1,'2025-12-29 17:46:37','2025-12-29 17:46:37'),(73,37,11,75,79,'Cukup',0,1,'2025-12-29 17:46:48','2025-12-29 17:46:48'),(74,37,11,0,74,'Sangat buruk',0,1,'2025-12-29 17:47:29','2025-12-29 17:47:29'),(75,41,11,85,100,'Sempurna',0,1,'2025-12-29 17:48:09','2025-12-29 17:48:09'),(76,41,11,80,84,'Baik',0,1,'2025-12-29 17:49:22','2025-12-29 17:49:22'),(77,41,11,75,79,'Cukup',0,1,'2025-12-29 17:49:34','2025-12-29 17:49:34'),(78,41,11,0,74,'Sangat buruk',0,1,'2025-12-29 17:49:56','2025-12-29 17:49:56'),(79,46,11,0,100,'Sempurna',0,1,'2025-12-29 17:50:14','2025-12-30 08:29:50'),(80,NULL,11,0,100,'Bagus banget',0,1,'2025-12-30 08:29:30','2025-12-30 08:29:30'),(81,39,11,0,100,'Bagus',0,1,'2025-12-30 08:29:57','2025-12-30 08:29:57'),(82,36,11,0,100,'Bagus',0,1,'2025-12-30 08:30:06','2025-12-30 08:30:06'),(83,38,11,0,100,'Bagus',0,1,'2025-12-30 08:30:16','2025-12-30 08:30:16'),(84,45,11,0,100,'Sempurna',0,1,'2025-12-30 08:46:53','2025-12-30 08:46:53'),(85,42,11,0,100,'Sempurna',0,1,'2025-12-30 08:47:02','2025-12-30 08:47:02'),(86,48,11,0,100,'Bagus',1,1,'2025-12-30 10:35:45','2025-12-30 10:35:45'),(87,47,11,0,100,'Sangat Baik',1,1,'2025-12-30 10:35:59','2025-12-30 10:35:59'),(88,44,11,0,100,'Boleh Juga',1,1,'2025-12-30 10:36:11','2025-12-30 10:36:11'),(89,43,11,0,100,'Baik',1,1,'2025-12-30 10:36:21','2025-12-30 10:36:21'),(90,40,11,0,100,'Boleh juga',1,1,'2025-12-30 10:36:30','2025-12-30 10:36:30');
/*!40000 ALTER TABLE `konfigurasi_nilai_rapor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mata_pelajaran`
--

DROP TABLE IF EXISTS `mata_pelajaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mata_pelajaran` (
  `id_mata_pelajaran` int(11) NOT NULL AUTO_INCREMENT,
  `tahun_ajaran_id` int(11) NOT NULL,
  `nama_mapel` varchar(255) NOT NULL,
  `kode_mapel` varchar(10) NOT NULL,
  `urutan_rapor` int(11) DEFAULT NULL,
  `jenis` enum('wajib','pilihan') NOT NULL,
  `kurikulum` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_mata_pelajaran`),
  UNIQUE KEY `unique_kode_tahun` (`kode_mapel`,`tahun_ajaran_id`),
  KEY `fk_mata_pelajaran_tahun_ajaran` (`tahun_ajaran_id`),
  KEY `idx_urutan_rapor` (`urutan_rapor`,`tahun_ajaran_id`),
  CONSTRAINT `fk_mata_pelajaran_tahun_ajaran` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mata_pelajaran`
--

LOCK TABLES `mata_pelajaran` WRITE;
/*!40000 ALTER TABLE `mata_pelajaran` DISABLE KEYS */;
INSERT INTO `mata_pelajaran` VALUES (36,11,'Agama','PAIBP',1,'wajib','Kurikulum Merdeka','2025-12-29 20:42:15','2025-12-31 23:54:32'),(37,11,'Bahasa Indonesia','BINDO',2,'wajib','Kurikulum Merdeka','2025-12-29 20:42:58','2025-12-31 23:55:11'),(38,11,'Pendidikan Pancasila','PP',3,'wajib','Kurikulum Merdeka','2025-12-29 20:55:44','2025-12-31 23:55:21'),(39,11,'Matematika','MTK',4,'wajib','Kurikulum Merdeka','2025-12-29 20:55:55','2025-12-31 23:55:27'),(40,11,'Pendidikan Jasmani, Olahraga, dan Kesehatan','PJOK',5,'pilihan','Kurikulum Merdeka','2025-12-29 20:56:31','2025-12-31 23:55:32'),(41,11,'Ilmu Pengetahuan Alam dan Sosial','IPAS',6,'wajib','Kurikulum Merdeka','2025-12-29 20:57:06','2025-12-31 23:55:36'),(42,11,'Seni Tari','SENI',7,'wajib','Kurikulum Merdeka','2025-12-29 20:57:49','2025-12-31 23:55:41'),(43,11,'Bahasa Inggris','BING',8,'pilihan','Kurikulum Merdeka','2025-12-29 20:58:10','2025-12-31 23:55:45'),(44,11,'Bahasa Arab','BARAB',9,'pilihan','Kurikulum Merdeka','2025-12-29 20:58:30','2025-12-31 23:55:51'),(45,11,'Seni Budaya Melayu','SBM',10,'wajib','Kurikulum Merdeka','2025-12-29 20:58:54','2025-12-31 23:55:56'),(46,11,'Koding dan Kecerdasan Artifisial','KKA',11,'wajib','Kurikulum Merdeka','2025-12-29 20:59:19','2025-12-31 23:56:02'),(47,11,'Al-Qur\'an Tilawah','AT',12,'pilihan','Kurikulum Merdeka','2025-12-29 20:59:48','2025-12-31 23:56:08'),(48,11,'Al-Qur\'an Tahfizt','ATZ',13,'pilihan','Kurikulum Merdeka','2025-12-29 21:00:17','2025-12-31 23:56:13');
/*!40000 ALTER TABLE `mata_pelajaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nilai_detail`
--

DROP TABLE IF EXISTS `nilai_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `nilai_detail` (
  `id_nilai_detail` int(11) NOT NULL AUTO_INCREMENT,
  `siswa_id` int(11) NOT NULL,
  `mapel_id` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `komponen_id` int(11) NOT NULL,
  `nilai` int(11) DEFAULT NULL,
  `created_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_nilai_detail`),
  UNIQUE KEY `unique_nilai_siswa_mapel_komponen` (`siswa_id`,`mapel_id`,`komponen_id`,`tahun_ajaran_id`),
  KEY `mapel_id` (`mapel_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  KEY `komponen_id` (`komponen_id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  CONSTRAINT `nilai_detail_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`),
  CONSTRAINT `nilai_detail_ibfk_2` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran` (`id_mata_pelajaran`),
  CONSTRAINT `nilai_detail_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`),
  CONSTRAINT `nilai_detail_ibfk_4` FOREIGN KEY (`komponen_id`) REFERENCES `komponen_penilaian` (`id_komponen`),
  CONSTRAINT `nilai_detail_ibfk_5` FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=715 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nilai_detail`
--

LOCK TABLES `nilai_detail` WRITE;
/*!40000 ALTER TABLE `nilai_detail` DISABLE KEYS */;
INSERT INTO `nilai_detail` VALUES (568,24,37,11,1,NULL,NULL,'2025-12-30 09:48:34','2025-12-30 09:48:34'),(569,24,37,11,2,NULL,NULL,'2025-12-30 09:48:34','2025-12-30 09:48:34'),(570,24,37,11,3,NULL,NULL,'2025-12-30 09:48:34','2025-12-30 09:48:34'),(571,24,37,11,4,NULL,NULL,'2025-12-30 09:48:34','2025-12-30 09:48:34'),(572,24,37,11,5,NULL,NULL,'2025-12-30 09:48:34','2025-12-30 09:48:34'),(573,24,37,11,6,78,NULL,'2025-12-30 09:48:34','2025-12-30 09:48:34'),(574,24,37,11,7,NULL,NULL,'2025-12-30 09:48:34','2025-12-30 09:48:34'),(575,24,41,11,1,NULL,NULL,'2025-12-30 10:21:29','2025-12-30 10:21:29'),(576,24,41,11,2,NULL,NULL,'2025-12-30 10:21:29','2025-12-30 10:21:29'),(577,24,41,11,3,NULL,NULL,'2025-12-30 10:21:29','2025-12-30 10:21:29'),(578,24,41,11,4,NULL,NULL,'2025-12-30 10:21:29','2025-12-30 10:21:29'),(579,24,41,11,5,NULL,NULL,'2025-12-30 10:21:29','2025-12-30 10:21:29'),(580,24,41,11,6,100,NULL,'2025-12-30 10:21:29','2025-12-30 10:21:29'),(581,24,41,11,7,NULL,NULL,'2025-12-30 10:21:29','2025-12-30 10:21:29'),(582,24,46,11,1,NULL,NULL,'2025-12-30 10:21:42','2025-12-30 10:21:42'),(583,24,46,11,2,NULL,NULL,'2025-12-30 10:21:42','2025-12-30 10:21:42'),(584,24,46,11,3,NULL,NULL,'2025-12-30 10:21:42','2025-12-30 10:21:42'),(585,24,46,11,4,NULL,NULL,'2025-12-30 10:21:42','2025-12-30 10:21:42'),(586,24,46,11,5,NULL,NULL,'2025-12-30 10:21:42','2025-12-30 10:21:42'),(587,24,46,11,6,95,NULL,'2025-12-30 10:21:42','2025-12-30 10:21:42'),(588,24,46,11,7,NULL,NULL,'2025-12-30 10:21:42','2025-12-30 10:21:42'),(589,24,39,11,1,NULL,NULL,'2025-12-30 10:21:52','2025-12-30 10:21:52'),(590,24,39,11,2,NULL,NULL,'2025-12-30 10:21:52','2025-12-30 10:21:52'),(591,24,39,11,3,NULL,NULL,'2025-12-30 10:21:52','2025-12-30 10:21:52'),(592,24,39,11,4,NULL,NULL,'2025-12-30 10:21:52','2025-12-30 10:21:52'),(593,24,39,11,5,NULL,NULL,'2025-12-30 10:21:52','2025-12-30 10:21:52'),(594,24,39,11,6,90,NULL,'2025-12-30 10:21:52','2025-12-30 10:21:52'),(595,24,39,11,7,NULL,NULL,'2025-12-30 10:21:52','2025-12-30 10:21:52'),(596,24,36,11,1,NULL,NULL,'2025-12-30 10:22:06','2025-12-30 10:22:06'),(597,24,36,11,2,NULL,NULL,'2025-12-30 10:22:06','2025-12-30 10:22:06'),(598,24,36,11,3,NULL,NULL,'2025-12-30 10:22:06','2025-12-30 10:22:06'),(599,24,36,11,4,NULL,NULL,'2025-12-30 10:22:06','2025-12-30 10:22:06'),(600,24,36,11,5,NULL,NULL,'2025-12-30 10:22:06','2025-12-30 10:22:06'),(601,24,36,11,6,85,NULL,'2025-12-30 10:22:06','2025-12-30 10:22:06'),(602,24,36,11,7,NULL,NULL,'2025-12-30 10:22:06','2025-12-30 10:22:06'),(603,24,45,11,1,NULL,NULL,'2025-12-30 10:23:06','2025-12-30 10:23:06'),(604,24,45,11,2,NULL,NULL,'2025-12-30 10:23:06','2025-12-30 10:23:06'),(605,24,45,11,3,NULL,NULL,'2025-12-30 10:23:06','2025-12-30 10:23:06'),(606,24,45,11,4,NULL,NULL,'2025-12-30 10:23:06','2025-12-30 10:23:06'),(607,24,45,11,5,NULL,NULL,'2025-12-30 10:23:06','2025-12-30 10:23:06'),(608,24,45,11,6,80,NULL,'2025-12-30 10:23:06','2025-12-30 10:23:06'),(609,24,45,11,7,NULL,NULL,'2025-12-30 10:23:06','2025-12-30 10:23:06'),(610,24,42,11,1,NULL,NULL,'2025-12-30 10:23:15','2025-12-30 10:23:15'),(611,24,42,11,2,NULL,NULL,'2025-12-30 10:23:15','2025-12-30 10:23:15'),(612,24,42,11,3,NULL,NULL,'2025-12-30 10:23:15','2025-12-30 10:23:15'),(613,24,42,11,4,NULL,NULL,'2025-12-30 10:23:15','2025-12-30 10:23:15'),(614,24,42,11,5,NULL,NULL,'2025-12-30 10:23:15','2025-12-30 10:23:15'),(615,24,42,11,6,83,NULL,'2025-12-30 10:23:15','2025-12-30 10:23:15'),(616,24,42,11,7,NULL,NULL,'2025-12-30 10:23:15','2025-12-30 10:23:15'),(673,24,38,11,1,NULL,10,'2025-12-31 17:28:26','2025-12-31 17:28:26'),(674,24,38,11,2,NULL,10,'2025-12-31 17:28:26','2025-12-31 17:28:26'),(675,24,38,11,3,NULL,10,'2025-12-31 17:28:26','2025-12-31 17:28:26'),(676,24,38,11,4,NULL,10,'2025-12-31 17:28:26','2025-12-31 17:28:26'),(677,24,38,11,5,NULL,10,'2025-12-31 17:28:26','2025-12-31 17:28:26'),(678,24,38,11,6,90,10,'2025-12-31 17:28:26','2025-12-31 17:28:26'),(679,24,38,11,7,NULL,10,'2025-12-31 17:28:26','2025-12-31 17:28:26'),(680,24,48,11,1,NULL,8,'2025-12-31 18:04:24','2025-12-31 18:04:24'),(681,24,48,11,2,NULL,8,'2025-12-31 18:04:24','2025-12-31 18:04:24'),(682,24,48,11,3,NULL,8,'2025-12-31 18:04:24','2025-12-31 18:04:24'),(683,24,48,11,4,NULL,8,'2025-12-31 18:04:24','2025-12-31 18:04:24'),(684,24,48,11,5,NULL,8,'2025-12-31 18:04:24','2025-12-31 18:04:24'),(685,24,48,11,6,80,8,'2025-12-31 18:04:24','2025-12-31 18:04:24'),(686,24,48,11,7,NULL,8,'2025-12-31 18:04:24','2025-12-31 18:04:24'),(687,24,47,11,1,NULL,8,'2025-12-31 18:04:59','2025-12-31 18:04:59'),(688,24,47,11,2,NULL,8,'2025-12-31 18:04:59','2025-12-31 18:04:59'),(689,24,47,11,3,NULL,8,'2025-12-31 18:04:59','2025-12-31 18:04:59'),(690,24,47,11,4,NULL,8,'2025-12-31 18:04:59','2025-12-31 18:04:59'),(691,24,47,11,5,NULL,8,'2025-12-31 18:04:59','2025-12-31 18:04:59'),(692,24,47,11,6,75,8,'2025-12-31 18:04:59','2025-12-31 18:04:59'),(693,24,47,11,7,NULL,8,'2025-12-31 18:04:59','2025-12-31 18:04:59'),(694,24,44,11,1,NULL,8,'2025-12-31 18:05:09','2025-12-31 18:05:09'),(695,24,44,11,2,NULL,8,'2025-12-31 18:05:09','2025-12-31 18:05:09'),(696,24,44,11,3,NULL,8,'2025-12-31 18:05:09','2025-12-31 18:05:09'),(697,24,44,11,4,NULL,8,'2025-12-31 18:05:09','2025-12-31 18:05:09'),(698,24,44,11,5,NULL,8,'2025-12-31 18:05:09','2025-12-31 18:05:09'),(699,24,44,11,6,84,8,'2025-12-31 18:05:09','2025-12-31 18:05:09'),(700,24,44,11,7,NULL,8,'2025-12-31 18:05:09','2025-12-31 18:05:09'),(701,24,43,11,1,NULL,8,'2025-12-31 18:05:20','2025-12-31 18:05:20'),(702,24,43,11,2,NULL,8,'2025-12-31 18:05:20','2025-12-31 18:05:20'),(703,24,43,11,3,NULL,8,'2025-12-31 18:05:20','2025-12-31 18:05:20'),(704,24,43,11,4,NULL,8,'2025-12-31 18:05:20','2025-12-31 18:05:20'),(705,24,43,11,5,NULL,8,'2025-12-31 18:05:20','2025-12-31 18:05:20'),(706,24,43,11,6,97,8,'2025-12-31 18:05:20','2025-12-31 18:05:20'),(707,24,43,11,7,NULL,8,'2025-12-31 18:05:20','2025-12-31 18:05:20'),(708,24,40,11,1,NULL,8,'2025-12-31 18:05:31','2025-12-31 18:05:31'),(709,24,40,11,2,NULL,8,'2025-12-31 18:05:31','2025-12-31 18:05:31'),(710,24,40,11,3,NULL,8,'2025-12-31 18:05:31','2025-12-31 18:05:31'),(711,24,40,11,4,NULL,8,'2025-12-31 18:05:31','2025-12-31 18:05:31'),(712,24,40,11,5,NULL,8,'2025-12-31 18:05:31','2025-12-31 18:05:31'),(713,24,40,11,6,100,8,'2025-12-31 18:05:31','2025-12-31 18:05:31'),(714,24,40,11,7,NULL,8,'2025-12-31 18:05:31','2025-12-31 18:05:31');
/*!40000 ALTER TABLE `nilai_detail` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nilai_kokurikuler`
--

DROP TABLE IF EXISTS `nilai_kokurikuler`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `nilai_kokurikuler` (
  `id_nilai_kokurikuler` int(11) NOT NULL AUTO_INCREMENT,
  `id_siswa` int(11) NOT NULL,
  `id_kelas` int(11) NOT NULL,
  `id_tahun_ajaran` int(11) NOT NULL,
  `semester` varchar(10) NOT NULL,
  `jenis_penilaian` enum('PTS','PAS') NOT NULL DEFAULT 'PAS',
  `nilai_bpi` int(11) DEFAULT NULL,
  `nilai_literasi` int(11) DEFAULT NULL,
  `nilai_mutabaah` int(11) DEFAULT NULL,
  `nilai_proyek` int(11) DEFAULT NULL,
  `id_judul_proyek` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_nilai_kokurikuler`),
  UNIQUE KEY `unique_kokurikuler` (`id_siswa`,`id_tahun_ajaran`,`semester`,`jenis_penilaian`),
  KEY `id_kelas` (`id_kelas`),
  KEY `id_tahun_ajaran` (`id_tahun_ajaran`),
  KEY `fk_judul_proyek` (`id_judul_proyek`),
  CONSTRAINT `fk_judul_proyek` FOREIGN KEY (`id_judul_proyek`) REFERENCES `judul_proyek_per_tahun_ajaran` (`id_judul_proyek`),
  CONSTRAINT `nilai_kokurikuler_ibfk_1` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`),
  CONSTRAINT `nilai_kokurikuler_ibfk_2` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`),
  CONSTRAINT `nilai_kokurikuler_ibfk_3` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nilai_kokurikuler`
--

LOCK TABLES `nilai_kokurikuler` WRITE;
/*!40000 ALTER TABLE `nilai_kokurikuler` DISABLE KEYS */;
INSERT INTO `nilai_kokurikuler` VALUES (11,24,52,11,'Ganjil','PTS',0,0,89,0,NULL,'2025-12-30 10:33:01','2025-12-30 10:33:01');
/*!40000 ALTER TABLE `nilai_kokurikuler` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nilai_rapor`
--

DROP TABLE IF EXISTS `nilai_rapor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `nilai_rapor` (
  `id_nilai_rapor` int(11) NOT NULL AUTO_INCREMENT,
  `siswa_id` int(11) NOT NULL,
  `mapel_id` int(11) NOT NULL,
  `kelas_id` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `semester` varchar(10) NOT NULL,
  `jenis_penilaian` enum('PTS','PAS') NOT NULL DEFAULT 'PAS',
  `nilai_rapor` int(3) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `created_by_user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_nilai_rapor`),
  UNIQUE KEY `unique_nilai_rapor` (`siswa_id`,`mapel_id`,`tahun_ajaran_id`,`semester`,`jenis_penilaian`),
  KEY `mapel_id` (`mapel_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `fk_nilai_rapor_kelas` (`kelas_id`),
  CONSTRAINT `fk_nilai_rapor_kelas` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nilai_rapor_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`),
  CONSTRAINT `nilai_rapor_ibfk_2` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran` (`id_mata_pelajaran`),
  CONSTRAINT `nilai_rapor_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`),
  CONSTRAINT `nilai_rapor_ibfk_4` FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nilai_rapor`
--

LOCK TABLES `nilai_rapor` WRITE;
/*!40000 ALTER TABLE `nilai_rapor` DISABLE KEYS */;
INSERT INTO `nilai_rapor` VALUES (55,24,37,52,11,'Ganjil','PTS',78,'Cukup',10,'2025-12-30 09:21:28','2025-12-30 09:48:34'),(61,24,41,52,11,'Ganjil','PTS',100,'Sempurna',10,'2025-12-30 10:21:29','2025-12-30 10:21:29'),(62,24,46,52,11,'Ganjil','PTS',95,'Sempurna',10,'2025-12-30 10:21:42','2025-12-30 10:21:42'),(63,24,39,52,11,'Ganjil','PTS',90,'Bagus',10,'2025-12-30 10:21:52','2025-12-30 10:21:52'),(64,24,36,52,11,'Ganjil','PTS',85,'Bagus',10,'2025-12-30 10:22:06','2025-12-30 10:22:06'),(65,24,45,52,11,'Ganjil','PTS',80,'Sempurna',10,'2025-12-30 10:23:06','2025-12-30 10:23:06'),(66,24,42,52,11,'Ganjil','PTS',83,'Sempurna',10,'2025-12-30 10:23:15','2025-12-30 10:23:15'),(67,24,48,52,11,'Ganjil','PAS',80,'Bagus',8,'2025-12-30 10:37:37','2025-12-31 18:04:24'),(69,24,47,52,11,'Ganjil','PAS',75,'Sangat Baik',8,'2025-12-30 14:31:19','2025-12-31 18:04:59'),(70,24,44,52,11,'Ganjil','PAS',84,'Boleh Juga',8,'2025-12-30 14:31:42','2025-12-31 18:05:09'),(71,24,43,52,11,'Ganjil','PAS',97,'Baik',8,'2025-12-30 14:31:51','2025-12-31 18:05:20'),(72,24,40,52,11,'Ganjil','PAS',100,'Boleh juga',8,'2025-12-30 14:31:58','2025-12-31 18:05:31'),(73,24,38,52,11,'Ganjil','PTS',90,'Bagus',10,'2025-12-31 17:28:26','2025-12-31 17:28:26'),(79,24,48,52,11,'Ganjil','PTS',80,'Baik',8,'2026-01-01 06:13:28','2026-01-01 06:13:28'),(80,24,47,52,11,'Ganjil','PTS',75,'Baik',8,'2026-01-01 06:13:28','2026-01-01 06:13:28'),(81,24,44,52,11,'Ganjil','PTS',84,'Baik',8,'2026-01-01 06:13:28','2026-01-01 06:13:28'),(82,24,43,52,11,'Ganjil','PTS',97,'Baik',8,'2026-01-01 06:13:28','2026-01-01 06:13:28'),(83,24,40,52,11,'Ganjil','PTS',100,'Baik',8,'2026-01-01 06:13:28','2026-01-01 06:13:28');
/*!40000 ALTER TABLE `nilai_rapor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pembelajaran`
--

DROP TABLE IF EXISTS `pembelajaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pembelajaran` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tahun_ajaran_id` int(11) NOT NULL,
  `kelas_id` int(11) NOT NULL,
  `mata_pelajaran_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tahun_ajaran` (`tahun_ajaran_id`),
  KEY `idx_kelas` (`kelas_id`),
  KEY `idx_mapel` (`mata_pelajaran_id`),
  KEY `idx_guru` (`user_id`),
  CONSTRAINT `fk_pembelajaran_guru` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`) ON DELETE NO ACTION,
  CONSTRAINT `fk_pembelajaran_kelas` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `fk_pembelajaran_mapel` FOREIGN KEY (`mata_pelajaran_id`) REFERENCES `mata_pelajaran` (`id_mata_pelajaran`) ON DELETE CASCADE,
  CONSTRAINT `fk_pembelajaran_tahun_ajaran` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Penugasan guru mengajar: hanya untuk user dengan role guru';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pembelajaran`
--

LOCK TABLES `pembelajaran` WRITE;
/*!40000 ALTER TABLE `pembelajaran` DISABLE KEYS */;
INSERT INTO `pembelajaran` VALUES (38,11,52,37,10,'2025-12-29 14:05:08',NULL),(39,11,52,39,10,'2025-12-29 16:42:55',NULL),(40,11,52,42,10,'2025-12-29 16:43:04',NULL),(41,11,52,45,10,'2025-12-29 16:43:15',NULL),(42,11,52,38,10,'2025-12-29 16:43:24',NULL),(43,11,52,46,10,'2025-12-29 16:44:17',NULL),(44,11,52,36,10,'2025-12-29 16:44:43',NULL),(45,11,52,41,10,'2025-12-29 16:45:32',NULL),(46,11,52,48,8,'2025-12-29 16:45:40',NULL),(47,11,52,47,8,'2025-12-29 16:45:48',NULL),(48,11,52,44,8,'2025-12-29 16:45:56',NULL),(49,11,52,43,8,'2025-12-29 16:46:03',NULL),(50,11,52,40,8,'2025-12-29 16:46:30',NULL);
/*!40000 ALTER TABLE `pembelajaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `peserta_ekstrakurikuler`
--

DROP TABLE IF EXISTS `peserta_ekstrakurikuler`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `peserta_ekstrakurikuler` (
  `id_peserta_ekskul` int(11) NOT NULL AUTO_INCREMENT,
  `siswa_id` int(11) NOT NULL,
  `ekskul_id` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_peserta_ekskul`),
  UNIQUE KEY `unique_siswa_ekskul_ta` (`siswa_id`,`ekskul_id`,`tahun_ajaran_id`),
  KEY `ekskul_id` (`ekskul_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `peserta_ekstrakurikuler_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE,
  CONSTRAINT `peserta_ekstrakurikuler_ibfk_2` FOREIGN KEY (`ekskul_id`) REFERENCES `ekstrakurikuler` (`id_ekskul`) ON DELETE CASCADE,
  CONSTRAINT `peserta_ekstrakurikuler_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `peserta_ekstrakurikuler`
--

LOCK TABLES `peserta_ekstrakurikuler` WRITE;
/*!40000 ALTER TABLE `peserta_ekstrakurikuler` DISABLE KEYS */;
/*!40000 ALTER TABLE `peserta_ekstrakurikuler` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sekolah`
--

DROP TABLE IF EXISTS `sekolah`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sekolah` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama_sekolah` varchar(255) NOT NULL,
  `npsn` varchar(20) DEFAULT NULL,
  `nss` varchar(20) DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `kode_pos` varchar(10) DEFAULT NULL,
  `telepon` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `kepala_sekolah` varchar(100) DEFAULT NULL,
  `niy_kepala_sekolah` varchar(20) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `npsn` (`npsn`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sekolah`
--

LOCK TABLES `sekolah` WRITE;
/*!40000 ALTER TABLE `sekolah` DISABLE KEYS */;
INSERT INTO `sekolah` VALUES (1,'SDIT Ulil Albab','0000000000','00000000','Alamat Sekolah','00000','0000000000','info@sekolah.sch.id','https://sekolah.sch.id','Kepala Sekolah','0000000000000000','/uploads/logo_sekolah.png','2025-12-29 08:47:31','2025-12-29 08:47:31');
/*!40000 ALTER TABLE `sekolah` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `siswa`
--

DROP TABLE IF EXISTS `siswa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `siswa` (
  `id_siswa` int(11) NOT NULL AUTO_INCREMENT,
  `nis` varchar(20) NOT NULL,
  `nisn` varchar(20) NOT NULL,
  `nama_lengkap` varchar(255) NOT NULL,
  `tempat_lahir` varchar(100) DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `status` enum('aktif','lulus','pindah','drop-out') DEFAULT 'aktif',
  PRIMARY KEY (`id_siswa`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `siswa`
--

LOCK TABLES `siswa` WRITE;
/*!40000 ALTER TABLE `siswa` DISABLE KEYS */;
INSERT INTO `siswa` VALUES (24,'0222222323','0088767756545','Ali','Batam','2005-03-29','Laki-laki','Batam Centre','aktif');
/*!40000 ALTER TABLE `siswa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `siswa_kelas`
--

DROP TABLE IF EXISTS `siswa_kelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `siswa_kelas` (
  `siswa_id` int(11) NOT NULL,
  `kelas_id` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  PRIMARY KEY (`siswa_id`,`tahun_ajaran_id`),
  KEY `kelas_id` (`kelas_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `siswa_kelas_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `siswa_kelas_ibfk_2` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `siswa_kelas_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `siswa_kelas`
--

LOCK TABLES `siswa_kelas` WRITE;
/*!40000 ALTER TABLE `siswa_kelas` DISABLE KEYS */;
INSERT INTO `siswa_kelas` VALUES (24,52,11);
/*!40000 ALTER TABLE `siswa_kelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tahun_ajaran`
--

DROP TABLE IF EXISTS `tahun_ajaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tahun_ajaran` (
  `id_tahun_ajaran` int(11) NOT NULL AUTO_INCREMENT,
  `tahun_ajaran` varchar(50) NOT NULL,
  `semester` enum('Ganjil','Genap') NOT NULL,
  `tanggal_pembagian_pts` date DEFAULT NULL,
  `tanggal_pembagian_pas` date DEFAULT NULL,
  `status` enum('aktif','nonaktif') DEFAULT 'nonaktif',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status_pts` enum('nonaktif','aktif','selesai') NOT NULL DEFAULT 'nonaktif',
  `status_pas` enum('nonaktif','aktif','selesai') NOT NULL DEFAULT 'nonaktif',
  PRIMARY KEY (`id_tahun_ajaran`),
  UNIQUE KEY `unik_tahun_semester` (`tahun_ajaran`,`semester`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tahun_ajaran`
--

LOCK TABLES `tahun_ajaran` WRITE;
/*!40000 ALTER TABLE `tahun_ajaran` DISABLE KEYS */;
INSERT INTO `tahun_ajaran` VALUES (11,'2024/2025','Ganjil','2025-10-29','2025-12-29','aktif','2025-12-29 15:48:23','2025-12-31 16:47:32','aktif','selesai');
/*!40000 ALTER TABLE `tahun_ajaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id_user` int(11) NOT NULL AUTO_INCREMENT,
  `email_sekolah` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nama_lengkap` varchar(255) NOT NULL,
  `status` enum('aktif','nonaktif') DEFAULT 'aktif',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `email_sekolah` (`email_sekolah`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'admin1@sekolah.sch.id','$2b$10$0DGlWff8iiI/jVXuqoyNrOG9jCHXyeUuo2nTIhyiOBxJ76I.vJiaC','Raid Aqil','aktif','2025-12-04 14:55:19','2025-12-15 07:21:40'),(2,'test@gmail.com','$2b$10$PkwgRmgN7qS9bTJ.oJLEseErBxRFG.S7CAfHkM0Dqag.GAVUMknmK','Ali','aktif','2025-12-04 15:09:58','2025-12-04 15:09:58'),(3,'dewirt343@sekolah.sch.id','$2b$10$GZmou2ma0q49duLoeIVgA.x0k/bZkiWqB6k2NQUn8GZK99A6CKvOC','Dewi Lestari','aktif','2025-12-04 15:39:05','2025-12-04 15:39:05'),(4,'budi033@sekolah.sch.id','$2b$10$d/FfyjSTb0aFdauGZvMOaum0s.g7rttM7Xn5To70adf47fktw/fBq','Budi Santoso','aktif','2025-12-04 15:39:05','2025-12-04 15:39:05'),(5,'siti234@sekolah.sch.id','$2b$10$yK9/XrnccTjGNxmTRExyyeIQQOl9K3.hElK54a8/W1D2br6jo5T22','Siti Aminah','aktif','2025-12-04 15:39:05','2025-12-04 15:39:05'),(6,'ahmad678@sekolah.sch.id','$2b$10$u1wFcinpsNofaXqvwvcBCO2SCOb1X4VuZrHpDHjJdJjTnoLklL7mS','Ahmad Rizki','nonaktif','2025-12-04 15:39:05','2025-12-29 08:49:15'),(7,'nolan123@sekolah.ch.id','$2b$10$/lOJWJjbIN43DodSzxogDuX9ymEX1sPk.Gd0bzRyVlGvLUtVIa/oK','Nolan','aktif','2025-12-07 05:16:35','2025-12-07 05:16:35'),(8,'jojo123@sekolah.sch.id','$2b$10$7L2xZMSLhKt2/ll4.gcAeOSmVYb1llWa7NyQ7HUZgSKOYACbmBv0y','Jojo uji ','aktif','2025-12-10 03:26:43','2025-12-23 19:07:39'),(9,'lapu123@sekolah.sch.id','$2b$10$eg8i1e/Eu0ndpFHUB0/Wze6K/gdEFr.yI2RrRKAks6j5LsCl6Dsci','Lapu-lapu','aktif','2025-12-11 12:31:58','2025-12-20 13:17:46'),(10,'kiko123@sekolah.sch.id','$2b$10$WkpojahDPKkkseWZLanxbe84AjSppUzyt2hef9e.1TNWTJXricHf.','Kiko','aktif','2025-12-13 14:56:00','2025-12-13 14:56:00'),(11,'admin2@sekolah.sch.id','$2b$10$GYhDkCmm0CIAmYUHtnjhguNkKEbzQuvP90FGuEbh51.Mc/xaIXtKm','Admin Ggij','aktif','2025-12-14 14:32:26','2025-12-15 06:56:16'),(12,'rama123@sekolah.sch.id','$2b$10$17dwXmZ5ijWl4gnvD1tibu7TWh9p8K1G7Fa4OaxDbiz2CJHN3HM6S','Rama','aktif','2025-12-15 07:10:52','2025-12-15 07:10:52'),(13,'yui1@sekolah.sch.id','$2b$10$jHbq/LURL4b1FKnKQr3oke9Crbca/NJrewPVNdnAjEAGBZdp8Kl2y','yui','aktif','2025-12-29 08:46:14','2025-12-29 08:46:14');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_role`
--

DROP TABLE IF EXISTS `user_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_role` (
  `id_user` int(11) NOT NULL,
  `role` varchar(50) NOT NULL,
  PRIMARY KEY (`id_user`,`role`),
  CONSTRAINT `user_role_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_role`
--

LOCK TABLES `user_role` WRITE;
/*!40000 ALTER TABLE `user_role` DISABLE KEYS */;
INSERT INTO `user_role` VALUES (1,'admin'),(2,'guru bidang studi'),(3,'guru kelas'),(4,'guru bidang studi'),(5,'guru bidang studi'),(5,'guru kelas'),(6,'guru bidang studi'),(7,'guru kelas'),(8,'guru bidang studi'),(8,'guru kelas'),(9,'guru bidang studi'),(10,'guru bidang studi'),(10,'guru kelas'),(11,'admin'),(12,'admin'),(13,'guru bidang studi'),(13,'guru kelas');
/*!40000 ALTER TABLE `user_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'erapor_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-02 15:17:34
