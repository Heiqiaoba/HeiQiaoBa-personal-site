CREATE TABLE "likes" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "likes_note_user_unique" ON "likes" USING btree ("note_id","user_id");--> statement-breakpoint
CREATE INDEX "likes_note_idx" ON "likes" USING btree ("note_id");