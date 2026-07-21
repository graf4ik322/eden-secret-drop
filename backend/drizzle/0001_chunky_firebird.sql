ALTER TABLE "drops" ADD COLUMN "archived_reason" varchar(10);--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "notify_subscribers" boolean DEFAULT false;