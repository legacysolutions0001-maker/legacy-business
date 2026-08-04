CREATE TABLE "lb_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"duration" integer DEFAULT 60,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"assigned_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'present' NOT NULL,
	"check_in" text,
	"check_out" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"user_id" integer,
	"username" text NOT NULL,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" text,
	"detail" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"address" text,
	"city" text,
	"state" text,
	"pincode" text,
	"phone" text,
	"is_main" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_cash_bank_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"ledger_type" text DEFAULT 'cash' NOT NULL,
	"entry_type" text DEFAULT 'credit' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0',
	"description" text NOT NULL,
	"reference" text,
	"entry_date" text NOT NULL,
	"payment_method" text,
	"bank_name" text,
	"account_number" text,
	"cheque_number" text,
	"transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"owner_name" text,
	"gst_number" text,
	"pan_number" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'India',
	"pincode" text,
	"mobile" text,
	"email" text,
	"logo_url" text,
	"subscription_status" text DEFAULT 'active' NOT NULL,
	"subscription_start" text,
	"subscription_end" text,
	"plan" text DEFAULT 'starter' NOT NULL,
	"invoice_settings_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lb_companies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "lb_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"mobile" text,
	"email" text,
	"aadhaar_number" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'India',
	"pincode" text,
	"notes" text,
	"whatsapp_number" text,
	"total_revenue" numeric(12, 2) DEFAULT '0',
	"pending_dues" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_daybook" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"date" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"title" text NOT NULL,
	"stage" text DEFAULT 'prospect' NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"probability" integer,
	"customer_id" integer,
	"expected_close_date" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"aadhaar" text,
	"address" text,
	"department" text,
	"position" text NOT NULL,
	"role" text DEFAULT 'worker' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"basic_salary" numeric(12, 2),
	"joining_date" text NOT NULL,
	"avatar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_eway_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"ewb_number" text NOT NULL,
	"invoice_number" text,
	"invoice_date" text,
	"from_gstin" text,
	"to_gstin" text,
	"from_place" text,
	"to_place" text,
	"from_state" text,
	"to_state" text,
	"transaction_type" text DEFAULT '1',
	"supply_type" text DEFAULT 'O',
	"sub_supply_type" text DEFAULT '1',
	"transport_mode" text DEFAULT 'road',
	"vehicle_number" text,
	"train_number" text,
	"flight_number" text,
	"ship_number" text,
	"invoice_value" text DEFAULT '0',
	"hsn_code" text,
	"product_name" text,
	"quantity" text,
	"unit" text,
	"status" text DEFAULT 'generated' NOT NULL,
	"valid_upto" text,
	"cancel_remark" text,
	"invoice_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" text NOT NULL,
	"vendor" text,
	"date" text NOT NULL,
	"notes" text,
	"receipt_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_feature_toggles" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"module" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_type" text DEFAULT 'gst_invoice' NOT NULL,
	"customer_id" integer,
	"customer_name" text,
	"customer_gst" text,
	"customer_address" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"invoice_date" text NOT NULL,
	"due_date" text,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"cgst" numeric(12, 2) DEFAULT '0',
	"sgst" numeric(12, 2) DEFAULT '0',
	"igst" numeric(12, 2) DEFAULT '0',
	"round_off" numeric(5, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"payment_status" text DEFAULT 'pending',
	"paid_at" text,
	"notes" text,
	"terms_conditions" text,
	"signature_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"status" text DEFAULT 'new' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"value" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_leaves" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"type" text DEFAULT 'annual' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_name" text NOT NULL,
	"receiver_id" integer,
	"receiver_name" text,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_announcement" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"user_id" integer,
	"type" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"invoice_id" integer,
	"entity_type" text DEFAULT 'customer' NOT NULL,
	"entity_id" integer,
	"entity_name" text,
	"amount" numeric(12, 2) NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"reference" text,
	"notes" text,
	"paid_at" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"variant_name" text NOT NULL,
	"size" text,
	"size_unit" text,
	"packaging" text,
	"barcode" text,
	"sku" text,
	"purchase_price" numeric(12, 2) DEFAULT '0',
	"selling_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 5,
	"batch_number" text,
	"expiry_date" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"barcode" text,
	"category" text NOT NULL,
	"hsn_code" text,
	"gst_rate" numeric(5, 2) DEFAULT '18',
	"purchase_price" numeric(12, 2),
	"selling_price" numeric(12, 2) NOT NULL,
	"opening_stock" integer DEFAULT 0,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 5 NOT NULL,
	"unit" text DEFAULT 'pcs',
	"batch_number" text,
	"expiry_date" text,
	"image_url" text,
	"description" text,
	"brand" text,
	"technical_name" text,
	"ingredients" text,
	"manufacturing_date" text,
	"reorder_level" integer DEFAULT 5,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'planning' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"start_date" text,
	"end_date" text,
	"budget" numeric(12, 2),
	"progress" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"supplier_id" integer,
	"supplier_name" text,
	"bill_number" text NOT NULL,
	"bill_date" text NOT NULL,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cgst" numeric(12, 2) DEFAULT '0',
	"sgst" numeric(12, 2) DEFAULT '0',
	"igst" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_purchase_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"return_number" text NOT NULL,
	"original_purchase_id" integer,
	"original_bill_number" text,
	"supplier_id" integer,
	"supplier_name" text,
	"return_date" text NOT NULL,
	"reason" text,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0',
	"cgst" numeric(12, 2) DEFAULT '0',
	"sgst" numeric(12, 2) DEFAULT '0',
	"igst" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_sales_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"return_number" text NOT NULL,
	"original_invoice_id" integer,
	"original_invoice_number" text,
	"customer_id" integer,
	"customer_name" text,
	"return_date" text NOT NULL,
	"reason" text,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0',
	"cgst" numeric(12, 2) DEFAULT '0',
	"sgst" numeric(12, 2) DEFAULT '0',
	"igst" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"module" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lb_permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "lb_role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_role_permission" UNIQUE("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "lb_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_salary_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"basic_salary" numeric(12, 2) DEFAULT '0' NOT NULL,
	"hra" numeric(12, 2) DEFAULT '0',
	"allowances" numeric(12, 2) DEFAULT '0',
	"advance" numeric(12, 2) DEFAULT '0',
	"bonus" numeric(12, 2) DEFAULT '0',
	"overtime" numeric(12, 2) DEFAULT '0',
	"deductions" numeric(12, 2) DEFAULT '0',
	"gross_salary" numeric(12, 2) DEFAULT '0',
	"net_salary" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_mode" text DEFAULT 'cash',
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_legacy_business_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" text DEFAULT 'Legacy Business' NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"gst_number" text,
	"pan_number" text,
	"account_holder_name" text,
	"bank_name" text,
	"account_number" text,
	"ifsc_code" text,
	"upi_id" text,
	"qr_code_url" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_stock_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"variant_id" integer,
	"batch_number" text,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"current_qty" integer DEFAULT 0 NOT NULL,
	"purchase_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"selling_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"manufacturing_date" text,
	"expiry_date" text,
	"warehouse" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_stock_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"variant_id" integer,
	"batch_id" integer,
	"type" text NOT NULL,
	"quantity_change" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"ref_type" text,
	"ref_id" integer,
	"notes" text,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_subscription_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lb_subscription_pricing_plan_unique" UNIQUE("plan")
);
--> statement-breakpoint
CREATE TABLE "lb_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"plan" text DEFAULT 'starter' NOT NULL,
	"modules" jsonb DEFAULT '[]' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"paid_status" text DEFAULT 'unpaid' NOT NULL,
	"invoice_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"gst_number" text,
	"pan_number" text,
	"address" text,
	"city" text,
	"state" text,
	"phone" text,
	"email" text,
	"contact_person" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"project_id" integer NOT NULL,
	"assignee_id" integer,
	"due_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"short_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lb_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text DEFAULT 'owner' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lb_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "lb_attendance" ADD CONSTRAINT "lb_attendance_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_attendance" ADD CONSTRAINT "lb_attendance_employee_id_lb_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."lb_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_audit_log" ADD CONSTRAINT "lb_audit_log_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_branches" ADD CONSTRAINT "lb_branches_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_cash_bank_ledger" ADD CONSTRAINT "lb_cash_bank_ledger_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_categories" ADD CONSTRAINT "lb_categories_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_customers" ADD CONSTRAINT "lb_customers_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_daybook" ADD CONSTRAINT "lb_daybook_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_deals" ADD CONSTRAINT "lb_deals_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_deals" ADD CONSTRAINT "lb_deals_customer_id_lb_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."lb_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_employees" ADD CONSTRAINT "lb_employees_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_eway_bills" ADD CONSTRAINT "lb_eway_bills_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_expenses" ADD CONSTRAINT "lb_expenses_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_feature_toggles" ADD CONSTRAINT "lb_feature_toggles_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_invoices" ADD CONSTRAINT "lb_invoices_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_invoices" ADD CONSTRAINT "lb_invoices_customer_id_lb_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."lb_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_leads" ADD CONSTRAINT "lb_leads_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_payments" ADD CONSTRAINT "lb_payments_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_product_variants" ADD CONSTRAINT "lb_product_variants_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_product_variants" ADD CONSTRAINT "lb_product_variants_product_id_lb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."lb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_products" ADD CONSTRAINT "lb_products_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_projects" ADD CONSTRAINT "lb_projects_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_purchase_orders" ADD CONSTRAINT "lb_purchase_orders_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_purchase_orders" ADD CONSTRAINT "lb_purchase_orders_supplier_id_lb_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."lb_suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_purchase_returns" ADD CONSTRAINT "lb_purchase_returns_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_sales_returns" ADD CONSTRAINT "lb_sales_returns_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_role_permissions" ADD CONSTRAINT "lb_role_permissions_role_id_lb_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."lb_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_role_permissions" ADD CONSTRAINT "lb_role_permissions_permission_id_lb_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."lb_permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_roles" ADD CONSTRAINT "lb_roles_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_salary_records" ADD CONSTRAINT "lb_salary_records_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_salary_records" ADD CONSTRAINT "lb_salary_records_employee_id_lb_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."lb_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_stock_batches" ADD CONSTRAINT "lb_stock_batches_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_stock_batches" ADD CONSTRAINT "lb_stock_batches_product_id_lb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."lb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_stock_transactions" ADD CONSTRAINT "lb_stock_transactions_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_stock_transactions" ADD CONSTRAINT "lb_stock_transactions_product_id_lb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."lb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_subscriptions" ADD CONSTRAINT "lb_subscriptions_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_suppliers" ADD CONSTRAINT "lb_suppliers_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_units" ADD CONSTRAINT "lb_units_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lb_users" ADD CONSTRAINT "lb_users_company_id_lb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."lb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_company" ON "lb_audit_log" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_user" ON "lb_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created" ON "lb_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_branches_company_id" ON "lb_branches" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_cash_bank_company_id" ON "lb_cash_bank_ledger" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_cash_bank_type" ON "lb_cash_bank_ledger" USING btree ("ledger_type");--> statement-breakpoint
CREATE INDEX "idx_cash_bank_date" ON "lb_cash_bank_ledger" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "idx_categories_company_id" ON "lb_categories" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_variants_product_id" ON "lb_product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variants_barcode" ON "lb_product_variants" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "idx_variants_company_id" ON "lb_product_variants" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_products_company_id" ON "lb_products" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_products_barcode" ON "lb_products" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "idx_purchase_returns_company_id" ON "lb_purchase_returns" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_sales_returns_company_id" ON "lb_sales_returns" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role" ON "lb_role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_roles_company_id" ON "lb_roles" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_stock_batches_company" ON "lb_stock_batches" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_stock_batches_product" ON "lb_stock_batches" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_stock_batches_variant" ON "lb_stock_batches" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_stock_txn_company" ON "lb_stock_transactions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_stock_txn_product" ON "lb_stock_transactions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_stock_txn_created" ON "lb_stock_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_units_company_id" ON "lb_units" USING btree ("company_id");