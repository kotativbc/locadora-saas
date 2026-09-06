-- Backfill: atribui número sequencial (1, 2, 3...) a cada contrato já
-- existente, por empresa, na ordem em que foram criados. Depois disso,
-- atualiza o contador de cada empresa pra continuar de onde parou.
--
-- Seguro rodar mais de uma vez — só processa contratos com number IS NULL,
-- então não reatribui nem duplica nada já numerado.

DO $$
DECLARE
  comp RECORD;
  ctr RECORD;
  next_number INT;
BEGIN
  FOR comp IN SELECT DISTINCT "companyId" FROM contracts WHERE number IS NULL LOOP
    -- Continua a partir do maior número já usado nessa empresa (0 se nenhum ainda)
    SELECT COALESCE(MAX(number), 0) INTO next_number FROM contracts WHERE "companyId" = comp."companyId";

    FOR ctr IN
      SELECT id FROM contracts
      WHERE "companyId" = comp."companyId" AND number IS NULL
      ORDER BY "createdAt" ASC
    LOOP
      next_number := next_number + 1;
      UPDATE contracts SET number = next_number WHERE id = ctr.id;
    END LOOP;

    -- Deixa o contador da empresa pronto pro próximo contrato criado pelo sistema
    UPDATE companies SET "nextContractNumber" = next_number WHERE id = comp."companyId";
  END LOOP;

  RAISE NOTICE 'Backfill de numeração de contratos concluído.';
END $$;

-- Confirma que não sobrou nenhum contrato sem número (deve dar 0)
SELECT count(*) AS sem_numero FROM contracts WHERE number IS NULL;
