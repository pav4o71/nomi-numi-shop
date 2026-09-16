ALTER TABLE "inventory_movements" ADD COLUMN "delta_on_hand" integer;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "delta_reserved" integer;--> statement-breakpoint
UPDATE "inventory_movements" SET "delta_on_hand" = "delta", "delta_reserved" = 0;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "delta_on_hand" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "delta_reserved" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" DROP COLUMN "delta";--> statement-breakpoint
ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_variant_id_product_variants_id_fk";--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;
