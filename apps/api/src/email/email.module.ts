import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_ADAPTER } from './email-adapter.interface';
import { LogEmailAdapter } from './log-email.adapter';
import { SmtpEmailAdapter } from './smtp-email.adapter';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_ADAPTER,
      useFactory: (config: ConfigService) => {
        return config.get<string>('SMTP_HOST') ? new SmtpEmailAdapter(config) : new LogEmailAdapter();
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_ADAPTER],
})
export class EmailModule {}
