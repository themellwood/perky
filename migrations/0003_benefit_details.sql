-- Enhanced benefit extraction: add clause text, plain english, claim process, and clause reference
ALTER TABLE benefits ADD COLUMN clause_text TEXT;
ALTER TABLE benefits ADD COLUMN plain_english TEXT;
ALTER TABLE benefits ADD COLUMN claim_process TEXT;
ALTER TABLE benefits ADD COLUMN clause_reference TEXT;
