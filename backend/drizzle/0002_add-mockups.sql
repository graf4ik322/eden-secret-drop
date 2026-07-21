CREATE TABLE "mockups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"image_url" varchar(512),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "mockup_id" integer;--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "photos" text;