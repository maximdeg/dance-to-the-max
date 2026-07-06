CREATE TYPE "public"."level" AS ENUM('primeras_veces', 'principiante', 'intermedio', 'avanzado', 'max');--> statement-breakpoint
CREATE TABLE "dances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text NOT NULL,
	"min_tier_rank" integer DEFAULT 1 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label_es" text NOT NULL,
	"label_en" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_tags" (
	"video_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "video_tags_video_id_tag_id_pk" PRIMARY KEY("video_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dance_id" uuid NOT NULL,
	"level" "level" NOT NULL,
	"title_es" text NOT NULL,
	"title_en" text NOT NULL,
	"description_es" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"provider_asset_id" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_tags" ADD CONSTRAINT "video_tags_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_tags" ADD CONSTRAINT "video_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_dance_id_dances_id_fk" FOREIGN KEY ("dance_id") REFERENCES "public"."dances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_label_es_unique" ON "tags" USING btree ("label_es");--> statement-breakpoint
CREATE INDEX "videos_dance_id_idx" ON "videos" USING btree ("dance_id");