ALTER TABLE "subscriptions" ADD COLUMN "provider_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "current_period_end" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_sub_unique" ON "subscriptions" USING btree ("provider_subscription_id");