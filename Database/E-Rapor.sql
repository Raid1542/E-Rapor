/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.25-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: erapor_db
-- ------------------------------------------------------
-- Server version	10.6.25-MariaDB

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
  `id_tahun_ajaran` int(11) NOT NULL,
  `sakit_pts` int(11) DEFAULT 0,
  `izin_pts` int(11) DEFAULT 0,
  `alpha_pts` int(11) DEFAULT 0,
  `sakit_total` int(11) DEFAULT 0,
  `izin_total` int(11) DEFAULT 0,
  `alpha_total` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_absensi`),
  UNIQUE KEY `unique_siswa_ta` (`siswa_id`,`id_tahun_ajaran`),
  KEY `idx_siswa` (`siswa_id`),
  KEY `idx_kelas` (`kelas_id`),
  KEY `idx_tahun_ajaran` (`id_tahun_ajaran`),
  CONSTRAINT `absensi_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE,
  CONSTRAINT `absensi_ibfk_2` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `absensi_ibfk_3` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `absensi`
--

LOCK TABLES `absensi` WRITE;
/*!40000 ALTER TABLE `absensi` DISABLE KEYS */;
INSERT INTO `absensi` VALUES (1,1,1,1,0,0,1,0,0,1,'2026-07-16 06:41:37','2026-07-16 06:41:37');
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `arsip_rapor`
--

