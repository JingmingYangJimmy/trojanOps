CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "memberships_source_check" CHECK ("memberships"."source" in ('roster', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "org_cohorts" (
	"cohort_slug" text NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "org_cohorts_cohort_slug_org_id_pk" PRIMARY KEY("cohort_slug","org_id")
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "orgs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "orgs_kind_check" CHECK ("orgs"."kind" in ('usg', 'rso')),
	CONSTRAINT "orgs_status_check" CHECK ("orgs"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_officer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "positions_org_slug_unique" UNIQUE("org_id","slug")
);
--> statement-breakpoint
CREATE TABLE "roster_state" (
	"org_id" uuid NOT NULL,
	"position_slug" text NOT NULL,
	"external_user_id" text NOT NULL,
	"imported_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "roster_state_org_id_position_slug_pk" PRIMARY KEY("org_id","position_slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text NOT NULL,
	"demo_email" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"title" text NOT NULL,
	"tier" text NOT NULL,
	"allowed_positions" text[] DEFAULT '{}' NOT NULL,
	"read_grants" text[] DEFAULT '{}' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"body_md" text NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "documents_tier_check" CHECK ("documents"."tier" in ('public', 'members', 'officers', 'usg_internal'))
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sources_org_slug_unique" UNIQUE("org_id","slug"),
	CONSTRAINT "sources_kind_check" CHECK ("sources"."kind" in ('public', 'minutes', 'finance', 'archive', 'rulebook', 'usg_internal'))
);
--> statement-breakpoint
CREATE TABLE "agent_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"track" text DEFAULT 'latest' NOT NULL,
	"pinned_version" integer,
	"audience" text,
	"usable_by" text[],
	"prompt_addendum" text DEFAULT '' NOT NULL,
	"extra_source_ids" uuid[] DEFAULT '{}' NOT NULL,
	"model_class" text,
	"installed_by" uuid,
	"installed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_installations_template_org_unique" UNIQUE("template_id","org_id"),
	CONSTRAINT "agent_installations_track_check" CHECK ("agent_installations"."track" in ('latest', 'pinned'))
);
--> statement-breakpoint
CREATE TABLE "agent_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"purpose" text NOT NULL,
	"audience" text NOT NULL,
	"usable_by" text[] DEFAULT '{}' NOT NULL,
	"max_tier" text NOT NULL,
	"source_kinds" text[] DEFAULT '{}' NOT NULL,
	"tools" text[] DEFAULT '{}' NOT NULL,
	"model_classes" text[] NOT NULL,
	"default_model_class" text NOT NULL,
	"system_prompt" text NOT NULL,
	"rule_pack_slug" text,
	"changelog" text DEFAULT '' NOT NULL,
	"published_by" uuid,
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_template_versions_template_version_unique" UNIQUE("template_id","version"),
	CONSTRAINT "agent_template_versions_audience_check" CHECK ("agent_template_versions"."audience" in ('public', 'members', 'positions')),
	CONSTRAINT "agent_template_versions_max_tier_check" CHECK ("agent_template_versions"."max_tier" in ('public', 'members', 'officers', 'usg_internal'))
);
--> statement-breakpoint
CREATE TABLE "agent_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"publisher_org_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"distribution" text NOT NULL,
	"target" text DEFAULT 'all' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"latest_version" integer DEFAULT 0 NOT NULL,
	"distributed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_templates_slug_unique" UNIQUE("slug"),
	CONSTRAINT "agent_templates_scope_check" CHECK ("agent_templates"."scope" in ('global', 'org')),
	CONSTRAINT "agent_templates_distribution_check" CHECK ("agent_templates"."distribution" in ('required', 'default', 'optional')),
	CONSTRAINT "agent_templates_status_check" CHECK ("agent_templates"."status" in ('active', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "rule_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"label" text NOT NULL,
	"content" jsonb NOT NULL,
	"published_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rule_packs_slug_version_unique" UNIQUE("slug","version"),
	CONSTRAINT "rule_packs_status_check" CHECK ("rule_packs"."status" in ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "usg_club_policy" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"allowed_model_classes" text[] NOT NULL,
	"allow_public_agents" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" uuid NOT NULL,
	"template_version" integer NOT NULL,
	"rule_pack_version" integer,
	"org_id" uuid NOT NULL,
	"billed_org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"input" text NOT NULL,
	"output" jsonb,
	"accessible_document_ids" uuid[] DEFAULT '{}' NOT NULL,
	"cited_document_ids" uuid[] DEFAULT '{}' NOT NULL,
	"model" text,
	"cost_micro" bigint DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tool" text NOT NULL,
	"args" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pending_actions_status_check" CHECK ("pending_actions"."status" in ('pending', 'confirmed', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"billed_org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"installation_id" uuid NOT NULL,
	"is_public" boolean NOT NULL,
	"model" text,
	"kind" text NOT NULL,
	"amount_micro" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ai_usage_kind_check" CHECK ("ai_usage"."kind" in ('hold', 'settle', 'release'))
);
--> statement-breakpoint
CREATE TABLE "quota_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"org_id" uuid,
	"user_id" uuid,
	"installation_id" uuid,
	"limit_micro" bigint NOT NULL,
	"set_by" uuid,
	"set_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "quota_limits_scope_check" CHECK ("quota_limits"."scope" in ('platform', 'org', 'member', 'installation', 'student_daily'))
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"actor_user_id" uuid,
	"acting_org_id" uuid,
	"action" text NOT NULL,
	"run_id" uuid,
	"installation_id" uuid,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connectors" (
	"kind" text PRIMARY KEY NOT NULL,
	"implementation" text NOT NULL,
	"status" text NOT NULL,
	"last_sync_at" timestamp with time zone,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_cohorts" ADD CONSTRAINT "org_cohorts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_state" ADD CONSTRAINT "roster_state_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_installations" ADD CONSTRAINT "agent_installations_template_id_agent_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."agent_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_installations" ADD CONSTRAINT "agent_installations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_installations" ADD CONSTRAINT "agent_installations_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_template_versions" ADD CONSTRAINT "agent_template_versions_template_id_agent_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."agent_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_template_versions" ADD CONSTRAINT "agent_template_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_publisher_org_id_orgs_id_fk" FOREIGN KEY ("publisher_org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_packs" ADD CONSTRAINT "rule_packs_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usg_club_policy" ADD CONSTRAINT "usg_club_policy_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_installation_id_agent_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."agent_installations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_billed_org_id_orgs_id_fk" FOREIGN KEY ("billed_org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_billed_org_id_orgs_id_fk" FOREIGN KEY ("billed_org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_installation_id_agent_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."agent_installations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_limits" ADD CONSTRAINT "quota_limits_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_limits" ADD CONSTRAINT "quota_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_limits" ADD CONSTRAINT "quota_limits_installation_id_agent_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."agent_installations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_limits" ADD CONSTRAINT "quota_limits_set_by_users_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;