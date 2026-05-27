ALTER TABLE "agent_configs" ALTER COLUMN "business_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "agent_configs" ALTER COLUMN "business_id" DROP NOT NULL;