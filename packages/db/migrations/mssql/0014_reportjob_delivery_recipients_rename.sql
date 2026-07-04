-- Fix column name if 0013 created snake_case delivery_recipients

IF COL_LENGTH('analytics.ReportJobs', 'DeliveryRecipients') IS NULL
   AND COL_LENGTH('analytics.ReportJobs', 'delivery_recipients') IS NOT NULL
  EXEC sp_rename 'analytics.ReportJobs.delivery_recipients', 'DeliveryRecipients', 'COLUMN';
