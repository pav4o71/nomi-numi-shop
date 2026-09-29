ALTER TABLE "cart_items" ALTER COLUMN "added_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "added_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;