LOCK TABLES `arsip_rapor` WRITE;
/*!40000 ALTER TABLE `arsip_rapor` DISABLE KEYS */;
INSERT INTO `arsip_rapor` VALUES (1,1,1,'Ganjil','PTS','{\"akademik\":[{\"kode_mapel\":\"MTK\",\"nama_mapel\":\"Matematika\",\"nilai\":90,\"deskripsi\":\"RRRWQQW dewdwef dsfe\"},{\"kode_mapel\":\"BING\",\"nama_mapel\":\"Bahasa Inggris\",\"nilai\":50,\"deskripsi\":\"Perlu Bimbingan\"}],\"kokurikuler\":{\"nilai_mutabaah\":99,\"nilai_bpi\":null,\"nilai_literasi\":null,\"nilai_proyek\":null,\"nama_judul_proyek\":null,\"detail\":[{\"kode_aspek\":\"MUTABAAH\",\"nama_aspek\":\"Mutabaah Yaumiyah\",\"nilai\":99,\"grade\":\"A\",\"deskripsi\":\"Sangat Baik\",\"judul_proyek\":null}]},\"absensi\":{\"sakit\":0,\"izin\":0,\"alpha\":1},\"ekskul\":[{\"nama\":\"Futsal\",\"deskripsi\":\"fdwwefwefew\"}],\"catatan_wali_kelas\":\"dewdewdwedwecdvreou;ghixuspfhewoufhohfwe;lfhspoufhwqpohdsnjowe;oeufaoh fewfwepijfde\",\"naik_tingkat\":null}','2026-07-16 17:08:56');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aspek_kokurikuler`
--

LOCK TABLES `aspek_kokurikuler` WRITE;
/*!40000 ALTER TABLE `aspek_kokurikuler` DISABLE KEYS */;
INSERT INTO `aspek_kokurikuler` VALUES (2,'BPI','Bina Pribadi Islami',3,'2026-06-12 13:46:23'),(3,'PROYEK','Proyek',4,'2026-06-12 13:46:23'),(4,'LITERASI','Literasi',5,'2026-06-12 13:46:23'),(5,'MUTABAAH','Mutabaah Yaumiyah',1,'2026-06-19 18:56:39');
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
  UNIQUE KEY `unique_catatan` (`siswa_id`,`tahun_ajaran_id`,`semester`,`jenis_penilaian`),
  KEY `kelas_id` (`kelas_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `catatan_wali_kelas_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE,
  CONSTRAINT `catatan_wali_kelas_ibfk_2` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `catatan_wali_kelas_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catatan_wali_kelas`
--

LOCK TABLES `catatan_wali_kelas` WRITE;
/*!40000 ALTER TABLE `catatan_wali_kelas` DISABLE KEYS */;
INSERT INTO `catatan_wali_kelas` VALUES (1,1,1,1,'Ganjil','PTS','dewdewdwedwecdvreou;ghixuspfhewoufhohfwe;lfhspoufhwqpohdsnjowe;oeufaoh fewfwepijfde',NULL,'2026-07-16 13:07:15','2026-07-16 13:07:15');
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
  `pembina_id` int(11) DEFAULT NULL,
  `keterangan` text DEFAULT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_ekskul`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  KEY `pembina_id` (`pembina_id`),
  CONSTRAINT `ekstrakurikuler_ibfk_1` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE,
  CONSTRAINT `ekstrakurikuler_ibfk_2` FOREIGN KEY (`pembina_id`) REFERENCES `pembina_ekstrakurikuler` (`id_pembina_ekstrakurikuler`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ekstrakurikuler`
--

LOCK TABLES `ekstrakurikuler` WRITE;
/*!40000 ALTER TABLE `ekstrakurikuler` DISABLE KEYS */;
INSERT INTO `ekstrakurikuler` VALUES (1,'Futsal',NULL,1,NULL,1,'2026-07-12 13:55:32','2026-07-12 13:55:32');
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
  `niy` varchar(20) DEFAULT NULL,
  `nuptk` varchar(30) DEFAULT NULL,
  `tempat_lahir` varchar(100) NOT NULL,
  `tanggal_lahir` date NOT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guru`
--

LOCK TABLES `guru` WRITE;
/*!40000 ALTER TABLE `guru` DISABLE KEYS */;
INSERT INTO `guru` VALUES (1,1,NULL,NULL,'Batam','2005-02-12','Laki-laki',NULL,NULL,NULL,'2026-07-12 20:52:31','2026-07-12 20:52:31'),(2,2,NULL,NULL,'Batam','2005-02-12','Laki-laki',NULL,NULL,NULL,'2026-07-12 20:53:11','2026-07-12 20:53:11');
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
  KEY `idx_user_ta` (`user_id`,`tahun_ajaran_id`),
  KEY `idx_kelas_ta` (`kelas_id`,`tahun_ajaran_id`),
  CONSTRAINT `guru_kelas_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `guru_kelas_ibfk_2` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `guru_kelas_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guru_kelas`
--

LOCK TABLES `guru_kelas` WRITE;
/*!40000 ALTER TABLE `guru_kelas` DISABLE KEYS */;
INSERT INTO `guru_kelas` VALUES (1,2,1,1,'2026-07-12 13:53:53','2026-07-12 13:53:53'),(2,2,1,2,'2026-07-12 13:53:53','2026-07-12 13:53:53');
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
  `kelas_id` int(11) DEFAULT NULL,
  `judul` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_judul_proyek`),
  UNIQUE KEY `unique_judul_per_kelas` (`kelas_id`,`id_tahun_ajaran`),
  KEY `idx_kelas` (`kelas_id`),
  KEY `idx_tahun_ajaran` (`id_tahun_ajaran`),
  CONSTRAINT `fk_judul_kelas` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `judul_proyek_per_tahun_ajaran_ibfk_1` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `judul_proyek_per_tahun_ajaran`
--

