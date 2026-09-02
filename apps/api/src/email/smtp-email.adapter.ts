import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailAdapter, EmailMessage } from './email-adapter.interface';

@Injectable()
export class SmtpEmailAdapter implements EmailAdapter {
  private readonly logger = new Logger('EmailAdapter(smtp)');
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    this.fromAddress = config.get<string>('SMTP_FROM') ?? config.getOrThrow<string>('SMTP_USER');
    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: Number(config.get<string>('SMTP_PORT') ?? '587'),
      secure: config.get<string>('SMTP_SECURE') === 'true', // true = porta 465 (SSL); false = 587 (STARTTLS)
      auth: {
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASS'),
      },
    });
  }

  async send(message: EmailMessage): Promise<{ sent: boolean }> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
      });
      return { sent: true };
    } catch (err) {
      // Nunca derruba o fluxo principal (ex: pedido de redefinição de senha)
      // por falha de e-mail — só registra pra investigar depois. Quem chama
      // e precisa saber se funcionou (ex: envio de fatura) confere o retorno.
      this.logger.error(`Falha ao enviar e-mail para ${message.to}: ${(err as Error).message}`);
      return { sent: false };
    }
  }
}
