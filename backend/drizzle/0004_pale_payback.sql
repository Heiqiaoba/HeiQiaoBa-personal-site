CREATE TABLE "telemetry_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text,
	"props" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "telemetry_type_idx" ON "telemetry_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "telemetry_created_idx" ON "telemetry_events" USING btree ("created_at");