LOCK TABLES `judul_proyek_per_tahun_ajaran` WRITE;
/*!40000 ALTER TABLE `judul_proyek_per_tahun_ajaran` DISABLE KEYS */;
/*!40000 ALTER TABLE `judul_proyek_per_tahun_ajaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kategori_deskripsi_rata_rata`
--

DROP TABLE IF EXISTS `kategori_deskripsi_rata_rata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kategori_deskripsi_rata_rata` (
  `id_kategori` int(11) NOT NULL AUTO_INCREMENT,
  `kelas_id` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `semester` varchar(10) NOT NULL,
  `rentang_min` decimal(5,2) NOT NULL,
  `rentang_max` decimal(5,2) NOT NULL,
  `deskripsi` text NOT NULL,
  `urutan` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_kategori`),
  KEY `kelas_id` (`kelas_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `kategori_deskripsi_rata_rata_ibfk_1` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `kategori_deskripsi_rata_rata_ibfk_2` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kategori_deskripsi_rata_rata`
--

LOCK TABLES `kategori_deskripsi_rata_rata` WRITE;
/*!40000 ALTER TABLE `kategori_deskripsi_rata_rata` DISABLE KEYS */;
INSERT INTO `kategori_deskripsi_rata_rata` VALUES (30,1,1,'Ganjil',90.00,100.00,'Sangat Baik',1,'2026-07-14 08:35:35','2026-07-14 08:35:35'),(31,1,1,'Ganjil',80.00,89.00,'Baik',1,'2026-07-14 08:35:35','2026-07-14 08:35:35'),(32,1,1,'Ganjil',60.00,69.00,'Kurang',1,'2026-07-14 08:35:35','2026-07-14 08:35:35'),(33,1,1,'Ganjil',0.00,59.00,'Perlu Bimbingan',1,'2026-07-14 08:35:35','2026-07-14 08:35:35');
/*!40000 ALTER TABLE `kategori_deskripsi_rata_rata` ENABLE KEYS */;
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
  `kelas_id` int(11) DEFAULT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `semester` varchar(10) NOT NULL,
  `jenis_penilaian` enum('PTS','PAS') NOT NULL DEFAULT 'PTS',
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
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kategori_grade_kokurikuler`
--

LOCK TABLES `kategori_grade_kokurikuler` WRITE;
/*!40000 ALTER TABLE `kategori_grade_kokurikuler` DISABLE KEYS */;
INSERT INTO `kategori_grade_kokurikuler` VALUES (46,5,1,1,'Ganjil','PTS',90.00,100.00,'A',1,'Sangat Baik','2026-07-16 10:59:30','2026-07-16 10:59:30'),(47,5,1,1,'Ganjil','PTS',80.00,89.00,'B',2,'Baik','2026-07-16 10:59:30','2026-07-16 10:59:30'),(48,5,1,1,'Ganjil','PTS',60.00,79.00,'C',3,'Cukup','2026-07-16 10:59:30','2026-07-16 10:59:30'),(49,5,1,1,'Ganjil','PTS',0.00,59.00,'E',4,'Perlu Bimbingan fwef','2026-07-16 10:59:30','2026-07-16 10:59:30');
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
  `tahun_ajaran_id` int(11) NOT NULL,
  `nama_kelas` varchar(50) NOT NULL,
  `fase` enum('A','B','C') NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_kelas`),
  UNIQUE KEY `unique_nama_kelas_per_tahun` (`nama_kelas`,`tahun_ajaran_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  KEY `idx_tahun_ajaran` (`tahun_ajaran_id`),
  KEY `idx_nama_kelas` (`nama_kelas`),
  CONSTRAINT `fk_kelas_tahun_ajaran_induk` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran_induk` (`id_tahun_ajaran_induk`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kelas`
--

LOCK TABLES `kelas` WRITE;
/*!40000 ALTER TABLE `kelas` DISABLE KEYS */;
INSERT INTO `kelas` VALUES (1,1,'1 A','A','2026-07-12 20:53:53','2026-07-12 20:53:53');
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `komponen_penilaian`
--

LOCK TABLES `komponen_penilaian` WRITE;
/*!40000 ALTER TABLE `komponen_penilaian` DISABLE KEYS */;
INSERT INTO `komponen_penilaian` VALUES (1,'UH 1',1,'2026-06-18 14:11:23','2026-06-18 14:11:23'),(2,'UH 2',2,'2026-06-18 14:11:23','2026-06-18 14:11:23'),(3,'UH 3',3,'2026-06-18 14:11:23','2026-06-18 14:11:23'),(4,'UH 4',4,'2026-06-18 14:11:23','2026-06-18 14:11:23'),(5,'UH 5',5,'2026-06-18 14:11:23','2026-06-18 14:11:23'),(6,'PTS',6,'2026-06-18 14:11:23','2026-06-18 14:11:23'),(7,'PAS',7,'2026-06-18 14:11:23','2026-06-18 14:11:23');
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
  `kelas_id` int(11) DEFAULT NULL,
  `tahun_ajaran_id` int(11) DEFAULT NULL,
  `jenis_penilaian` enum('PTS','PAS') NOT NULL DEFAULT 'PTS',
  `komponen_id` int(11) NOT NULL,
  `bobot` decimal(5,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_config`),
  KEY `mapel_id` (`mapel_id`),
  KEY `komponen_id` (`komponen_id`),
  KEY `idx_mapel_ta_kelas` (`mapel_id`,`tahun_ajaran_id`,`kelas_id`),
  CONSTRAINT `konfigurasi_mapel_komponen_ibfk_1` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran` (`id_mata_pelajaran`),
  CONSTRAINT `konfigurasi_mapel_komponen_ibfk_2` FOREIGN KEY (`komponen_id`) REFERENCES `komponen_penilaian` (`id_komponen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `konfigurasi_mapel_komponen`
--

LOCK TABLES `konfigurasi_mapel_komponen` WRITE;
/*!40000 ALTER TABLE `konfigurasi_mapel_komponen` DISABLE KEYS */;
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
  `kelas_id` int(11) DEFAULT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `jenis_penilaian` enum('PTS','PAS') NOT NULL DEFAULT 'PTS',
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
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `konfigurasi_nilai_rapor`
--

LOCK TABLES `konfigurasi_nilai_rapor` WRITE;
/*!40000 ALTER TABLE `konfigurasi_nilai_rapor` DISABLE KEYS */;
INSERT INTO `konfigurasi_nilai_rapor` VALUES (28,1,1,1,'PTS',0,100,'RRRWQQW dewdwef dsfe',4,1,'2026-07-14 11:23:13','2026-07-14 13:10:40'),(39,2,1,1,'PTS',0,59,'Perlu Bimbingan',1,1,'2026-07-15 12:55:19','2026-07-15 12:55:19'),(40,2,1,1,'PTS',60,100,'Cukup',1,1,'2026-07-15 12:55:19','2026-07-15 12:55:19');
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
  `kode_mapel` varchar(20) NOT NULL,
  `urutan_rapor` int(11) DEFAULT NULL,
  `jenis` enum('wajib','pilihan') NOT NULL,
  `kurikulum` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_mata_pelajaran`),
  UNIQUE KEY `unique_kode_per_ta` (`kode_mapel`,`tahun_ajaran_id`),
  UNIQUE KEY `unique_nama_per_ta` (`nama_mapel`,`tahun_ajaran_id`),
  UNIQUE KEY `unique_urutan_per_ta` (`urutan_rapor`,`tahun_ajaran_id`),
  KEY `fk_mata_pelajaran_tahun_ajaran` (`tahun_ajaran_id`),
  CONSTRAINT `fk_mapel_tahun_ajaran` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mata_pelajaran`
--

LOCK TABLES `mata_pelajaran` WRITE;
/*!40000 ALTER TABLE `mata_pelajaran` DISABLE KEYS */;
INSERT INTO `mata_pelajaran` VALUES (1,1,'Matematika','MTK',NULL,'wajib','Kurikulum Merdeka','2026-07-12 20:54:19','2026-07-12 20:54:19'),(2,1,'Bahasa Inggris','BING',NULL,'pilihan','Kurikulum Merdeka','2026-07-12 20:54:39','2026-07-12 20:54:39');
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nilai_detail`
--

LOCK TABLES `nilai_detail` WRITE;
/*!40000 ALTER TABLE `nilai_detail` DISABLE KEYS */;
INSERT INTO `nilai_detail` VALUES (1,1,1,1,6,90,2,'2026-07-12 15:10:17','2026-07-16 07:07:30'),(10,1,2,1,6,50,2,'2026-07-15 12:55:49','2026-07-16 07:35:06');
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
  `id_aspek_kokurikuler` int(11) NOT NULL,
  `id_kelas` int(11) NOT NULL,
  `id_tahun_ajaran` int(11) NOT NULL,
  `semester` varchar(10) NOT NULL,
  `jenis_penilaian` varchar(10) NOT NULL,
  `nilai` int(3) DEFAULT NULL,
  `grade` varchar(5) DEFAULT NULL,
  `deskripsi` text DEFAULT NULL,
  `id_judul_proyek` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_nilai_kokurikuler`),
  UNIQUE KEY `unique_siswa_aspek` (`id_siswa`,`id_aspek_kokurikuler`,`id_tahun_ajaran`,`semester`,`jenis_penilaian`),
  KEY `idx_siswa` (`id_siswa`),
  KEY `idx_aspek` (`id_aspek_kokurikuler`),
  KEY `idx_kelas` (`id_kelas`),
  KEY `idx_judul_proyek` (`id_judul_proyek`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nilai_kokurikuler`
--

LOCK TABLES `nilai_kokurikuler` WRITE;
/*!40000 ALTER TABLE `nilai_kokurikuler` DISABLE KEYS */;
INSERT INTO `nilai_kokurikuler` VALUES (1,1,5,1,1,'Ganjil','PTS',99,'A','Sangat Baik',NULL,'2026-07-13 09:11:55','2026-07-16 10:59:30');
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
  `is_locked` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_nilai_rapor`),
  UNIQUE KEY `unique_nilai_rapor` (`siswa_id`,`mapel_id`,`tahun_ajaran_id`,`semester`,`jenis_penilaian`),
  KEY `mapel_id` (`mapel_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `fk_nilai_rapor_kelas` (`kelas_id`),
  KEY `idx_siswa_mapel` (`siswa_id`,`mapel_id`),
  KEY `idx_mapel_ta` (`mapel_id`,`tahun_ajaran_id`),
  CONSTRAINT `fk_nilai_rapor_kelas` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nilai_rapor_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`),
  CONSTRAINT `nilai_rapor_ibfk_2` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran` (`id_mata_pelajaran`),
  CONSTRAINT `nilai_rapor_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`),
  CONSTRAINT `nilai_rapor_ibfk_4` FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nilai_rapor`
