CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_uidx" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "collection_products" (
	"collection_id" text NOT NULL,
	"product_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collection_products_collection_product_uidx" UNIQUE("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_from" timestamp with time zone,
	"published_until" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_uidx" UNIQUE("slug"),
	CONSTRAINT "collections_publish_window_chk" CHECK ("collections"."published_until" IS NULL OR "collections"."published_from" IS NULL OR "collections"."published_until" > "collections"."published_from")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" text NOT NULL,
	"category_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_categories_product_category_uidx" UNIQUE("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"storage_key" text NOT NULL,
	"provider" text DEFAULT 'local' NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"content_type" text,
	"byte_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_media_provider_chk" CHECK ("product_media"."provider" IN ('local')),
	CONSTRAINT "product_media_byte_size_nonneg_chk" CHECK ("product_media"."byte_size" IS NULL OR "product_media"."byte_size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_option_values" (
	"id" text PRIMARY KEY NOT NULL,
	"option_id" text NOT NULL,
	"value" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_option_values_option_value_uidx" UNIQUE("option_id","value"),
	CONSTRAINT "product_option_values_id_option_uidx" UNIQUE("id","option_id")
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_options_product_name_uidx" UNIQUE("product_id","name"),
	CONSTRAINT "product_options_id_product_uidx" UNIQUE("id","product_id")
);
--> statement-breakpoint
CREATE TABLE "product_variant_option_values" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"option_id" text NOT NULL,
	"option_value_id" text NOT NULL,
	CONSTRAINT "product_variant_option_values_variant_option_uidx" UNIQUE("variant_id","option_id"),
	CONSTRAINT "product_variant_option_values_variant_value_uidx" UNIQUE("variant_id","option_value_id")
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sku" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"weight_grams" integer,
	"length_mm" integer,
	"width_mm" integer,
	"height_mm" integer,
	"fulfillment_hint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_uidx" UNIQUE("sku"),
	CONSTRAINT "product_variants_id_product_uidx" UNIQUE("id","product_id"),
	CONSTRAINT "product_variants_weight_nonneg_chk" CHECK ("product_variants"."weight_grams" IS NULL OR "product_variants"."weight_grams" >= 0),
	CONSTRAINT "product_variants_dimensions_nonneg_chk" CHECK (("product_variants"."length_mm" IS NULL OR "product_variants"."length_mm" >= 0)
        AND ("product_variants"."width_mm" IS NULL OR "product_variants"."width_mm" >= 0)
        AND ("product_variants"."height_mm" IS NULL OR "product_variants"."height_mm" >= 0))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_uidx" UNIQUE("slug"),
	CONSTRAINT "products_status_chk" CHECK ("products"."status" IN ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"store_name" text NOT NULL,
	"default_locale" text DEFAULT 'en' NOT NULL,
	"php_enabled" boolean DEFAULT true NOT NULL,
	"usd_enabled" boolean DEFAULT true NOT NULL,
	"contact_email" text,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_singleton_chk" CHECK ("store_settings"."id" = 1),
	CONSTRAINT "store_settings_currency_enabled_chk" CHECK ("store_settings"."php_enabled" OR "store_settings"."usd_enabled")
);
--> statement-breakpoint
CREATE TABLE "variant_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"compare_at_amount_minor" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variant_prices_variant_currency_uidx" UNIQUE("variant_id","currency"),
	CONSTRAINT "variant_prices_currency_chk" CHECK ("variant_prices"."currency" IN ('PHP', 'USD')),
	CONSTRAINT "variant_prices_amount_positive_chk" CHECK ("variant_prices"."amount_minor" > 0),
	CONSTRAINT "variant_prices_compare_at_chk" CHECK ("variant_prices"."compare_at_amount_minor" IS NULL OR "variant_prices"."compare_at_amount_minor" > "variant_prices"."amount_minor")
);
--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_variant_product_fk" FOREIGN KEY ("variant_id","product_id") REFERENCES "public"."product_variants"("id","product_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_id_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_option_values" ADD CONSTRAINT "product_variant_option_values_variant_product_fk" FOREIGN KEY ("variant_id","product_id") REFERENCES "public"."product_variants"("id","product_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_option_values" ADD CONSTRAINT "product_variant_option_values_option_product_fk" FOREIGN KEY ("option_id","product_id") REFERENCES "public"."product_options"("id","product_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_option_values" ADD CONSTRAINT "product_variant_option_values_value_option_fk" FOREIGN KEY ("option_value_id","option_id") REFERENCES "public"."product_option_values"("id","option_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_prices" ADD CONSTRAINT "variant_prices_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;