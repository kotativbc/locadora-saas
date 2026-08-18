import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';

/**
 * Executado periodicamente por um systemd timer (ex: a cada 1 minuto).
 * Roda uma vez, processa um lote de jobs pendentes e encerra — mais simples
 * de operar e de depurar do que um daemon de longa duração num servidor de 1 vCPU.
 *
 * Handlers de job (geração de PDF, envio de e-mail, etc.) são registrados aqui
 * conforme cada módulo é implementado nas próximas fases.
 */

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers: Record<string, JobHandler> = {
  // 'contract.generate_pdf': async (payload) => { ... }  // Fase 2
  // 'notification.send_email': async (payload) => { ... } // Fase 6
};

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;

async function run() {
  const prisma = new PrismaClient();

  try {
    const pendingJobs = await prisma.job.findMany({
      where: { status: 'pending', runAfter: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (pendingJobs.length === 0) {
      console.log('[worker] nenhum job pendente.');
      return;
    }

    console.log(`[worker] processando ${pendingJobs.length} job(s).`);

    for (const job of pendingJobs) {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'processing' } });

      const handler = handlers[job.type];
      if (!handler) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            lastError: `Nenhum handler registrado para o tipo "${job.type}".`,
            attempts: { increment: 1 },
          },
        });
        console.error(`[worker] job ${job.id}: sem handler para tipo "${job.type}".`);
        continue;
      }

      try {
        await handler(job.payload as Record<string, unknown>);
        await prisma.job.update({ where: { id: job.id }, data: { status: 'done' } });
        console.log(`[worker] job ${job.id} (${job.type}) concluído.`);
      } catch (err) {
        const attempts = job.attempts + 1;
        const failed = attempts >= MAX_ATTEMPTS;
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: failed ? 'failed' : 'pending',
            attempts,
            lastError: err instanceof Error ? err.message : String(err),
            // recuo exponencial simples antes de tentar de novo
            runAfter: failed ? undefined : new Date(Date.now() + attempts * 60_000),
          },
        });
        console.error(`[worker] job ${job.id} falhou (tentativa ${attempts}):`, err);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('[worker] erro fatal:', err);
  process.exit(1);
});