--

LOCK TABLES `nilai_rapor` WRITE;
/*!40000 ALTER TABLE `nilai_rapor` DISABLE KEYS */;
INSERT INTO `nilai_rapor` VALUES (1,1,1,1,1,'Ganjil','PTS',90,'RRRWQQW dewdwef dsfe',2,'2026-07-12 15:10:17','2026-07-16 07:07:30',0),(48,1,2,1,1,'Ganjil','PTS',50,'Perlu Bimbingan',2,'2026-07-15 12:55:49','2026-07-16 07:35:06',0);
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
  `mapel_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pembelajaran` (`user_id`,`kelas_id`,`mapel_id`,`tahun_ajaran_id`),
  KEY `idx_tahun_ajaran` (`tahun_ajaran_id`),
  KEY `idx_kelas` (`kelas_id`),
  KEY `idx_mapel` (`mapel_id`),
  KEY `idx_guru` (`user_id`),
  KEY `idx_kelas_mapel` (`kelas_id`,`mapel_id`),
  KEY `idx_user_ta` (`user_id`,`tahun_ajaran_id`),
  CONSTRAINT `fk_pembelajaran_guru` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`) ON DELETE NO ACTION,
  CONSTRAINT `fk_pembelajaran_kelas` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `fk_pembelajaran_mapel` FOREIGN KEY (`mapel_id`) REFERENCES `mata_pelajaran` (`id_mata_pelajaran`) ON DELETE CASCADE,
  CONSTRAINT `fk_pembelajaran_tahun_ajaran` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Penugasan guru mengajar: hanya untuk user dengan role guru';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pembelajaran`
