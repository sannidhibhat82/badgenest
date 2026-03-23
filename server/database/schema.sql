-- BadgeNest - Microsoft SQL Server schema
-- Run this script against your DB_DATABASE to create tables.

-- Users (replaces Supabase auth.users + profiles)
CREATE TABLE users (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  email NVARCHAR(255) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,
  email_verified BIT NOT NULL DEFAULT 0,
  full_name NVARCHAR(500),
  avatar_url NVARCHAR(2048),
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- User roles
CREATE TABLE user_roles (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role NVARCHAR(50) NOT NULL DEFAULT 'learner' CHECK (role IN ('admin', 'learner')),
  UNIQUE (user_id, role)
);
GO

-- Issuers
CREATE TABLE issuers (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(500) NOT NULL,
  description NVARCHAR(MAX),
  email NVARCHAR(255),
  website NVARCHAR(2048),
  logo_url NVARCHAR(2048),
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Badge classes
CREATE TABLE badge_classes (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  issuer_id UNIQUEIDENTIFIER NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  name NVARCHAR(500) NOT NULL,
  description NVARCHAR(MAX),
  image_url NVARCHAR(2048),
  criteria NVARCHAR(MAX),
  expiry_days INT,
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Assertions (issued badges)
CREATE TABLE assertions (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  badge_class_id UNIQUEIDENTIFIER NOT NULL REFERENCES badge_classes(id) ON DELETE CASCADE,
  recipient_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  expires_at DATETIME2,
  evidence_url NVARCHAR(2048),
  revoked BIT NOT NULL DEFAULT 0,
  revocation_reason NVARCHAR(MAX),
  signature NVARCHAR(MAX),
  snapshot_json NVARCHAR(MAX),
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Tags
CREATE TABLE tags (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(255) NOT NULL UNIQUE,
  color NVARCHAR(50) NOT NULL DEFAULT '#6366f1',
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Profile tags (user-tag junction)
CREATE TABLE profile_tags (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  profile_user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id UNIQUEIDENTIFIER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  UNIQUE (profile_user_id, tag_id)
);
GO

-- API keys
CREATE TABLE api_keys (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  key_hash NVARCHAR(255) NOT NULL,
  key_prefix NVARCHAR(20) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  created_by UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permissions NVARCHAR(MAX),
  expires_at DATETIME2,
  last_used_at DATETIME2,
  revoked BIT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Webhooks
CREATE TABLE webhooks (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  url NVARCHAR(2048) NOT NULL,
  events NVARCHAR(MAX) NOT NULL,
  secret NVARCHAR(255) NOT NULL,
  active BIT NOT NULL DEFAULT 1,
  created_by UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  failure_count INT NOT NULL DEFAULT 0,
  last_triggered_at DATETIME2,
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Audit logs
CREATE TABLE audit_logs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  actor_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action NVARCHAR(255) NOT NULL,
  entity_type NVARCHAR(255) NOT NULL,
  entity_id UNIQUEIDENTIFIER,
  details NVARCHAR(MAX),
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Badge invites
CREATE TABLE badge_invites (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  badge_class_id UNIQUEIDENTIFIER NOT NULL REFERENCES badge_classes(id) ON DELETE CASCADE,
  email NVARCHAR(255) NOT NULL,
  invite_token NVARCHAR(255) NOT NULL,
  status NVARCHAR(50) NOT NULL DEFAULT 'pending',
  invited_by UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimed_by UNIQUEIDENTIFIER REFERENCES users(id),
  claimed_at DATETIME2,
  evidence_url NVARCHAR(2048),
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Badge categories
CREATE TABLE badge_categories (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(255) NOT NULL,
  color NVARCHAR(50),
  description NVARCHAR(MAX),
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Badge class categories (junction)
CREATE TABLE badge_class_categories (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  badge_class_id UNIQUEIDENTIFIER NOT NULL REFERENCES badge_classes(id) ON DELETE CASCADE,
  category_id UNIQUEIDENTIFIER NOT NULL REFERENCES badge_categories(id) ON DELETE CASCADE,
  UNIQUE (badge_class_id, category_id)
);
GO

-- Badge views
CREATE TABLE badge_views (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  assertion_id UNIQUEIDENTIFIER NOT NULL REFERENCES assertions(id) ON DELETE CASCADE,
  viewed_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  viewer_hash NVARCHAR(255)
);
GO

-- Notifications
CREATE TABLE notifications (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title NVARCHAR(500) NOT NULL,
  message NVARCHAR(MAX) NOT NULL,
  [read] BIT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Email verification tokens
CREATE TABLE email_verifications (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash NVARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME2 NOT NULL,
  used_at DATETIME2,
  created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Indexes for common lookups
CREATE INDEX IX_assertions_recipient ON assertions(recipient_id);
CREATE INDEX IX_assertions_badge_class ON assertions(badge_class_id);
CREATE INDEX IX_user_roles_user ON user_roles(user_id);
CREATE INDEX IX_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IX_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IX_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IX_badge_invites_token ON badge_invites(invite_token);
CREATE INDEX IX_notifications_user ON notifications(user_id);
CREATE INDEX IX_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IX_email_verifications_expires ON email_verifications(expires_at);
GO
