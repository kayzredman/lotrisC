-- Sprint 20: Onboarding Wizard
-- Tracks whether a tenant admin has completed the guided onboarding flow.
-- NULL = not yet completed. Set to GETUTCDATE() when wizard Step 5 is finished.

ALTER TABLE Tenants
  ADD onboarding_completed_at DATETIME2(3) NULL;
