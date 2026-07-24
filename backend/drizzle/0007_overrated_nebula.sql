ALTER TABLE "subscribers" ADD COLUMN "push_endpoint" varchar(512);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "push_p256dh" varchar(128);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "push_auth" varchar(64);