CREATE TABLE "note_views" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"visitor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_views" ADD CONSTRAINT "note_views_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "note_views_note_visitor_unique" ON "note_views" USING btree ("note_id","visitor_id");--> statement-breakpoint
CREATE INDEX "note_views_created_idx" ON "note_views" USING btree ("created_at");