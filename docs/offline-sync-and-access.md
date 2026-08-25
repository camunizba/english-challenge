# English Challenge — Sincronização Offline e Gestão de Acesso

## Estratégia de sincronização

Os lançamentos feitos sem rede serão gravados no dispositivo em uma fila local baseada em IndexedDB. Cada item conterá apenas os identificadores necessários para o registro, o horário original, o usuário que o originou, o status de sincronização e uma chave de idempotência gerada uma única vez. Nenhum nome de estudante ou observação privada é necessário para que a fila possa ser reenviada.

A tentativa de sincronização ocorrerá quando a aplicação recuperar conectividade, voltar ao primeiro plano ou quando o docente selecionar **Sync now**. O servidor manterá a mesma chave de idempotência para impedir que novas tentativas criem registros duplicados. Itens confirmados serão removidos do dispositivo; falhas de autorização ou de consistência permanecerão identificadas como conflito para revisão da liderança.

| Estado local | Significado | Próxima ação |
| --- | --- | --- |
| Pending synchronization | Registro salvo somente no dispositivo | Reenviar quando houver conexão |
| Syncing | Solicitação em andamento | Aguardar confirmação do servidor |
| Synced | Registro confirmado pelo servidor | Remover a cópia local |
| Conflict | Dados ou permissão alterados desde o lançamento | Manter para revisão, sem duplicar o lançamento |

## Gestão de acessos

A liderança administrará os usuários que já tenham uma identidade autenticada no sistema. Cada pessoa terá um papel escolar, um status de acesso e, no caso de docentes, vínculos explícitos de turma e disciplina. O servidor continuará sendo a fonte de verdade para autorizações: a interface apenas oferece controles de gestão.

| Papel | Acesso de gestão |
| --- | --- |
| Leadership | Lista usuários, define papel e status, mantém turmas, disciplinas e vínculos docentes |
| Teacher | Registra atividades apenas em turmas e disciplinas vinculadas, inclusive após sincronização offline |
| Viewer | Consulta somente o extrato do estudante vinculado e conteúdos autorizados |

Nenhum fluxo de sincronização promove permissões do cliente. Ao receber uma fila, o servidor revalida papel, vínculo docente, estudante ativo, turma, disciplina, confirmação de ocorrência e cooldown antes de aceitar cada lançamento.
