CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"tg_user_id" varchar(64) NOT NULL,
	"username" varchar(255),
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "admins_tg_user_id_unique" UNIQUE("tg_user_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"icon" varchar(10),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drop_counter" (
	"id" serial PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drops" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_id" varchar(8) NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"category_id" integer NOT NULL,
	"price" numeric(12, 2),
	"description" text,
	"image_url" varchar(512),
	"cutout_url" varchar(512),
	"specifications" text,
	"remaining" integer DEFAULT 1,
	"brand" varchar(255),
	"published_message_id" integer,
	"scheduled_at" timestamp,
	"is_published" boolean DEFAULT false,
	"views" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "drops_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tg_user_id" varchar(64) NOT NULL,
	"username" varchar(255),
	"first_name" varchar(255),
	"is_active" boolean DEFAULT true,
	"subscribed_at" timestamp DEFAULT now(),
	"last_notified_at" timestamp,
	CONSTRAINT "subscribers_tg_user_id_unique" UNIQUE("tg_user_id")
);
