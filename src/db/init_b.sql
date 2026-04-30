CREATE DATABASE IF NOT EXISTS bankb;
USE bankb;

CREATE TABLE accounts (
    id VARCHAR(34) PRIMARY KEY,
    balance DECIMAL(10,2) NOT NULL
);

CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    datetime DATETIME NOT NULL,
    po_id VARCHAR(50),
    account_id VARCHAR(34),
    isvalid BIT,
    iscomplete BIT,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE po_new (
    po_id VARCHAR(50) PRIMARY KEY,
    po_amount DECIMAL(10,2) NOT NULL,
    po_message VARCHAR(255),
    po_datetime DATETIME,
    ob_id VARCHAR(20),
    oa_id VARCHAR(34),
    ob_code VARCHAR(20),
    bb_id VARCHAR(20),
    ba_id VARCHAR(34),
    FOREIGN KEY (oa_id) REFERENCES accounts(id)
);

CREATE TABLE po_out (
    po_id VARCHAR(50) PRIMARY KEY,
    po_amount DECIMAL(10,2),
    po_message VARCHAR(255),
    po_datetime DATETIME,
    ob_id VARCHAR(20),
    oa_id VARCHAR(34),
    ob_code VARCHAR(20),
    ob_datetime DATETIME,
    cb_code VARCHAR(20),
    cb_datetime DATETIME,
    bb_id VARCHAR(20),
    ba_id VARCHAR(34),
    bb_code VARCHAR(20),
    bb_datetime DATETIME,
    FOREIGN KEY (oa_id) REFERENCES accounts(id)
);

CREATE TABLE po_in (
    po_id VARCHAR(50) PRIMARY KEY,
    po_amount DECIMAL(10,2),
    po_message VARCHAR(255),
    po_datetime DATETIME,
    ob_id VARCHAR(20),
    oa_id VARCHAR(34),
    ob_code VARCHAR(20),
    ob_datetime DATETIME,
    cb_code VARCHAR(20),
    cb_datetime DATETIME,
    bb_id VARCHAR(20),
    ba_id VARCHAR(34),
    bb_code VARCHAR(20),
    bb_datetime DATETIME,
    FOREIGN KEY (ba_id) REFERENCES accounts(id)
);

CREATE TABLE ack_in (
    po_id VARCHAR(50) PRIMARY KEY,
    ob_id VARCHAR(20),
    cb_code VARCHAR(20),
    cb_datetime DATETIME,
    po_amount DECIMAL(10,2),
    po_message VARCHAR(255),
    po_datetime DATETIME,
    oa_id VARCHAR(34),
    ob_code VARCHAR(20),
    ob_datetime DATETIME,
    bb_id VARCHAR(20),
    ba_id VARCHAR(34),
    bb_code VARCHAR(20),
    bb_datetime DATETIME
);

CREATE TABLE ack_out (
    po_id VARCHAR(50) PRIMARY KEY,
    bb_id VARCHAR(20),
    ba_id VARCHAR(34),
    bb_code VARCHAR(20),
    bb_datetime DATETIME,
    po_amount DECIMAL(10,2),
    po_message VARCHAR(255),
    po_datetime DATETIME,
    ob_id VARCHAR(20),
    oa_id VARCHAR(34),
    ob_code VARCHAR(20),
    ob_datetime DATETIME,
    cb_code VARCHAR(20),
    cb_datetime DATETIME
);

CREATE TABLE log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datetime DATETIME NOT NULL,
    message VARCHAR(255),
    type VARCHAR(50),
    po_id VARCHAR(50),
    po_amount DECIMAL(10,2),
    po_message VARCHAR(255),
    po_datetime DATETIME,
    ob_id VARCHAR(20),
    oa_id VARCHAR(34),
    ob_code VARCHAR(20),
    ob_datetime DATETIME,
    cb_code VARCHAR(20),
    cb_datetime DATETIME,
    bb_id VARCHAR(20),
    ba_id VARCHAR(34),
    bb_code VARCHAR(20),
    bb_datetime DATETIME
);

INSERT INTO accounts (id, balance) VALUES
('BE10111111111111', 5000.00),
('BE10222222222222', 5000.00),
('BE10333333333333', 5000.00);

INSERT INTO log (datetime, message, type, po_id)
VALUES (NOW(), 'Bank B database gevuld met testdata', 'general', NULL);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(64) NOT NULL,
  role ENUM('admin','user') DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO users (username, password_hash, role)
VALUES ('admin', SHA2('admin', 256), 'admin');
