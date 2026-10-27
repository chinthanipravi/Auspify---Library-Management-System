# 🌌 Aura LMS - Cyberpunk Library Management System

![Node.js](https://img.shields.io/badge/Node.js-v20.x-green?style=for-the-badge&logo=nodedotjs)
![Express.js](https://img.shields.io/badge/Express.js-4.x-black?style=for-the-badge&logo=express)
![MySQL](https://img.shields.io/badge/MySQL-Port_3307-blue?style=for-the-badge&logo=mysql)
![Frontend](https://img.shields.io/badge/Frontend-HTML5_|_CSS3_|_Vanilla_JS-orange?style=for-the-badge)

A modularized, production-ready web-based **Library Management System (LMS)** developed as part of **Auspify Task 2 (Software Development)**. Built with a Node.js/Express REST backend, MySQL database persistence, and a cyberpunk glassmorphic web UI.

---

## 🚀 Key Features & Task Workflow Alignment

- **Step 1: Book Management Module (CRUD)**
  - Full catalog viewing with Grid Card and Compact Table views.
  - Interactive book details modal, category filtering, search, and dynamic sorting.
  - Admin-side injection module for adding new book records persistently.
- **Step 2: Book Issue & Return Functionality**
  - Instant borrow/return execution.
  - Automated 14-day due date calculation for borrowed items.
  - Real-time status badge transitions (`Available` vs `Issued`).
  - Student loan restriction (Maximum 3 books per student).
- **Step 3: MySQL Database Integration**
  - Persistent relational storage for books and system activity telemetry logs.
  - Configured for XAMPP MySQL (Port 3307 / Default 3306 compatible).
- **Step 4: Report Generation**
  - One-click CSV report export for active library transactions and catalog logs.
- **Step 5: System Operations & Telemetry**
  - Live activity telemetry log terminal.
  - Role-based authorization switching between **Admin** and **Student**.
  - Interactive Canvas spatial particle background and toast notifications.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3 (Custom Glassmorphism & Cyberpunk Theme), JavaScript (ES6+)
- **Backend:** Node.js, Express.js (REST API Router)
- **Database:** MySQL (XAMPP / MySQL Workbench)
- **Database Driver:** `mysql2/promise`

---

## 📂 Project Structure

```text
Library Management System/
│
├── database.sql       # Database schema initialization & seed queries
├── server.js          # Node.js/Express API server & MySQL connection pool
├── index.html         # Application single-page workspace layout
├── style.css          # Cyberpunk dark theme styles & repaint glitch fixes
├── script.js          # Client-side API integration, rendering & filter engine
├── .gitignore         # File exclusions (node_modules)
└── README.md          # Project documentation