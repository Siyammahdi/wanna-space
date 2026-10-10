ALTER TABLE "project" ADD COLUMN "keyword" text;--> statement-breakpoint
WITH "parts" AS (
	SELECT
		p."id",
		w."word",
		row_number() OVER (PARTITION BY p."id" ORDER BY w."n") AS "i",
		count(*) OVER (PARTITION BY p."id") AS "words",
		left(w."word", 1) || coalesce((
			SELECT string_agg(left(CASE
				WHEN right(c."m"[1], 3) IN ('sch', 'scr', 'shr', 'spl', 'spr', 'str', 'thr') THEN right(c."m"[1], 3)
				WHEN right(c."m"[1], 2) IN ('bl', 'br', 'ch', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'kn', 'ph', 'pl', 'pr', 'sc', 'sh', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'th', 'tr', 'tw', 'wh', 'wr') THEN right(c."m"[1], 2)
				ELSE right(c."m"[1], 1)
			END, 1), '' ORDER BY c."o")
			FROM regexp_matches(w."word", '[aeiou]+([^aeiou]+)(?=[aeiou])', 'g') WITH ORDINALITY AS c("m", "o")
		), '') AS "syllables"
	FROM "project" p
	CROSS JOIN LATERAL regexp_split_to_table(
		lower(regexp_replace(p."name", '([[:lower:]])([[:upper:]])', '\1 \2', 'g')),
		'[^[:alnum:]]+'
	) WITH ORDINALITY AS w("word", "n")
	WHERE w."word" <> ''
),
"base" AS (
	SELECT
		"id",
		CASE
			WHEN max("words") > 1 THEN string_agg(left("word", 1), '' ORDER BY "i") FILTER (WHERE "i" <= 5)
			WHEN length(max("word")) <= 3 THEN max("word")
			WHEN length(max("syllables")) >= 3 THEN left(max("syllables"), 4)
			WHEN regexp_replace(substr(max("word"), 2), '[^[:alpha:]]|[aeiou]', '', 'g') <> ''
				THEN left(max("word"), 1) || left(regexp_replace(substr(max("word"), 2), '[^[:alpha:]]|[aeiou]', '', 'g'), 2)
			ELSE left(max("word"), 3)
		END AS "keyword"
	FROM "parts"
	GROUP BY "id"
),
"keyed" AS (
	SELECT
		p."id",
		p."space_id",
		p."created_at",
		CASE
			WHEN b."keyword" ~ '[[:alpha:]]' THEN rpad(left(b."keyword", 11), greatest(length(left(b."keyword", 11)), 2), 'x')
			ELSE 'proj'
		END AS "keyword"
	FROM "project" p
	LEFT JOIN "base" b ON b."id" = p."id"
),
"ranked" AS (
	SELECT
		"id",
		"keyword",
		row_number() OVER (PARTITION BY "space_id", "keyword" ORDER BY "created_at", "id") AS "rn"
	FROM "keyed"
)
UPDATE "project" p
SET "keyword" = r."keyword" || CASE WHEN r."rn" > 1 THEN r."rn"::text ELSE '' END
FROM "ranked" r
WHERE p."id" = r."id";--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "keyword" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_space_keyword_idx" ON "project" USING btree ("space_id","keyword");
