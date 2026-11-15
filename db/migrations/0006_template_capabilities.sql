ALTER TABLE "agent_template_versions" ADD COLUMN "cite_sources" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_template_versions" ADD COLUMN "search_knowledge" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_template_versions" ADD COLUMN "temperature" real DEFAULT 0.3 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_template_versions" ADD CONSTRAINT "agent_template_versions_temperature_check" CHECK ("agent_template_versions"."temperature" between 0 and 1);