-- Add salesforce_case_id column to maintenance_tasks table
-- This stores the Salesforce Case ID returned from Workato after creating a maintenance task

ALTER TABLE maintenance_tasks ADD COLUMN salesforce_case_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_salesforce_case_id 
  ON maintenance_tasks(salesforce_case_id) WHERE salesforce_case_id IS NOT NULL;
