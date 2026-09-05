-- Backfill: cria uma Despesa pra cada Manutenção que já tem custo cadastrado
-- mas ainda não tem despesa vinculada (ou seja, tudo que foi registrado ANTES
-- da correção que conecta as duas automaticamente).
--
-- Seguro rodar mais de uma vez — só processa quem ainda não tem expenseId,
-- então não duplica nada.

DO $$
DECLARE
  m RECORD;
  new_expense_id uuid;
BEGIN
  FOR m IN SELECT * FROM maintenances WHERE cost IS NOT NULL AND "expenseId" IS NULL LOOP
    new_expense_id := gen_random_uuid();

    INSERT INTO expenses (id, "companyId", "vehicleId", category, description, amount, "incurredAt", "createdByUserId", "createdAt")
    VALUES (
      new_expense_id,
      m."companyId",
      m."vehicleId",
      'maintenance',
      'Manutenção — ' || m.description,
      m.cost,
      m."performedAt",
      m."createdByUserId",
      now()
    );

    UPDATE maintenances SET "expenseId" = new_expense_id WHERE id = m.id;
  END LOOP;

  RAISE NOTICE 'Backfill concluído.';
END $$;

-- Confirma quantas manutenções com custo ficaram sem despesa vinculada (deve dar 0)
SELECT count(*) AS sem_despesa_vinculada FROM maintenances WHERE cost IS NOT NULL AND "expenseId" IS NULL;
