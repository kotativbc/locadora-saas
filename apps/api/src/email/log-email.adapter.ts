import { Injectable, Logger } from '@nestjs/common';
import { EmailAdapter, EmailMessage } from './email-adapter.interface';

@Injectable()
export class LogEmailAdapter implements EmailAdapter {
  private readonly logger = new Logger('EmailAdapter(log-only)');

  async send(message: EmailMessage): Promise<void> {
    this.logger.warn(
      `SMTP não configurado — e-mail NÃO enviado de verdade. Destinatário: ${message.to} | Assunto: ${message.subject}`,
    );
  }
}
