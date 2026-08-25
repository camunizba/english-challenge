# English Challenge — Arquitetura do MVP

## Visão da solução

O **English Challenge** será um aplicativo web responsivo, instalável e orientado ao uso escolar. A experiência principal é em inglês e prioriza lançamentos rápidos e positivos, enquanto os controles administrativos poderão ser apresentados em português ou inglês. O MVP usa autenticação existente da plataforma, uma API tipada, banco relacional e uma trilha de auditoria imutável para suportar o uso pedagógico com transparência.

## Papéis e acesso

| Papel | Acesso principal | Limites de privacidade |
| --- | --- | --- |
| Leadership | Configura regras, ciclos, pessoas, conversões, relatórios e revisões | Ações críticas exigem justificativa e ficam auditadas |
| Teacher | Localiza estudantes autorizados e cria, desfaz ou corrige seus lançamentos dentro da janela permitida | Não altera regras globais, ciclos encerrados ou registros de outros docentes |
| Viewer | Acompanha rankings permitidos, regras, ciclo e prêmio | O aluno só vê o próprio extrato; nunca vê detalhes de penalidades de terceiros |

## Fluxos essenciais

| Fluxo | Regra de controle |
| --- | --- |
| Lançamento rápido | O docente escolhe turma, disciplina e um ou mais estudantes; as ações são **English Interaction**, **Initiative Bonus** e **Portuguese Occurrence** |
| Lançamento de ocorrência | Exige confirmação curta antes de gravar; não é destaque em rankings públicos |
| Prevenção de duplicidade | Uma chave de idempotência e um cooldown por docente, estudante, ação e disciplina impedem repetições acidentais |
| Undo e correção | O cancelamento temporário cria um evento de auditoria; nenhuma linha de lançamento é apagada |
| Contestação | O estudante abre uma solicitação sem editar o lançamento; a liderança decide, corrige ou cancela, sempre com registro da decisão |
| Conversão em nota | O cálculo aplica teto por disciplina e período; o resultado só é oficial após revisão e aprovação da liderança |
| Champion | O ciclo calcula elegibilidade por interações, participação, status de matrícula e ocorrências; liderança revisa e confirma os vencedores |

## Modelo relacional do MVP

O modelo preserva a origem de cada evento e separa a pontuação conquistada da pontuação convertida em nota. As tabelas centrais são `schoolYears`, `classes`, `subjects`, `students`, `teacherAssignments`, `scoringRules`, `championCycles`, `activityEntries`, `entryRevisions`, `appeals`, `gradeConversions`, `championWinners` e `auditLogs`.

Cada lançamento armazena o valor aplicado no instante do evento, o ciclo associado, status, autor e chave de idempotência. Alterações e cancelamentos são eventos adicionais em `entryRevisions`, preservando a linha original. A regra de pontuação possui vigência, de modo que uma alteração administrativa não reescreve o passado.

## Decisões de privacidade e acessibilidade

O MVP usa dados fictícios, coleta apenas os campos necessários à demonstração e não publica e-mails, notas oficiais, observações privadas ou penalidades detalhadas. A interface utiliza contraste alto, texto claro, foco visível, ícones acompanhados de rótulos e botões suficientemente grandes para uso mobile. Rankings enfatizam saldo, participação e evolução, sem ordenar estudantes por ocorrências em português.

## Critérios de aceite do MVP

| Critério | Evidência esperada |
| --- | --- |
| Terminologia correta | As três ações aparecem exatamente com as denominações solicitadas |
| Sem exclusão permanente | Cancelamentos e correções conservam o lançamento inicial e produzem evento de auditoria |
| Controle de teto | O saldo convertido nunca excede o limite vigente, embora a participação excedente permaneça visível |
| Anti-duplicidade | O mesmo lançamento recente não é criado duas vezes e o motivo é comunicado no painel docente |
| Privacidade | Extrato é individual; rankings públicos não expõem as ocorrências de outros estudantes |
| Experiência mobile | Painel de lançamento e navegação funcionam em viewport estreito, com ações de toque claras |
