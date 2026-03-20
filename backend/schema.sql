-- ============================================================
-- Ecom Platform — MySQL Database Schema
-- Company: Webon Ecomm Private Limited
-- Run this file once to set up all tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecom_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecom_db;

-- ============================================================
-- TABLE 1: users
-- Stores both buyers and sellers (role field differentiates)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)        NOT NULL,
  email         VARCHAR(191)        NOT NULL UNIQUE,
  password_hash VARCHAR(255)        NOT NULL,
  role          ENUM('buyer','seller') NOT NULL DEFAULT 'buyer',
  phone         VARCHAR(20)         DEFAULT NULL,
  avatar_url    VARCHAR(512)        DEFAULT NULL,
  fcm_token     VARCHAR(512)        DEFAULT NULL,   -- Firebase push token (sellers)
  is_active     TINYINT(1)          NOT NULL DEFAULT 1,
  created_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role  (role)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 2: shops
-- One shop per seller
-- ============================================================
CREATE TABLE IF NOT EXISTS shops (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id     INT UNSIGNED        NOT NULL,
  name          VARCHAR(150)        NOT NULL,
  description   TEXT                DEFAULT NULL,
  logo_url      VARCHAR(512)        DEFAULT NULL,
  banner_url    VARCHAR(512)        DEFAULT NULL,
  category      VARCHAR(100)        DEFAULT NULL,   -- e.g. Clothing, Electronics
  address       VARCHAR(255)        DEFAULT NULL,
  city          VARCHAR(100)        DEFAULT NULL,
  is_live       TINYINT(1)          NOT NULL DEFAULT 0,   -- 1 = currently broadcasting
  is_active     TINYINT(1)          NOT NULL DEFAULT 1,
  created_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shop_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_seller   (seller_id),
  INDEX idx_is_live  (is_live)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 3: products
-- Products belong to a shop
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id         INT UNSIGNED        NOT NULL,
  name            VARCHAR(200)        NOT NULL,
  description     TEXT                DEFAULT NULL,
  price           DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
  stock_qty       INT UNSIGNED        NOT NULL DEFAULT 0,
  category        VARCHAR(100)        DEFAULT NULL,
  -- Garment-specific fields for AR try-on
  garment_width_cm  DECIMAL(6,2)      DEFAULT NULL,   -- measured shoulder width
  garment_height_cm DECIMAL(6,2)      DEFAULT NULL,   -- measured length
  sizes_available   VARCHAR(100)      DEFAULT NULL,   -- e.g. "S,M,L,XL"
  image_urls      JSON                DEFAULT NULL,   -- array of Cloudinary URLs
  is_active       TINYINT(1)          NOT NULL DEFAULT 1,
  created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_shop      (shop_id),
  INDEX idx_category  (category),
  FULLTEXT idx_ft_name (name, description)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 4: live_sessions
-- Tracks each Go-Live session of a seller
-- ============================================================
CREATE TABLE IF NOT EXISTS live_sessions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id       INT UNSIGNED        NOT NULL,
  seller_id     INT UNSIGNED        NOT NULL,
  agora_channel VARCHAR(191)        NOT NULL UNIQUE,  -- unique channel name for Agora
  started_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at      TIMESTAMP           DEFAULT NULL,
  viewer_count  INT UNSIGNED        NOT NULL DEFAULT 0,
  status        ENUM('live','ended') NOT NULL DEFAULT 'live',
  CONSTRAINT fk_ls_shop   FOREIGN KEY (shop_id)   REFERENCES shops(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ls_seller FOREIGN KEY (seller_id) REFERENCES users(id)  ON DELETE CASCADE,
  INDEX idx_ls_shop    (shop_id),
  INDEX idx_ls_status  (status)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 5: call_sessions
-- Each Talk-to-Salesperson video call
-- ============================================================
CREATE TABLE IF NOT EXISTS call_sessions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  buyer_id        INT UNSIGNED        NOT NULL,
  seller_id       INT UNSIGNED        NOT NULL,
  shop_id         INT UNSIGNED        NOT NULL,
  agora_channel   VARCHAR(191)        NOT NULL UNIQUE,
  status          ENUM('pending','accepted','rejected','ended') NOT NULL DEFAULT 'pending',
  ar_active       TINYINT(1)          NOT NULL DEFAULT 0,  -- 1 = AR try-on in progress
  started_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at     TIMESTAMP           DEFAULT NULL,
  ended_at        TIMESTAMP           DEFAULT NULL,
  CONSTRAINT fk_cs_buyer  FOREIGN KEY (buyer_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_cs_seller FOREIGN KEY (seller_id) REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_cs_shop   FOREIGN KEY (shop_id)   REFERENCES shops(id)  ON DELETE CASCADE,
  INDEX idx_cs_buyer   (buyer_id),
  INDEX idx_cs_seller  (seller_id),
  INDEX idx_cs_status  (status)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 6: messages
-- Chat messages — both live-session chat and call chat
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id       INT UNSIGNED        NOT NULL,
  -- exactly one of these should be set (live session OR call session)
  live_session_id INT UNSIGNED        DEFAULT NULL,
  call_session_id INT UNSIGNED        DEFAULT NULL,
  content         TEXT                NOT NULL,
  message_type    ENUM('text','image','product_card') NOT NULL DEFAULT 'text',
  meta_json       JSON                DEFAULT NULL,   -- e.g. product card payload
  sent_at         TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id)       REFERENCES users(id)          ON DELETE CASCADE,
  CONSTRAINT fk_msg_ls     FOREIGN KEY (live_session_id) REFERENCES live_sessions(id)  ON DELETE CASCADE,
  CONSTRAINT fk_msg_cs     FOREIGN KEY (call_session_id) REFERENCES call_sessions(id)  ON DELETE CASCADE,
  INDEX idx_msg_ls  (live_session_id),
  INDEX idx_msg_cs  (call_session_id),
  INDEX idx_msg_sender (sender_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 7: cart_items
-- Buyer's shopping cart
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  buyer_id    INT UNSIGNED        NOT NULL,
  product_id  INT UNSIGNED        NOT NULL,
  quantity    INT UNSIGNED        NOT NULL DEFAULT 1,
  size        VARCHAR(10)         DEFAULT NULL,   -- selected size e.g. M
  added_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_buyer   FOREIGN KEY (buyer_id)   REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_cart_item (buyer_id, product_id, size),
  INDEX idx_cart_buyer (buyer_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 8: orders
-- One order per checkout (can have many items)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  buyer_id            INT UNSIGNED        NOT NULL,
  shop_id             INT UNSIGNED        NOT NULL,
  total_amount        DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
  status              ENUM('pending','confirmed','shipped','delivered','cancelled')
                                          NOT NULL DEFAULT 'pending',
  shipping_address    TEXT                DEFAULT NULL,
  razorpay_order_id   VARCHAR(191)        DEFAULT NULL,
  payment_status      ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
  placed_at           TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_buyer FOREIGN KEY (buyer_id) REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_order_shop  FOREIGN KEY (shop_id)  REFERENCES shops(id)  ON DELETE CASCADE,
  INDEX idx_order_buyer  (buyer_id),
  INDEX idx_order_shop   (shop_id),
  INDEX idx_order_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 9: order_items
-- Line items within an order
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    INT UNSIGNED        NOT NULL,
  product_id  INT UNSIGNED        NOT NULL,
  quantity    INT UNSIGNED        NOT NULL DEFAULT 1,
  size        VARCHAR(10)         DEFAULT NULL,
  unit_price  DECIMAL(10,2)       NOT NULL,    -- price at time of purchase
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_oi_order   (order_id),
  INDEX idx_oi_product (product_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 10: payments
-- Razorpay payment records
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id              INT UNSIGNED        NOT NULL,
  buyer_id              INT UNSIGNED        NOT NULL,
  razorpay_order_id     VARCHAR(191)        NOT NULL,
  razorpay_payment_id   VARCHAR(191)        DEFAULT NULL,
  razorpay_signature    VARCHAR(512)        DEFAULT NULL,
  amount                DECIMAL(10,2)       NOT NULL,
  currency              VARCHAR(10)         NOT NULL DEFAULT 'INR',
  status                ENUM('created','captured','failed','refunded')
                                            NOT NULL DEFAULT 'created',
  paid_at               TIMESTAMP           DEFAULT NULL,
  created_at            TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_buyer FOREIGN KEY (buyer_id) REFERENCES users(id)  ON DELETE CASCADE,
  INDEX idx_pay_order   (order_id),
  INDEX idx_pay_rzp_oid (razorpay_order_id),
  INDEX idx_pay_rzp_pid (razorpay_payment_id)
) ENGINE=InnoDB;

-- ============================================================
-- Done. 10 tables created successfully.
-- ============================================================
