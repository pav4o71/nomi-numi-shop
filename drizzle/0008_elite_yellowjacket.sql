CREATE TABLE "guest_order_access_capabilities" (
	"token_digest" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_order_access_capabilities" ADD CONSTRAINT "guest_order_access_capabilities_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_order_access_capabilities_order_idx" ON "guest_order_access_capabilities" USING btree ("order_id");--> statement-breakpoint
INSERT INTO "guest_order_access_capabilities" ("token_digest", "order_id")
SELECT "guest_access_token_digest", "id"
FROM "orders"
WHERE "guest_access_token_digest" IS NOT NULL;--> statement-breakpoint
DROP INDEX "orders_guest_access_digest_uidx";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "guest_access_token_digest";
