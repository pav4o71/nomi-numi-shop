ALTER TABLE "inventory_movements" ADD COLUMN "delta_on_hand" integer;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "delta_reserved" integer;--> statement-breakpoint
-- Reason-aware backfill of the Phase 4 overloaded `delta` column.
-- Old encoder (recordInventoryMovement): delta = (deltaOnHand !== 0 ? deltaOnHand : deltaReserved).
-- Reserved-magnitude reasons used by the app/tests: 'reserve', 'release' (copied with original sign).
-- On-hand reasons from the admin form: 'restock', 'manual_adjustment', 'return'.
-- LIMIT: mixed rows (non-zero on-hand AND reserved in one movement) cannot be reconstructed.
-- When deltaOnHand !== 0 the old encoder discarded reserved magnitude, so those rows
-- backfill as on-hand-only; SUM(delta_reserved) will undercount mixed history.
UPDATE "inventory_movements" SET
  "delta_on_hand" = CASE
    WHEN lower(btrim("reason")) IN ('reserve', 'release') THEN 0
    ELSE "delta"
  END,
  "delta_reserved" = CASE
    WHEN lower(btrim("reason")) IN ('reserve', 'release') THEN "delta"
    ELSE 0
  END;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "delta_on_hand" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "delta_reserved" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" DROP COLUMN "delta";--> statement-breakpoint
ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_variant_id_product_variants_id_fk";--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;
