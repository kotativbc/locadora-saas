import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { RequestUser } from './types';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';
// Controlado por env, não por NODE_ENV: em modo IP/sem domínio ainda não há
// HTTPS, e um cookie "Secure" simplesmente não é enviado pelo navegador numa
// conexão HTTP — travaria o refresh inteiro. Ligar quando o domínio com TLS
// estiver ativo (definir COOKIE_SECURE=true no .env).
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5/min/IP — barra brute force de senha
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password, req.ip);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) {
      throw new UnauthorizedException('Sessão não encontrada.');
    }
    const result = await this.authService.refresh(raw, req.ip);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) {
      await this.authService.logout(raw);
    }
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH, sameSite: 'lax', secure: COOKIE_SECURE });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5/min/IP — barra spam/enumeração
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // Mensagem genérica de propósito — nunca revela se o e-mail existe ou não.
    return { message: 'Se esse e-mail estiver cadastrado, enviamos um link de redefinição.' };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // token tem entropia alta, mas defesa em profundidade
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Senha redefinida com sucesso. Você já pode entrar com a nova senha.' };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
