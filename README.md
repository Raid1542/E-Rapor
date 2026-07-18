# 📚 E-Rapor SDIT Ulil Albab Batam — Web-Based Student Report Management Information System

E-Rapor SDIT Ulil Albab Batam is a web-based information system developed to support the management of student report cards digitally. The application assists schools in managing academic data, teacher assignments, student assessments, attendance, extracurricular activities, report generation, and report archiving in an integrated system.

This application was developed as part of the **Project-Based Learning (PBL)** course in the **Bachelor of Applied Informatics Engineering Study Program**, Politeknik Negeri Batam.

---

# Background

Student report management at many elementary schools is still carried out using manual or semi-digital methods, resulting in duplicated work, inconsistent data, and inefficient report preparation. Administrative processes such as teacher assignments, assessment input, attendance recording, extracurricular management, and report generation require a centralized system that is accurate, secure, and easy to use.

E-Rapor SDIT Ulil Albab Batam was developed to digitalize these academic administration processes through an integrated web-based information system. The application enables administrators, homeroom teachers, and subject teachers to collaborate within one platform, ensuring that report generation becomes faster, more efficient, and minimizes data entry errors.

---

# Key Features

## Administrator

- Authentication (Login & Logout)
- Dashboard
- Academic Year Management
- Administrator Management
- Teacher Management
- Student Management
- Class Management
- Subject Management
- Teaching Assignment Management
- Homeroom Teacher Assignment
- Extracurricular Management
- Extracurricular Supervisor Assignment
- School Profile Management
- Report Archive Management
- Database Backup & Restore

---

## Homeroom Teacher

- Dashboard
- Assessment Configuration
- Student Attendance Management
- Subject Score Management
- Cocurricular Assessment
- Extracurricular Assessment
- Homeroom Teacher Notes
- Student Report Preview
- Student Report Generation

---

## Subject Teacher

- Dashboard
- Assessment Configuration
- Student Score Management
- Learning Progress Monitoring

---

# Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | Express.js 5, Node.js |
| Database | MariaDB |
| Styling | Tailwind CSS 4 |
| Authentication | JSON Web Token (JWT) |
| Version Control | Git & GitHub |
| Development Tools | Visual Studio Code, Postman |

---

# Development Method

This project applies the **Agile Software Development** methodology, emphasizing iterative development, collaboration among team members, and continuous system improvement throughout the Project-Based Learning process.

The development process begins with **Requirement Analysis**, where functional and non-functional requirements are identified based on the academic administration workflow at SDIT Ulil Albab Batam. These requirements are translated into database design, system architecture, and user interface prototypes during the **System Design** phase.

The implementation phase is carried out incrementally using **Next.js** for frontend development, **Express.js** for backend REST API services, and **MariaDB** as the relational database management system.

System quality is evaluated through functional and non-functional testing to ensure that every feature operates according to user requirements. After successful testing, the application is deployed for demonstration and evaluation as the final outcome of the Project-Based Learning (PBL).

---

# Functional Requirements

The E-Rapor system provides integrated functionalities to support academic administration activities at SDIT Ulil Albab Batam. The application consists of three user roles: **Administrator**, **Homeroom Teacher**, and **Subject Teacher**, each with different access rights and responsibilities.

### Administrator
- User Authentication
- Dashboard
- Academic Year Management
- Administrator Management
- Teacher Management
- Student Management
- Class Management
- Subject Management
- Teaching Assignment Management
- Homeroom Teacher Assignment
- Extracurricular Management
- Extracurricular Supervisor Assignment
- School Profile Management
- Report Archive Management
- Database Backup & Restore

### Homeroom Teacher
- Dashboard
- Assessment Configuration
- Student Attendance Management
- Subject Score Management
- Cocurricular Assessment
- Extracurricular Assessment
- Homeroom Teacher Notes
- Student Report Preview
- Student Report Generation

