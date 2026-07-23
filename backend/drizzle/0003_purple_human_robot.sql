CREATE TABLE IF NOT EXISTS "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"locale" varchar(5) NOT NULL,
	"value" text,
	"section" varchar(50),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "mockups" ADD COLUMN IF NOT EXISTS "jpeg_url" varchar(512);
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "locale" varchar(5) DEFAULT 'en';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_translations_key_locale" ON "translations" USING btree ("key","locale");
