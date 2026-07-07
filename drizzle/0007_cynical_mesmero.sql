ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pending_tier_id" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pending_tier_id_tiers_id_fk" FOREIGN KEY ("pending_tier_id") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;