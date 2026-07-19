# E-Rapor SDIT Ulil Albab Batam — Web Based Student Report Management Information System

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

The functional requirements define the primary capabilities of the E-Rapor system in supporting academic administration activities at SDIT Ulil Albab Batam. The application provides different functionalities based on user roles to ensure efficient and secure management of academic data.

| ID | Requirement | User Role |
|----|-------------|-----------|
| FR-01 | User Authentication (Login & Logout) | All Users |
| FR-02 | Dashboard Management | All Users |
| FR-03 | Academic Year Management | Administrator |
| FR-04 | User & Teacher Management | Administrator |
| FR-05 | Student Management | Administrator |
| FR-06 | Class & Subject Management | Administrator |
| FR-07 | Teaching Assignment Management | Administrator |
| FR-08 | School Configuration | Administrator |
| FR-09 | Assessment Configuration | Homeroom Teacher, Subject Teacher |
| FR-10 | Student Score Management | Homeroom Teacher, Subject Teacher |
| FR-11 | Attendance Management | Homeroom Teacher |
| FR-12 | Cocurricular & Extracurricular Assessment | Homeroom Teacher |
| FR-13 | Report Card Generation & Archive | Homeroom Teacher, Administrator |
| FR-14 | Database Backup & Restore | Administrator |

> **Note:** The complete list of **44 Functional Requirements (FR-01 to FR-44)** is available in the Software Requirements Specification (SRS) and Project Documentation.

---

# Non-Functional Requirements

The non-functional requirements define the quality attributes that ensure the E-Rapor system operates efficiently, securely, and reliably during daily academic activities.

| ID | Category | Description |
|----|----------|-------------|
| NFR-01 | Performance | The system should maintain an average response time of no more than **3 seconds** under normal operating conditions. |
| NFR-02 | Security | Passwords are encrypted using hashing mechanisms, while API access is secured using **JSON Web Token (JWT)** authentication. |
| NFR-03 | Authorization | Access to academic data is restricted based on user roles (Administrator, Homeroom Teacher, and Subject Teacher). |
| NFR-04 | Usability | The interface is designed to be intuitive and easy to learn by school staff with minimal training. |
| NFR-05 | Consistency | The application maintains a consistent user interface across all modules and user roles. |
| NFR-06 | Compatibility | The system is compatible with modern web browsers including Google Chrome, Microsoft Edge, Mozilla Firefox, and Safari. |
| NFR-07 | Scalability | The system is designed to support up to **100 concurrent users** without significant performance degradation. |
| NFR-08 | Data Integrity | Student academic records and assessment data are maintained consistently without duplication. |
| NFR-09 | Reliability | Backup and restore mechanisms are provided to ensure data availability and recovery. |
| NFR-10 | Error Handling | The system provides clear and informative error messages instead of technical exceptions. |

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

© 2026 E-Rapor SDIT Ulil Albab Batam. Developed by Raid Aqil Athallah and Frima Rizky Lianda, Politeknik Negeri Batam.