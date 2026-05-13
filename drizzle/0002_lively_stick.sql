CREATE TABLE "inbound_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"price" text,
	"summary" text,
	"city" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
