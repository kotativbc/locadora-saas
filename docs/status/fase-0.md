# Fase 0 — Bootstrap do servidor

**Status: concluída e verificada**

## Ambiente

- Debian GNU/Linux 13 (trixie), 1 vCPU, 3.8GB RAM, 72GB livres de 77GB
- IP: 153.75.247.28
- Domínio disponível (não apontado ainda): soucore.com.br

## O que foi feito

1. Usuário não-root `deploy` com sudo, acesso SSH por chave
2. Sistema atualizado (`apt full-upgrade`)
3. Swap de 4GB criado (margem de segurança para RAM baixa)
4. UFW ativo liberando apenas 22 (SSH), 80 e 443/tcp
5. fail2ban ativo (proteção contra força bruta em SSH)
6. Docker Engine + Compose plugin instalados via repositório oficial (Apache 2.0)
7. Estrutura de diretórios: `/srv/rental-app` (código) e `/srv/rental-data`
   (dados privados: uploads, backups, logs), fora de qualquer pasta pública
8. Chave SSH dedicada gerada e cadastrada como Deploy Key (com escrita) no
   repositório `github.com/kotativbc/locadora-saas`; repositório clonado
   (vazio) em `/srv/rental-app`

## Verificação executada

```
Distributor ID: Debian
Description:    Debian GNU/Linux 13 (trixie)
Docker version 29.7.2, build a7dcaa6
Docker Compose version v5.5.0
Mem:  3.8Gi total, 3.4Gi available, Swap: 4.9Gi
Disk: 77G total, 67G available (9% usado)
```

## Correção aplicada nesta fase

A política padrão do UFW estava como `allow (incoming)` — ou seja, qualquer
porta não bloqueada explicitamente ficava aberta por padrão. Corrigido para
`deny (incoming)` mantendo as regras explícitas de 22/80/443.

## Pendências conscientes (não são bugs, são decisões de fase)

- Domínio e HTTPS via Let's Encrypt: só quando soucore.com.br for apontado
- Rotina de backup real: começa na Fase 1, junto com o primeiro banco de dados
