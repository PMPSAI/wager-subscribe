-- Migration: Admin Portal Schema
-- Adds merchant onboarding/approval workflow fields, compliance fields, and admin audit log

-- Create enums
DO $$ BEGIN
  CREATE TYPE "merchantOnboardingStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "adminAuditAction" AS ENUM (
    'merchant_approved', 'merchant_rejected', 'merchant_suspended', 'merchant_reactivated',
    'user_role_changed', 'user_password_reset', 'user_suspended',
    'compliance_note_added', 'market_synced', 'market_toggled',
    'settings_changed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to merchants table
ALTER TABLE "merchants"
  ADD COLUMN IF NOT EXISTS "onboardingStatus" "merchantOnboardingStatus" NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS "rejectionReason" text,
  ADD COLUMN IF NOT EXISTS "complianceNotes" text,
  ADD COLUMN IF NOT EXISTS "approvedAt" timestamp,
  ADD COLUMN IF NOT EXISTS "approvedBy" integer,
  ADD COLUMN IF NOT EXISTS "businessType" varchar(64),
  ADD COLUMN IF NOT EXISTS "website" varchar(255);

-- Update existing approved merchants (isActive = true) to have approved status
UPDATE "merchants" SET "onboardingStatus" = 'approved' WHERE "isActive" = true;
UPDATE "merchants" SET "onboardingStatus" = 'suspended' WHERE "isActive" = false;

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS "adminAuditLog" (
  "id" serial PRIMARY KEY NOT NULL,
  "adminUserId" integer NOT NULL,
  "adminName" varchar(255),
  "action" "adminAuditAction" NOT NULL,
  "targetType" varchar(64),
  "targetId" integer,
  "targetName" varchar(255),
  "notes" text,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
