UPDATE "User"
SET "subRole" = 'ATENDENTE'
WHERE "role" = 'FUNCIONARIO'
  AND "subRole" IS NULL;