### Subject Teacher
- Dashboard
- Assessment Configuration
- Student Score Management
- Learning Progress Monitoring

---

# Non-Functional Requirements

The E-Rapor system is designed to meet several non-functional requirements to ensure quality, reliability, and usability.

| Category | Description |
|----------|-------------|
| Performance | The system should provide stable response times under normal user activity. |
| Security | User authentication is implemented using JSON Web Token (JWT) with role-based access control. |
| Reliability | Academic data should be stored consistently and protected from data loss through backup and restore features. |
| Usability | The user interface is designed to be simple, responsive, and easy to understand by school staff. |
| Compatibility | The application can be accessed through modern web browsers on desktop and laptop devices. |

---

# System Architecture

The application follows a three-tier architecture consisting of the presentation layer, application layer, and database layer.

```text
+----------------------+
|      Frontend        |
|  Next.js + React.js  |
+----------+-----------+
           |
           | REST API
           |
+----------v-----------+
|      Backend         |
| Express.js + Node.js |
+----------+-----------+
           |
           |
+----------v-----------+
|      MariaDB         |
| Relational Database  |
+----------------------+
```

---

# Database

The application uses **MariaDB** as the primary relational database management system.

Some of the main entities include:

- Administrator
- Teacher
- Student
- Class
- Subject
- Teaching Assignment
- Academic Year
- Attendance
- Student Assessment
- Cocurricular Assessment
- Extracurricular Assessment
- Homeroom Teacher Notes
- Report Archive

The database is designed using relational tables with primary keys and foreign keys to maintain data consistency and integrity throughout the system.

---

# Installation Guide

## Prerequisites

Before running the project, make sure the following software is installed on your computer:

- Node.js (v18 or newer)
- MariaDB
- Git
- Visual Studio Code (recommended)

---

## Clone Repository

```bash
git clone https://github.com/Raid1542/E-Rapor.git
cd E-Rapor
```

---

## Backend Installation

```bash
cd server
npm install
```

Configure the database connection by editing the `.env` file.

Example:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=erapor_db

JWT_SECRET=your_secret_key
PORT=5000
```

Run the backend server:

```bash
npm start
```

or using PM2

```bash
pm2 start server.js --name erapor
```

The backend server will run at:

```
http://localhost:5000
```

---

## Frontend Installation

Open a new terminal.

```bash
cd klien
npm install
npm run dev
```

The frontend application will run at:

```
http://localhost:3000
```

---

## Database

Create a MariaDB database named:

```
erapor_db
```

Import the SQL database file into MariaDB before running the application.

---

# Documentation

The complete project documentation can be accessed through the following links.

| Document | Link |
|----------|------|
| 📄 Final Report | *(Add Google Drive Link)* |
| 📑 Software Requirements Specification (SRS) | *(Add Google Drive Link)* |
| 📊 Presentation Slides | *(Add Google Drive Link)* |
| 🎥 Demo Video | *(Add YouTube Link)* |
| 🎬 Presentation Video | *(Add YouTube Link)* |
| 🖼️ Poster | *(Add Google Drive Link)* |
| 📜 Copyright / HKI | *(Add Link if available)* |

---

# Development Team

Project-Based Learning (PBL)

Bachelor of Applied Informatics Engineering

Politeknik Negeri Batam

| Name | Role |
|------|------|
| Raid Aqil Athallah - 3312401022 | Fullstack |
| Frima Rizky Lianda - 3312401016 | Fullstack |

---

# SDGs Contribution

This project supports **Sustainable Development Goal (SDG) 4: Quality Education** by providing a digital academic information system that improves the efficiency, accuracy, and accessibility of student report management at SDIT Ulil Albab Batam.

---

# License

This project was developed for educational purposes as part of the **Project-Based Learning (PBL)** course at the **Bachelor of Applied Informatics Engineering Study Program, Politeknik Negeri Batam**.

© 2026 E-Rapor SDIT Ulil Albab Batam. All rights reserved.