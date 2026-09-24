CREATE TABLE "inventory_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_reservations_order_variant_uidx" UNIQUE("order_id","variant_id"),
	CONSTRAINT "inventory_reservations_quantity_positive_chk" CHECK ("inventory_reservations"."quantity" > 0),
	CONSTRAINT "inventory_reservations_status_chk" CHECK ("inventory_reservations"."status" IN ('active', 'committed', 'released', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_provider_event_uidx" UNIQUE("provider","provider_event_id"),
	CONSTRAINT "payment_events_provider_chk" CHECK ("payment_events"."provider" IN ('mock')),
	CONSTRAINT "payment_events_status_chk" CHECK ("payment_events"."status" IN ('paid', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_idempotency_key_unique";--> statement-breakpoint
DROP INDEX "cart_items_cart_variant_idx";--> statement-breakpoint
DROP INDEX "carts_customer_idx";--> statement-breakpoint
DROP INDEX "carts_session_idx";--> statement-breakpoint
ALTER TABLE "customer_addresses" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_addresses" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "customer_addresses" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_addresses" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'pending';--> statement-breakpoint
UPDATE "orders" SET "payment_status" = 'pending' WHERE "payment_status" = 'unpaid';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "selected_options" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "line_total" integer;--> statement-breakpoint
UPDATE "order_items" SET "line_total" = "unit_price" * "quantity";--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "line_total" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal_amount" integer;--> statement-breakpoint
UPDATE "orders" SET "subtotal_amount" = "total_amount";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "subtotal_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_scope" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "request_fingerprint" text;--> statement-breakpoint
UPDATE "orders" SET
	"idempotency_scope" = CASE
		WHEN "customer_id" IS NOT NULL THEN 'customer:' || "customer_id"
		ELSE 'legacy:' || "id"
	END,
	"request_fingerprint" = 'legacy:' || "id";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "idempotency_scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "request_fingerprint" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_access_token_digest" text;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_reservations_active_expiry_idx" ON "inventory_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "payment_events_order_idx" ON "payment_events" USING btree ("order_id");--> statement-breakpoint
DELETE FROM "carts" WHERE "customer_id" IS NULL AND "session_id" IS NULL;--> statement-breakpoint
UPDATE "carts" SET "session_id" = NULL WHERE "customer_id" IS NOT NULL;--> statement-breakpoint
WITH ranked AS (
	SELECT "id", first_value("id") OVER (
		PARTITION BY "customer_id" ORDER BY "updated_at" DESC, "created_at" DESC, "id"
	) AS keeper_id,
	row_number() OVER (
		PARTITION BY "customer_id" ORDER BY "updated_at" DESC, "created_at" DESC, "id"
	) AS position
	FROM "carts" WHERE "customer_id" IS NOT NULL
)
UPDATE "cart_items" AS item SET "cart_id" = ranked.keeper_id
FROM ranked WHERE item."cart_id" = ranked."id" AND ranked.position > 1;--> statement-breakpoint
WITH ranked AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "customer_id" ORDER BY "updated_at" DESC, "created_at" DESC, "id"
	) AS position
	FROM "carts" WHERE "customer_id" IS NOT NULL
)
DELETE FROM "carts" USING ranked
WHERE "carts"."id" = ranked."id" AND ranked.position > 1;--> statement-breakpoint
WITH ranked AS (
	SELECT "id", first_value("id") OVER (
		PARTITION BY "session_id" ORDER BY "updated_at" DESC, "created_at" DESC, "id"
	) AS keeper_id,
	row_number() OVER (
		PARTITION BY "session_id" ORDER BY "updated_at" DESC, "created_at" DESC, "id"
	) AS position
	FROM "carts" WHERE "session_id" IS NOT NULL
)
UPDATE "cart_items" AS item SET "cart_id" = ranked.keeper_id
FROM ranked WHERE item."cart_id" = ranked."id" AND ranked.position > 1;--> statement-breakpoint
WITH ranked AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "session_id" ORDER BY "updated_at" DESC, "created_at" DESC, "id"
	) AS position
	FROM "carts" WHERE "session_id" IS NOT NULL
)
DELETE FROM "carts" USING ranked
WHERE "carts"."id" = ranked."id" AND ranked.position > 1;--> statement-breakpoint
WITH duplicates AS (
	SELECT "cart_id", "variant_id", min("id") AS keeper_id, sum("quantity")::integer AS total_quantity
	FROM "cart_items" GROUP BY "cart_id", "variant_id" HAVING count(*) > 1
)
UPDATE "cart_items" AS item SET "quantity" = duplicates.total_quantity
FROM duplicates WHERE item."id" = duplicates.keeper_id;--> statement-breakpoint
WITH duplicates AS (
	SELECT "cart_id", "variant_id", min("id") AS keeper_id
	FROM "cart_items" GROUP BY "cart_id", "variant_id" HAVING count(*) > 1
)
DELETE FROM "cart_items" AS item USING duplicates
WHERE item."cart_id" = duplicates."cart_id"
	AND item."variant_id" = duplicates."variant_id"
	AND item."id" <> duplicates.keeper_id;--> statement-breakpoint
