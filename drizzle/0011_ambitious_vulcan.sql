CREATE TABLE "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"currency" text,
	"min_spend" integer,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_value_chk" CHECK ("promotions"."value" > 0),
	CONSTRAINT "promotions_currency_chk" CHECK (("promotions"."type" = 'fixed_amount' AND "promotions"."currency" IS NOT NULL) OR ("promotions"."type" = 'percentage'))
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_total_sum_chk";--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "promo_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_code_uidx" ON "promotions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promotions_active_idx" ON "promotions" USING btree ("active");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_nonneg_chk" CHECK ("orders"."discount_amount" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_sum_chk" CHECK ("orders"."total_amount" = "orders"."subtotal_amount" + "orders"."shipping_amount" + "orders"."tax_amount" - "orders"."discount_amount");