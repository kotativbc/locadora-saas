export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAdapter {
  /** Nunca lança erro — retorna { sent: false } em caso de falha, pra quem precisar reagir (ex: avisar a equipe). */
  send(message: EmailMessage): Promise<{ sent: boolean }>;
}

export const EMAIL_ADAPTER = 'EMAIL_ADAPTER';
