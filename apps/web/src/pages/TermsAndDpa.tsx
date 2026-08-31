import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';

function Pending({ children }: { children: string }) {
  return <span className="legal-pending">[{children}]</span>;
}

export function TermsAndDpa() {
  return (
    <div className="legal-page">
      <Link to="/login" className="legal-back">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <BrandMark size={20} />
        <strong>Rentovix</strong>
      </div>
      <h1>Termos de Uso e Prestação de Serviços — e Anexo de Tratamento de Dados (DPA)</h1>
      <p className="legal-subtitle">
        Versão: <Pending>data de vigência ainda não definida</Pending> — este documento regula a relação entre o
        Rentovix e a empresa locadora que contrata a plataforma.
      </p>

      <div className="legal-notice">
        Este documento tem trechos ainda pendentes de definição, destacados em amarelo. Não deve ser considerado
        vigente ou publicado como final antes da revisão de um advogado e do fechamento desses pontos — em
        especial a qualificação do Fornecedor abaixo, que depende de definição contábil (CPF ou CNPJ).
      </div>

      <h2>Fornecedor</h2>
      <p>
        <Pending>
          nome completo da pessoa física, empresário individual ou pessoa jurídica responsável pelo Rentovix — CPF
          ou CNPJ, conforme definição contábil ainda pendente
        </Pending>
        , com endereço em <Pending>endereço</Pending>, e-mail <Pending>e-mail</Pending> ("Rentovix" ou
        "Fornecedor").
      </p>

      <h2>PARTE A — Termos de Uso e Prestação de Serviços do Rentovix</h2>

      <h3>1. Aceitação e abrangência</h3>
      <p>
        1.1. Estes Termos regulam o acesso e o uso do Rentovix pela locadora de veículos que realizar cadastro,
        contratar plano, aceitar eletronicamente estes Termos ou utilizar a plataforma ("Contratante").
      </p>
      <p>
        1.2. A aceitação eletrônica, o primeiro acesso após a disponibilização destes Termos, a contratação de
        plano ou a continuidade de uso constituem manifestação de concordância, desde que a Contratante tenha
        tido acesso prévio ao texto, consiga armazená-lo e possa identificar a versão aceita.
      </p>
      <p>
        1.3. A pessoa que aceita estes Termos declara ter poderes para representar a Contratante. Se não os tiver,
        responderá perante a Contratante pelos prejuízos decorrentes da falta de poderes, sem prejuízo dos
        direitos do Rentovix contra quem tiver praticado o ato.
      </p>
      <p>
        1.4. Estes Termos devem ser lidos com o DPA e, quando aplicável, com a proposta comercial, ordem de
        contratação ou plano selecionado. Em caso de conflito, prevalecerão, nesta ordem: (a) normas legais
        cogentes; (b) instrumento comercial específico assinado; (c) DPA quanto à proteção de dados; (d) estes
        Termos.
      </p>

      <h3>2. Objeto e natureza do Rentovix</h3>
      <p>
        2.1. O Rentovix é uma solução tecnológica de apoio à gestão de locadoras de veículos, podendo incluir
        cadastro e organização de informações, gestão de clientes, veículos, locações, contratos, documentos e
        geração de arquivos em PDF, conforme funcionalidades efetivamente disponibilizadas no plano contratado.
      </p>
      <p>
        2.2. O Rentovix é uma ferramenta de apoio operacional. Não é locadora, corretora, seguradora, instituição
        financeira, despachante, consultoria jurídica, contábil ou de trânsito, nem parte dos contratos celebrados
        entre a Contratante e seus clientes.
      </p>
      <p>
        2.3. O Rentovix não garante que os documentos gerados sejam juridicamente adequados a todos os estados,
        municípios, tipos de veículo, situações contratuais ou alterações legislativas. A Contratante deve
        revisar, adaptar e validar os documentos com profissional habilitado antes de utilizá-los.
      </p>
      <p>
        2.4. A contratação do Rentovix não substitui licenças, autorizações, registros, seguros, políticas
        internas, controles antifraude, consentimentos, avisos de privacidade, contratos de locação ou obrigações
        fiscais e regulatórias da Contratante.
      </p>

      <h3>3. Cadastro, usuários e segurança de acesso</h3>
      <p>
        3.1. A Contratante deve fornecer informações verdadeiras, atuais e completas, manter seus dados cadastrais
        atualizados e informar imediatamente qualquer alteração relevante.
      </p>
      <p>
        3.2. A Contratante é responsável por seus administradores, colaboradores, prestadores, representantes e
        demais usuários autorizados ("Usuários Autorizados"), incluindo a criação, revisão e revogação de
        permissões.
      </p>
      <p>
        3.3. Cada credencial é pessoal e intransferível. É vedado compartilhar senhas, permitir acesso de
        terceiros não autorizados, armazenar credenciais em locais inseguros ou tentar obter credenciais de outro
        usuário.
      </p>
      <p>
        3.4. A Contratante deve utilizar senhas fortes, autenticação adicional quando disponível, dispositivos
        atualizados e redes confiáveis. Deve comunicar imediatamente suspeitas de invasão, perda de dispositivo,
        vazamento, uso indevido ou acesso não autorizado.
      </p>
      <p>
        3.5. O Rentovix poderá suspender credenciais ou sessões quando houver indício razoável de fraude, abuso,
        risco à segurança, violação destes Termos ou exigência legal. Sempre que possível, comunicará a medida e
        permitirá a regularização, sem impedir resposta imediata a situações urgentes.
      </p>

      <h3>4. Conteúdo e dados inseridos pela Contratante</h3>
      <p>
        4.1. A Contratante mantém a titularidade e a responsabilidade pelo conteúdo e pelos dados que inserir,
        importar, gerar ou disponibilizar no Rentovix ("Conteúdo da Contratante").
      </p>
      <p>
        4.2. A Contratante declara e garante que possui base legal, autorização, legitimidade e transparência
        suficientes para coletar, utilizar e inserir no Rentovix os dados de seus clientes, condutores, fiadores,
        proprietários, funcionários e terceiros.
      </p>
      <p>
        4.3. A Contratante deve limitar a inserção ao mínimo necessário, conferir a exatidão dos dados, corrigir
        informações incorretas e não inserir conteúdo ilícito, discriminatório, ofensivo, fraudulento, malicioso
        ou que viole direitos de terceiros.
      </p>
      <p>
        4.4. A Contratante não deve inserir dados sensíveis, dados de crianças ou dados de saúde, biométricos ou
        de geolocalização, salvo quando houver necessidade legítima, base legal adequada, controles reforçados e
        aprovação prévia documentada do responsável pelo Rentovix. O Rentovix poderá recusar ou restringir
        tratamentos de maior risco.
      </p>
      <p>
        4.5. A Contratante autoriza o Rentovix a tratar o Conteúdo da Contratante exclusivamente para fornecer,
        manter, proteger, corrigir e melhorar tecnicamente o serviço, conforme as instruções documentadas da
        Contratante e o DPA. É vedada a venda do conteúdo ou sua utilização para publicidade direcionada aos
        clientes finais da Contratante, salvo contratação e base legal específicas.
      </p>

      <h3>5. Obrigações da Contratante</h3>
      <p>
        A Contratante deverá: (a) cumprir a legislação aplicável às suas atividades; (b) manter contratos de
        locação e avisos de privacidade adequados; (c) definir finalidades, bases legais e prazos de retenção; (d)
        responder a solicitações de titulares e autoridades; (e) revisar documentos e dados antes de usá-los; (f)
        manter cópias e controles próprios quando necessários; (g) impedir o uso indevido da plataforma; (h) não
        praticar engenharia reversa, scraping, exploração de vulnerabilidades ou tentativa de contornar limites; e
        (i) pagar os valores contratados nos prazos aplicáveis.
      </p>

      <h3>6. Obrigações do Rentovix</h3>
      <p>
        O Rentovix deverá: (a) disponibilizar as funcionalidades contratadas com diligência razoável; (b) adotar
        medidas técnicas e administrativas compatíveis com o risco e com a natureza do serviço; (c) manter canal
        de atendimento em <Pending>e-mail/canal</Pending>; (d) tratar dados pessoais conforme o DPA; (e) comunicar
        incidentes confirmados que possam afetar dados da Contratante nos termos do DPA; e (f) corrigir, dentro de
        prazo razoável, falhas reproduzíveis atribuíveis à plataforma, ressalvadas indisponibilidades e causas
        excluídas nestes Termos.
      </p>

      <h3>7. Disponibilidade, manutenção e limitações técnicas</h3>
      <p>
        7.1. O Rentovix é disponibilizado conforme a capacidade técnica, infraestrutura e plano contratado. Salvo
        SLA escrito, não há promessa de disponibilidade contínua ou de funcionamento sem interrupções.
      </p>
      <p>
        7.2. Poderá haver indisponibilidade por manutenção programada ou emergencial, falhas de hospedagem,
        internet, DNS, energia, dispositivos, serviços de terceiros, ataques, força maior, determinações legais ou
        atos da Contratante. O Rentovix buscará reduzir impactos e, quando razoável, avisará previamente.
      </p>
      <p>
        7.3. Backups, se oferecidos, destinam-se à recuperação operacional e não constituem garantia de
        restauração integral, instantânea ou sem perda de dados. A Contratante deve manter exportações ou cópias
        próprias quando o negócio exigir continuidade elevada.
      </p>
      <p>
        7.4. Salvo contratação expressa, não há garantia de compatibilidade com sistemas, impressoras, leitores,
        navegadores, dispositivos ou serviços de terceiros específicos.
      </p>

      <h3>8. Planos, preços, cobrança e tributos</h3>
      <p>
        8.1. O plano, preço, limites, período, forma de pagamento e condições comerciais constarão da página,
        proposta ou instrumento aceito pela Contratante.
      </p>
      <p>
        8.2. Valores poderão ser alterados para ciclos futuros mediante aviso prévio razoável. A continuidade após
        a data de vigência representa aceitação do novo preço, sem prejuízo de rescisão conforme estes Termos.
      </p>
      <p>
        8.3. Tributos incidentes sobre a atividade de cada parte serão suportados por quem for legalmente
        responsável. A ausência atual de CNPJ não elimina obrigações fiscais eventualmente aplicáveis ao
        responsável pela exploração da atividade; <Pending>este ponto deve ser validado com contador</Pending>.
      </p>
      <p>
        8.4. Atrasos poderão gerar juros, multa razoável, correção, suspensão após aviso e cobrança de custos
        comprovados, sem prejuízo de limites legais aplicáveis.
      </p>

      <h3>9. Propriedade intelectual</h3>
      <p>
        9.1. O Rentovix, seu código, marca, layout, documentação, bancos estruturais, modelos, textos, componentes
        e demais elementos são protegidos pela legislação aplicável e permanecem de titularidade do Rentovix ou de
        seus licenciantes.
      </p>
      <p>
        9.2. Durante a vigência e enquanto adimplente, a Contratante recebe licença limitada, não exclusiva, não
        transferível e revogável para utilizar a plataforma internamente, conforme estes Termos.
      </p>
      <p>
        9.3. A Contratante não poderá copiar, vender, sublicenciar, alugar, distribuir, modificar, descompilar,
        desmontar, criar obra derivada, remover avisos de titularidade ou explorar comercialmente a plataforma,
        salvo autorização escrita ou hipótese legal irrenunciável.
      </p>
      <p>
        9.4. O Conteúdo da Contratante não é transferido ao Rentovix. A Contratante concede apenas as autorizações
        técnicas necessárias para hospedar, processar, transmitir, exibir e gerar documentos dentro da finalidade
        contratada.
      </p>

      <h3>10. Uso proibido e medidas de proteção</h3>
      <p>
        É proibido utilizar o Rentovix para fraude, lavagem de dinheiro, invasão, malware, ameaça, discriminação,
        violação de direitos autorais, falsificação de documentos, prática de crime, tratamento ilegal de dados,
        oferta enganosa, interferência na infraestrutura ou tentativa de obter acesso não autorizado. Em caso de
        risco, o Rentovix poderá preservar registros, limitar funções, bloquear acessos, remover conteúdo
        tecnicamente necessário e cooperar com autoridades, observada a lei.
      </p>

      <h3>11. Responsabilidade da Contratante e indenização</h3>
      <p>
        11.1. A Contratante é exclusivamente responsável por sua atividade de locação, frota, manutenção,
        seguros, conduta de funcionários, relação com clientes, cobranças, multas, danos decorrentes de veículos,
        conteúdo inserido, escolhas contratuais, bases legais, comunicações e decisões tomadas com apoio do
        Rentovix.
      </p>
      <p>
        11.2. Na máxima extensão permitida pela lei, a Contratante deverá ressarcir o Rentovix por perdas,
        custos, despesas razoáveis e reclamações de terceiros decorrentes de: (a) conteúdo ou dados fornecidos
        pela Contratante; (b) ausência de base legal ou aviso adequado; (c) uso indevido; (d) violação destes
        Termos; (e) ato de Usuário Autorizado; (f) ilegalidade da atividade de locação; ou (g) documentos ou
        promessas feitos pela Contratante a seus clientes.
      </p>
      <p>
        11.3. O dever de ressarcimento não autoriza o Rentovix a afastar responsabilidades que a lei atribua
        diretamente ao próprio Rentovix, nem impede o exercício de direitos indisponíveis.
      </p>

      <h3>12. Limitação de responsabilidade do Rentovix</h3>
      <p>
        12.1. O Rentovix não responde por fatos fora de seu controle razoável, incluindo atos da Contratante ou de
        Usuários Autorizados, dados incorretos, falhas de internet ou terceiros, indisponibilidade de provedores,
        força maior, ataques sofisticados, determinações públicas, perda de dispositivo, credenciais
        compartilhadas ou uso contrário às instruções.
      </p>
      <p>
        12.2. O Rentovix não responde por: (a) decisões comerciais, jurídicas, financeiras, fiscais ou
        operacionais da Contratante; (b) relação entre locadora e cliente final; (c) validade ou suficiência de
        contratos gerados; (d) multas, apreensões, acidentes, inadimplementos ou danos ligados à locação; (e)
        perda decorrente da falta de cópia própria quando recomendada; ou (f) conteúdo de terceiros.
      </p>
      <p>
        12.3. Na relação empresarial entre Rentovix e Contratante, e salvo dolo, culpa grave, violação
        intencional, danos pessoais, obrigação legal irrenunciável ou hipótese em que a limitação seja proibida, a
        responsabilidade total do Rentovix por danos diretos comprovados ficará limitada ao total efetivamente
        pago pela Contratante ao Rentovix nos <Pending>3/6/12</Pending> meses anteriores ao fato gerador. Danos
        indiretos, lucros cessantes, perda de oportunidade, dano reputacional e perda de receita ficam excluídos
        na máxima extensão permitida.
      </p>
      <p>
        12.4. Este limite não impede a aplicação de regras cogentes do consumidor, da LGPD, do Marco Civil da
        Internet ou de qualquer outra lei que determine responsabilidade diversa. Cláusulas de exclusão absoluta
        tendem a ser inválidas quando eliminam direitos legalmente protegidos; o CDC reconhece, entre outros, o
        direito à informação clara e à reparação de danos.
      </p>

      <h3>13. Suspensão, encerramento e dados após a rescisão</h3>
      <p>
        13.1. Qualquer parte poderá rescindir conforme o plano ou mediante aviso prévio de{' '}
        <Pending>30</Pending> dias, salvo inadimplemento ou violação grave, hipótese em que poderá haver
        encerramento imediato após comunicação, quando possível.
      </p>
      <p>
        13.2. Após o término, a Contratante perderá o acesso, ressalvado eventual período de exportação de{' '}
        <Pending>15/30</Pending> dias. O Rentovix deverá disponibilizar exportação razoável dos dados em formato
        tecnicamente disponível, desde que a Contratante esteja adimplente e o pedido não viole direitos de
        terceiros.
      </p>
      <p>
        13.3. Após o período de exportação, o Rentovix eliminará ou anonimizará os dados sob sua guarda, salvo:
        (a) instrução da Contratante; (b) necessidade de cumprimento de obrigação legal; (c) exercício regular de
        direitos; (d) preservação de evidências; (e) backups sujeitos a ciclo técnico de sobrescrita; ou (f) dados
        necessários para segurança e auditoria.
      </p>
      <p>
        13.4. A Contratante deve definir, no Anexo de Retenção, os prazos específicos para dados de clientes,
        contratos, documentos, registros de acesso e backups.{' '}
        <Pending>não se deve publicar prazo fictício enquanto essa política não estiver definida</Pending>.
      </p>

      <h3>14. Alterações dos Termos</h3>
      <p>
        O Rentovix poderá alterar estes Termos para refletir evolução do serviço, segurança ou lei. Mudanças
        materiais serão comunicadas por meio razoável e terão vigência futura. Se a Contratante não concordar,
        poderá encerrar a contratação antes da vigência, sem prejuízo de obrigações já constituídas.
      </p>

      <h3>15. Comunicações e suporte</h3>
      <p>
        Avisos serão enviados ao e-mail cadastrado, dentro da plataforma ou por outro canal informado. A
        Contratante deve manter ao menos um contato administrativo válido. O suporte atenderá em{' '}
        <Pending>dias/horários/canal</Pending>, respeitando prioridades e limites do plano.
      </p>

      <h3>16. Disposições gerais</h3>
      <p>
        16.1. A tolerância não constitui renúncia. A nulidade de uma cláusula não invalida as demais; a cláusula
        será ajustada ao mínimo necessário para preservar sua finalidade lícita.
      </p>
      <p>
        16.2. A Contratante não poderá ceder o contrato sem autorização, exceto em reorganização societária que
        não prejudique o Rentovix. O Rentovix poderá utilizar prestadores de infraestrutura e suporte,
        permanecendo responsável por selecionar e instruir fornecedores conforme o DPA.
      </p>
      <p>16.3. Estes Termos não criam sociedade, franquia, representação, mandato, emprego, agência ou joint venture.</p>
      <p>
        16.4. Aplica-se a legislação brasileira. Antes de ação judicial, as partes tentarão solução por escrito
        durante <Pending>15</Pending> dias, sem impedir medidas urgentes ou direitos indisponíveis. Fica eleito o
        foro de <Pending>cidade/UF</Pending>, ressalvados foros legalmente privilegiados, inclusive os aplicáveis a
        consumidores.
      </p>

      <h2>PARTE B — Anexo de Tratamento de Dados Pessoais (DPA)</h2>

      <h3>1. Objeto e papéis</h3>
      <p>1.1. Este Anexo integra os Termos e regula o tratamento de dados pessoais realizado pelo Rentovix em nome da Contratante.</p>
      <p>
        1.2. Para os dados dos clientes finais da locadora, a Contratante é, em regra, controladora e o Rentovix é
        operador. A Contratante define finalidades, categorias, bases legais, prazos e instruções; o Rentovix
        fornece a infraestrutura e executa o tratamento necessário ao serviço.
      </p>
      <p>
        1.3. Cada parte é responsável pelos tratamentos em que definir autonomamente finalidades e meios. O
        Rentovix será controlador independente de dados de seus próprios administradores, contatos comerciais,
        faturamento, segurança, registros de acesso e suporte, conforme sua própria política de privacidade.
      </p>

      <h3>2. Dados e finalidades</h3>
      <p>
        Categorias tratadas: identificação (nome, CPF, RG, data de nascimento), habilitação (CNH), contato/endereço
        (telefone, e-mail, endereço), pagamento (dados de cobrança, PIX ou dados bancários fornecidos), locação
        (veículo, período, quilometragem, avarias, multas) e segurança/auditoria (logs, IP, data/hora, usuário). A
        Contratante não deve inserir categorias adicionais sem avaliar necessidade, base legal, transparência,
        risco e instrução específica.
      </p>

      <h3>3. Instruções e limites</h3>
      <p>
        3.1. O Rentovix tratará dados somente para prestar o serviço, atender instruções documentadas, cumprir lei
        ou proteger a segurança. Instrução manifestamente ilícita poderá ser recusada, com comunicação à
        Contratante.
      </p>
      <p>
        3.2. O Rentovix não poderá comercializar dados, criar perfil independente dos clientes finais, combinar
        bases para finalidade própria ou contatar clientes da Contratante para marketing, salvo instrução e
        fundamento jurídico autônomos.
      </p>
      <p>3.3. A Contratante garante que as instruções são lícitas, necessárias e compatíveis com os avisos fornecidos aos titulares.</p>

      <h3>4. Confidencialidade e acesso</h3>
      <p>
        O Rentovix restringirá o acesso ao mínimo necessário, exigirá confidencialidade de pessoas autorizadas,
        manterá controles de acesso e poderá registrar operações administrativas. A Contratante deve restringir os
        próprios Usuários Autorizados segundo necessidade de conhecimento.
      </p>

      <h3>5. Segurança</h3>
      <p>
        Medidas efetivamente implementadas hoje: HTTPS/TLS em todo o sistema, senhas armazenadas com hash forte
        (argon2), isolamento lógico entre empresas na plataforma, registros de auditoria de ações sensíveis,
        backups diários e limite de tentativas de acesso (rate limiting). A ANPD orienta agentes de pequeno porte
        a adotarem medidas administrativas e técnicas essenciais, política simplificada de segurança e registro
        simplificado das operações.
      </p>

      <h3>6. Suboperadores e infraestrutura</h3>
      <p>
        6.1. O Rentovix poderá contratar provedores de hospedagem, banco de dados, armazenamento, backup,
        monitoramento e suporte ("Suboperadores"), desde que imponha obrigações de confidencialidade, segurança e
        proteção de dados compatíveis com este Anexo.
      </p>
      <p>
        6.2. Situação atual: infraestrutura self-hosted (servidor próprio, sem provedor de nuvem terceiro para
        processamento de dados). <Pending>confirmar/atualizar caso essa arquitetura mude</Pending>.
      </p>

      <h3>7. Direitos dos titulares</h3>
      <p>
        7.1. A Contratante será o canal principal dos clientes finais para solicitações de acesso, correção,
        eliminação, portabilidade, informação, oposição ou revisão, quando aplicável.
      </p>
      <p>
        7.2. O Rentovix auxiliará a Contratante, dentro da capacidade técnica e da natureza do serviço, mediante
        pedido escrito enviado a <Pending>e-mail</Pending>, sem responder diretamente ao titular salvo instrução ou
        obrigação legal.
      </p>
      <p>
        7.3. A Contratante não poderá exigir eliminação quando houver obrigação de retenção, necessidade de
        defesa, segurança, auditoria ou outra hipótese legal. Nesses casos, o dado deverá ser bloqueado ou
        segregado quando possível.
      </p>

      <h3>8. Incidentes de segurança</h3>
      <p>
        8.1. Ao tomar conhecimento de incidente confirmado que possa afetar dados tratados em nome da Contratante,
        o Rentovix comunicará a Contratante sem demora injustificada pelo canal <Pending>a definir</Pending>,
        informando, na medida disponível: natureza do incidente, categorias de dados, titulares afetados ou
        potencialmente afetados, medidas adotadas, riscos conhecidos e ponto de contato.
      </p>
      <p>
        8.2. A Contratante será responsável por avaliar notificações aos titulares e à ANPD quando atuar como
        controladora, sem prejuízo das obrigações legais próprias do Rentovix.
      </p>
      <p>8.3. A Contratante deverá informar o Rentovix imediatamente sobre qualquer incidente que envolva suas credenciais, dispositivos, usuários, integrações ou dados enviados.</p>

      <h3>9. Auditoria e evidências</h3>
      <p>
        O Rentovix manterá informações razoáveis para demonstrar conformidade e responderá a questionários ou
        auditorias documentais proporcionais, desde que não exponham segredos, vulnerabilidades ou dados de outros
        clientes.
      </p>

      <h3>10. Retenção e devolução</h3>
      <p>
        <Pending>
          Tabela de prazos de retenção (dados cadastrais, contratos, cobrança, logs, backups) ainda não definida —
          exige decisão com advogado/contador antes de ser publicada como final
        </Pending>
        . Ao término, o Rentovix devolverá ou disponibilizará exportação e eliminará os dados conforme instrução,
        ressalvadas exceções legais e cópias de segurança sujeitas ao ciclo normal de sobrescrita.
      </p>

      <h2>Aceite eletrônico</h2>
      <p>
        Nome, CPF/CNPJ, representante, data/hora, versão dos Termos, IP e método de autenticação de cada aceite
        ficam registrados no sistema, conforme a pessoa que representa a Contratante aceita explicitamente este
        documento na plataforma.
      </p>
    </div>
  );
}
