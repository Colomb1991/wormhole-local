ALTER TABLE "menu_items" ADD COLUMN "menu_number" varchar(10);--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_number_unique" UNIQUE("tenant_id","menu_number");