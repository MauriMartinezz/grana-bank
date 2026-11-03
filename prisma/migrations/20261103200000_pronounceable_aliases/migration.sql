-- Replaces the generated aliases that look like codes ("gb." or "usd." plus
-- 12 hex digits, from 20261103160000_add_account_alias and the first dollar
-- account opener) with three random words, the format of new default aliases.
-- The word list matches ALIAS_WORDS in features/transfers/alias-generator.ts.
-- Only aliases in exactly those generated shapes are rewritten.
DO $$
DECLARE
  words TEXT[] := ARRAY['mate', 'tango', 'lluvia', 'faro', 'nube', 'rio', 'sol', 'luna', 'cielo', 'mar', 'pampa', 'ceibo', 'hornero', 'puerto', 'campo', 'fuego', 'viento', 'roble', 'sauce', 'trigo', 'arena', 'piedra', 'lago', 'bosque', 'flor', 'gato', 'perro', 'oso', 'lobo', 'zorro', 'tigre', 'puma', 'condor', 'delta', 'isla', 'monte', 'valle', 'playa', 'ola', 'coral', 'miel', 'pan', 'cafe', 'vino', 'queso', 'uva', 'pera', 'limon', 'mango', 'coco', 'lapiz', 'papel', 'libro', 'mesa', 'silla', 'barco', 'tren', 'globo', 'cometa', 'nieve', 'brisa', 'trueno', 'rayo', 'aurora', 'ocaso', 'jardin', 'patio', 'balcon', 'techo', 'guitarra', 'bombo', 'piano', 'violin', 'flauta', 'canto', 'baile', 'ronda', 'plaza', 'barrio'];
  account RECORD;
  candidate TEXT;
  attempt INT;
BEGIN
  FOR account IN
    SELECT "id" FROM "Account" WHERE "alias" ~ '^(gb|usd)\.[0-9a-f]{12}$'
  LOOP
    attempt := 0;
    LOOP
      attempt := attempt + 1;
      candidate := words[1 + floor(random() * array_length(words, 1))::INT]
        || '.' || words[1 + floor(random() * array_length(words, 1))::INT]
        || '.' || words[1 + floor(random() * array_length(words, 1))::INT];
      -- After many clashes, a number keeps the alias unique and valid.
      IF attempt > 20 THEN
        candidate := candidate || floor(random() * 1000)::INT;
      END IF;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Account" WHERE "alias" = candidate);
    END LOOP;
    UPDATE "Account" SET "alias" = candidate WHERE "id" = account."id";
  END LOOP;
END $$;
