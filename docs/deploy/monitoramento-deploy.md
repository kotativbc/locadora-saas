# Monitoramento — Deploy no servidor (Netdata + alerta por e-mail)

Infraestrutura pura — não mexe em nada do código da aplicação, sem
rebuild de container, sem migration.

## O que isso entrega

- **`scripts/monitor.sh`** — roda a cada 30 min via systemd timer (mesmo
  padrão do backup), checa disco, RAM disponível, uso de swap, load
  average e validade do certificado HTTPS. Se algo passar do limite,
  manda um e-mail (reaproveitando o SMTP já configurado), com um
  "debounce" de 4h pra não te encher de e-mail se o problema persistir
- **Netdata** — painel visual em tempo real de CPU/RAM/disco/rede, só
  acessível via túnel SSH (não abre porta nova pra internet — mantém a
  mesma postura de segurança que validamos na auditoria)

Testei a lógica do `monitor.sh` de ponta a ponta no sandbox antes de
mandar: confirmei os 4 cenários — sistema saudável (não alerta), SMTP não
configurado (só loga), SMTP configurado mas falhando (não marca como
"alertado", tenta de novo na próxima), e o debounce funcionando quando um
alerta foi enviado há pouco tempo.

## Passo 1 — Levar os arquivos pro servidor

```bash
scp rental-saas-monitoramento.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-monitoramento.zip scripts/monitor.sh systemd/rental-monitor.service systemd/rental-monitor.timer .env.example
chmod +x scripts/monitor.sh
```

## Passo 2 — (Opcional) Configurar o destinatário do alerta

Se quiser que o alerta vá pra um e-mail diferente do `SMTP_USER`:

```bash
echo "MONITOR_ALERT_EMAIL=admin@kotati.com.br" >> /srv/rental-app/.env
```

## Passo 3 — Instalar o timer do systemd

```bash
sudo cp /srv/rental-app/systemd/rental-monitor.service /etc/systemd/system/
sudo cp /srv/rental-app/systemd/rental-monitor.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rental-monitor.timer
systemctl list-timers rental-monitor.timer
```

Deve aparecer na lista com o próximo horário de execução (dentro de até
30 minutos).

## Passo 4 — Testar o alerta de verdade (forçando o limite)

Roda manualmente uma vez com um limite impossível de não bater, só pra
confirmar que o e-mail chega:

```bash
sudo -u deploy bash -c '
  cd /srv/rental-app
  sed "s/DISK_THRESHOLD_PCT=80/DISK_THRESHOLD_PCT=1/" scripts/monitor.sh > /tmp/monitor-teste.sh
  chmod +x /tmp/monitor-teste.sh
  /tmp/monitor-teste.sh
'
```

Confira sua caixa de entrada — deve chegar um e-mail "[Rentovix] Alerta do
servidor". Se chegou, está tudo funcionando; o script original
(`scripts/monitor.sh`, sem o limite forçado) é o que o timer usa de
verdade a cada 30 min.

## Passo 5 — Instalar o Netdata

```bash
curl -Ss https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh
sudo sh /tmp/netdata-kickstart.sh --non-interactive --disable-telemetry
```

Isso instala e já deixa rodando como serviço. Agora restringe o acesso só
pra local (não expõe pra internet):

```bash
sudo nano /etc/netdata/netdata.conf
```

Na seção `[web]`, garanta que tem essa linha (adicione se não existir):

```ini
[web]
    bind to = 127.0.0.1
```

Salva, sai, e reinicia:

```bash
sudo systemctl restart netdata
```

## Passo 6 — Acessar o painel do Netdata (do seu computador, via túnel SSH)

No seu computador (não no servidor):

```bash
ssh -L 19999:localhost:19999 deploy@153.75.247.28
```

Deixa esse terminal aberto, e abre no navegador:

```
http://localhost:19999
```

Você deve ver o painel do Netdata com gráficos em tempo real de CPU, RAM,
disco e rede. Fecha o terminal SSH quando terminar de olhar — o túnel
fecha junto.

## Passo 7 — Commitar (só os arquivos versionados — Netdata em si não entra no git)

```bash
cd /srv/rental-app
git add scripts/monitor.sh systemd/rental-monitor.service systemd/rental-monitor.timer .env.example
git commit -m "monitoramento: script de alerta por email + netdata"
git push origin main
```

## O que os números realmente significam, resumido

| Métrica | Preocupante quando... |
|---|---|
| Disco | Acima de 80% — o script já avisa nesse ponto |
| RAM disponível | Abaixo de 300MB — o script já avisa nesse ponto |
| Swap | Sendo usado de forma consistente (não só um pico) — sinal de que a RAM real está apertada |
| Load average (1 min) | Acima de 1.5 com 1 vCPU — requisições enfileirando |
| Certificado HTTPS | Menos de 14 dias pra vencer — o Caddy deveria ter renovado sozinho antes disso; se aparecer, vale investigar por que não renovou |

Se algum desses vier alertando com frequência, é o sinal concreto de "hora
de conversar sobre upgrade de servidor" que você perguntou.