--

LOCK TABLES `pembelajaran` WRITE;
/*!40000 ALTER TABLE `pembelajaran` DISABLE KEYS */;
INSERT INTO `pembelajaran` VALUES (1,1,1,1,2,'2026-07-12 13:54:51','2026-07-12 13:54:51'),(2,1,1,2,2,'2026-07-12 13:55:06','2026-07-12 13:55:06');
/*!40000 ALTER TABLE `pembelajaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pembina_ekstrakurikuler`
--

DROP TABLE IF EXISTS `pembina_ekstrakurikuler`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pembina_ekstrakurikuler` (
  `id_pembina_ekstrakurikuler` int(11) NOT NULL AUTO_INCREMENT,
  `nama_lengkap` varchar(255) NOT NULL,
  `niy` varchar(50) DEFAULT NULL,
  `nuptk` varchar(50) DEFAULT NULL,
  `tempat_lahir` varchar(100) NOT NULL,
  `tanggal_lahir` date NOT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') NOT NULL,
  `alamat` text DEFAULT NULL,
  `no_telepon` varchar(20) DEFAULT NULL,
  `status` enum('aktif','nonaktif') DEFAULT 'aktif',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_pembina_ekstrakurikuler`),
  UNIQUE KEY `uk_nuptk` (`nuptk`),
  UNIQUE KEY `uk_niy` (`niy`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pembina_ekstrakurikuler`
--

LOCK TABLES `pembina_ekstrakurikuler` WRITE;
/*!40000 ALTER TABLE `pembina_ekstrakurikuler` DISABLE KEYS */;
INSERT INTO `pembina_ekstrakurikuler` VALUES (1,'Raid Aqil Athallah','2222222','03232443','Jakarta','1990-07-08','Perempuan','Jl. Merdeka No. 1','81234567891','aktif','2026-07-12 20:53:40','2026-07-12 20:53:40'),(2,'Budi Santoso','1234567891','7645321456','Bandung','1990-07-09','Laki-laki','Jl. Sudirman No. 2','81234567892','aktif','2026-07-12 20:53:40','2026-07-12 20:53:40'),(3,'Siti Aminah','1234567892','7645321656','Surabaya','1990-07-10','Perempuan','Jl. Pahlawan No. 3','81234567893','aktif','2026-07-12 20:53:40','2026-07-12 20:53:40'),(4,'Ahmad Rizki','1234567893','7645311456','Medan','1990-07-11','Laki-laki','Jl. Diponegoro No. 4','81234567894','aktif','2026-07-12 20:53:40','2026-07-12 20:53:40');
/*!40000 ALTER TABLE `pembina_ekstrakurikuler` ENABLE KEYS */;
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
  UNIQUE KEY `unique_siswa_ekskul` (`siswa_id`,`ekskul_id`),
  KEY `ekskul_id` (`ekskul_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `peserta_ekstrakurikuler_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE,
  CONSTRAINT `peserta_ekstrakurikuler_ibfk_2` FOREIGN KEY (`ekskul_id`) REFERENCES `ekstrakurikuler` (`id_ekskul`) ON DELETE CASCADE,
  CONSTRAINT `peserta_ekstrakurikuler_ibfk_3` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `peserta_ekstrakurikuler`
--

LOCK TABLES `peserta_ekstrakurikuler` WRITE;
/*!40000 ALTER TABLE `peserta_ekstrakurikuler` DISABLE KEYS */;
INSERT INTO `peserta_ekstrakurikuler` VALUES (1,1,1,1,'fdwwefwefew','2026-07-16 14:47:40','2026-07-16 14:47:40');
/*!40000 ALTER TABLE `peserta_ekstrakurikuler` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `riwayat_ganti_semester`
--

DROP TABLE IF EXISTS `riwayat_ganti_semester`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `riwayat_ganti_semester` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tahun_ajaran_induk_id` int(11) NOT NULL,
  `tahun_ajaran` varchar(50) DEFAULT NULL,
  `semester_lama` varchar(20) DEFAULT NULL,
  `semester_baru` varchar(20) DEFAULT NULL,
  `alasan` text DEFAULT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `tahun_ajaran_induk_id` (`tahun_ajaran_induk_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `riwayat_ganti_semester_ibfk_1` FOREIGN KEY (`tahun_ajaran_induk_id`) REFERENCES `tahun_ajaran_induk` (`id_tahun_ajaran_induk`) ON DELETE CASCADE,
  CONSTRAINT `riwayat_ganti_semester_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `user` (`id_user`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `riwayat_ganti_semester`
--

LOCK TABLES `riwayat_ganti_semester` WRITE;
/*!40000 ALTER TABLE `riwayat_ganti_semester` DISABLE KEYS */;
/*!40000 ALTER TABLE `riwayat_ganti_semester` ENABLE KEYS */;
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
INSERT INTO `sekolah` VALUES (1,'SDIT Ulil Albab Batam','000000000000','000000000000','','00000000','0000000000','sekolah@.id','','','','/uploads/logo_sekolah.png','2026-07-02 16:45:53','2026-07-02 16:45:53');
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
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_siswa`),
  KEY `idx_nis` (`nis`),
  KEY `idx_nama` (`nama_lengkap`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `siswa`
--

LOCK TABLES `siswa` WRITE;
/*!40000 ALTER TABLE `siswa` DISABLE KEYS */;
INSERT INTO `siswa` VALUES (1,'21-2345','0012345678','Mark','Batam','2016-04-23','Laki-laki','Batu Aji','aktif','2026-07-12 20:53:27','2026-07-12 20:53:27');
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
  `id_tahun_ajaran_induk` int(11) NOT NULL,
  PRIMARY KEY (`siswa_id`,`id_tahun_ajaran_induk`),
  KEY `kelas_id` (`kelas_id`),
  KEY `tahun_ajaran_id` (`id_tahun_ajaran_induk`),
  KEY `idx_siswa_ta` (`siswa_id`,`id_tahun_ajaran_induk`),
  KEY `idx_kelas_ta` (`kelas_id`,`id_tahun_ajaran_induk`),
  CONSTRAINT `siswa_kelas_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `siswa_kelas_ibfk_2` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `siswa_kelas_ibfk_3` FOREIGN KEY (`id_tahun_ajaran_induk`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `siswa_kelas`
--

LOCK TABLES `siswa_kelas` WRITE;
/*!40000 ALTER TABLE `siswa_kelas` DISABLE KEYS */;
INSERT INTO `siswa_kelas` VALUES (1,1,1);
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
  `id_tahun_ajaran_induk` int(11) NOT NULL,
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
  UNIQUE KEY `unik_tahun_semester` (`tahun_ajaran`,`semester`),
  UNIQUE KEY `uk_tahun_semester` (`id_tahun_ajaran_induk`,`semester`),
  KEY `idx_status` (`status`),
  KEY `idx_induk` (`id_tahun_ajaran_induk`),
  CONSTRAINT `fk_tahun_ajaran_induk` FOREIGN KEY (`id_tahun_ajaran_induk`) REFERENCES `tahun_ajaran_induk` (`id_tahun_ajaran_induk`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tahun_ajaran`
--

LOCK TABLES `tahun_ajaran` WRITE;
/*!40000 ALTER TABLE `tahun_ajaran` DISABLE KEYS */;
INSERT INTO `tahun_ajaran` VALUES (1,1,'2024/2025','Ganjil',NULL,NULL,'aktif','2026-07-12 20:49:04','2026-07-17 00:08:59','selesai','aktif'),(2,1,'2024/2025','Genap',NULL,NULL,'nonaktif','2026-07-12 20:49:04','2026-07-12 20:49:04','nonaktif','nonaktif');
/*!40000 ALTER TABLE `tahun_ajaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tahun_ajaran_induk`
--

DROP TABLE IF EXISTS `tahun_ajaran_induk`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tahun_ajaran_induk` (
  `id_tahun_ajaran_induk` int(11) NOT NULL AUTO_INCREMENT,
  `tahun_ajaran` varchar(50) NOT NULL COMMENT 'Contoh: 2024/2025',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_tahun_ajaran_induk`),
  UNIQUE KEY `tahun_ajaran` (`tahun_ajaran`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel induk untuk tahun ajaran (tanpa semester)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tahun_ajaran_induk`
--

LOCK TABLES `tahun_ajaran_induk` WRITE;
/*!40000 ALTER TABLE `tahun_ajaran_induk` DISABLE KEYS */;
INSERT INTO `tahun_ajaran_induk` VALUES (1,'2024/2025','2026-07-12 13:49:04','2026-07-12 13:49:04');
/*!40000 ALTER TABLE `tahun_ajaran_induk` ENABLE KEYS */;
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
  UNIQUE KEY `email_sekolah` (`email_sekolah`),
  KEY `idx_email_sekolah` (`email_sekolah`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'admin@sekolah.id','$2b$10$u32WA2zZ.z4.5HLG2wiLCeFDS8fL4xSa69wpaN7FEuGAEIEklaaRS','Administrator','aktif','2026-07-12 13:36:46','2026-07-12 13:52:31'),(2,'raid@sekolah.id','$2b$10$8fg/.YhClcQpiR3IcI3vHe7/crPa9ZpcZAXC4HUpyEvcwywVfTmdG','Raid Aqil Athallah','aktif','2026-07-12 13:53:11','2026-07-12 13:53:11');
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
  KEY `idx_user` (`id_user`),
  CONSTRAINT `user_role_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_role`
--

LOCK TABLES `user_role` WRITE;
/*!40000 ALTER TABLE `user_role` DISABLE KEYS */;
INSERT INTO `user_role` VALUES (1,'admin'),(2,'guru_bidang_studi'),(2,'guru_kelas');
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

-- Dump completed on 2026-07-19  1:08:07
