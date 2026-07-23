ALTER TABLE "subscribers" DROP CONSTRAINT "subscribers_tg_user_id_unique";--> statement-breakpoint
ALTER TABLE "subscribers" ALTER COLUMN "tg_user_id" DROP NOT NULL;