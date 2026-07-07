CREATE TYPE "public"."billing_period" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"status" "subscription_status" NOT NULL,
	"billing_period" "billing_period" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rank" integer NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text NOT NULL,
	"monthly_price_cents" integer NOT NULL,
	"annual_price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_account_unique" ON "subscriptions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tiers_rank_unique" ON "tiers" USING btree ("rank");