CREATE UNIQUE INDEX "carts_customer_uidx" ON "carts" USING btree ("customer_id") WHERE "carts"."customer_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "carts_session_uidx" ON "carts" USING btree ("session_id") WHERE "carts"."session_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "carts_expires_at_idx" ON "carts" USING btree ("expires_at");--> statement-breakpoint
WITH ranked_defaults AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "customer_id", "type"
		ORDER BY "updated_at" DESC, "created_at" DESC, "id"
	) AS position
	FROM "customer_addresses"
	WHERE "is_default" = true
)
UPDATE "customer_addresses" AS address
SET "is_default" = false
FROM ranked_defaults
WHERE address."id" = ranked_defaults."id" AND ranked_defaults.position > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_addresses_one_default_uidx" ON "customer_addresses" USING btree ("customer_id","type") WHERE "customer_addresses"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_guest_access_digest_uidx" ON "orders" USING btree ("guest_access_token_digest") WHERE "orders"."guest_access_token_digest" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_customer_created_idx" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_variant_uidx" UNIQUE("cart_id","variant_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_idempotency_scope_key_uidx" UNIQUE("idempotency_scope","idempotency_key");--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_quantity_positive_chk" CHECK ("cart_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_exactly_one_owner_chk" CHECK (("carts"."customer_id" IS NOT NULL) <> ("carts"."session_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_currency_chk" CHECK ("carts"."currency" IN ('PHP', 'USD'));--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_type_chk" CHECK ("customer_addresses"."type" IN ('billing', 'shipping'));--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_nonneg_chk" CHECK ("order_items"."unit_price" >= 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive_chk" CHECK ("order_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_line_total_nonneg_chk" CHECK ("order_items"."line_total" >= 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_line_total_sum_chk" CHECK ("order_items"."line_total" = "order_items"."unit_price" * "order_items"."quantity");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_currency_chk" CHECK ("orders"."currency" IN ('PHP', 'USD'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_status_chk" CHECK ("orders"."order_status" IN ('pending', 'confirmed', 'cancelled', 'completed'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_status_chk" CHECK ("orders"."payment_status" IN ('pending', 'paid', 'failed', 'refunded'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_fulfillment_status_chk" CHECK ("orders"."fulfillment_status" IN ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_subtotal_nonneg_chk" CHECK ("orders"."subtotal_amount" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_nonneg_chk" CHECK ("orders"."shipping_amount" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tax_nonneg_chk" CHECK ("orders"."tax_amount" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_nonneg_chk" CHECK ("orders"."total_amount" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_sum_chk" CHECK ("orders"."total_amount" = "orders"."subtotal_amount" + "orders"."shipping_amount" + "orders"."tax_amount");
