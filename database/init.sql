CREATE DATABASE IF NOT EXISTS nasab_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nasab_db;

-- 1. جدول المستخدمين
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'supervisor', 'member') NOT NULL DEFAULT 'member',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB;

-- 2. جدول أشجار العائلات
CREATE TABLE family_trees (
    id CHAR(36) PRIMARY KEY,
    tree_name VARCHAR(200) NOT NULL,
    family_name VARCHAR(100) NOT NULL,
    description TEXT,
    root_person_id CHAR(36) NULL,
    created_by CHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. جدول الأشخاص (أفراد النسب)
CREATE TABLE persons (
    id CHAR(36) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100) NOT NULL,
    grandfather_name VARCHAR(100) NULL,
    full_name VARCHAR(300) NOT NULL,
    status ENUM('alive', 'deceased', 'martyr') NOT NULL DEFAULT 'alive',
    birth_date DATE NULL,
    death_date DATE NULL,
    notes TEXT NULL,
    location VARCHAR(200) NULL,
    parent_id CHAR(36) NULL,
    family_tree_id CHAR(36) NOT NULL,
    added_by CHAR(36) NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES persons(id) ON DELETE SET NULL,
    FOREIGN KEY (family_tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_id),
    INDEX idx_tree (family_tree_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- 4. جدول الطلبات المعلقة
CREATE TABLE pending_requests (
    id CHAR(36) PRIMARY KEY,
    person_name VARCHAR(300) NOT NULL,
    father_name VARCHAR(300) NOT NULL,
    parent_id CHAR(36) NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    birth_date DATE NULL,
    notes TEXT NULL,
    requested_by CHAR(36) NOT NULL,
    reviewed_by CHAR(36) NULL,
    reviewed_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES persons(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- 5. جدول الوثائق
CREATE TABLE documents (
    id CHAR(36) PRIMARY KEY,
    pending_request_id CHAR(36) NULL,
    person_id CHAR(36) NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INT NOT NULL,
    uploaded_by CHAR(36) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by CHAR(36) NULL,
    verified_at TIMESTAMP NULL,
    FOREIGN KEY (pending_request_id) REFERENCES pending_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6. جدول الإشعارات
CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- 7. جدول سجل النشاطات
CREATE TABLE activity_logs (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NULL,
    record_id CHAR(36) NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_time (user_id, created_at)
) ENGINE=InnoDB;