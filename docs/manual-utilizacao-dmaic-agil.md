# Manual de Utilização

## DMAIC Ágil Suite

**Versão:** 1.1  
**Idioma da aplicação:** Português do Brasil  
**Público-alvo:** Master Black Belts, Black Belts, Green Belts, Product Owners, Scrum Masters e equipes responsáveis por melhoria de processos.

---

## 1. Sobre a aplicação

O **DMAIC Ágil Suite** é um workspace digital para organizar projetos de melhoria contínua usando uma combinação de:

- Lean Seis Sigma;
- ciclo DMAIC;
- práticas de Scrum e ciclos curtos;
- análise estruturada de causas;
- geração assistida por Gemini;
- análises locais de Pareto e I-MR.

A aplicação organiza o trabalho em quatro fases DMAIC:

1. **Definição:** entender o problema, alinhar o time, traduzir a voz do cliente e delimitar o projeto;
2. **Medição:** verificar a confiabilidade da medição, priorizar causas e desdobrar o resultado em Xs vitais;
3. **Análise e Melhoria:** analisar hipóteses e executar melhorias;
4. **Controle:** verificar a estabilidade e sustentar os ganhos obtidos.

O fluxo recomendado é:

> Descrever o problema → gerar os artefatos → revisar com o time → medir com dados reais → priorizar os Xs → testar melhorias → controlar o novo padrão.

---

## 2. Antes de começar

### 2.1 Informações necessárias

Para obter resultados úteis, prepare:

- uma descrição objetiva do problema;
- o processo ou etapa afetada;
- o impacto observado;
- o período em que o problema ocorre;
- o indicador de resultado, quando conhecido;
- dados de medição em CSV, caso queira executar Pareto ou I-MR;
- pessoas que conhecem o processo para validar as hipóteses geradas.

### 2.2 Como escrever um bom problem statement

Um bom enunciado contém quatro elementos:

1. **O que está acontecendo;**
2. **onde o problema ocorre;**
3. **qual é o impacto;**
4. **em qual período ou janela ele foi observado.**

### Exemplo fraco

> O processo está ruim.

### Exemplo recomendado

> O tempo entre a entrada da solicitação e a aprovação do crédito varia de 8 a 31 minutos nas agências, gerando retrabalho e baixa previsibilidade no fechamento mensal.

### 2.3 Chave do Gemini

O botão **Iniciar pipeline** utiliza a chave da Suíte configurada no ambiente seguro da aplicação. A chave não deve ser colada no campo do problema nem compartilhada com outros usuários.

Se a chave estiver ausente, inválida ou sem permissão para o modelo utilizado, a geração será interrompida e a aplicação mostrará uma mensagem de erro. A chave deve ser configurada no ambiente do servidor, nunca em um arquivo enviado ao GitHub ou exposto no navegador.

---

## 3. Visão geral da tela

### 3.1 Barra lateral

A barra lateral contém:

- identificação do projeto ativo;
- percentual visual de avanço;
- navegação por etapa do DMAIC;
- acesso ao guia da sala de melhoria e ao contexto do projeto;
- acesso ao guia da sala de melhoria.

As opções principais são:

- **Visão geral:** painel inicial do projeto;
- **Resumo executivo:** decisão, evidências, alertas e rastreabilidade;
- **Decisões:** registros de governança, responsáveis, evidências e histórico;
- **Definição:** enquadramento e alinhamento;
- **Medição:** dados, priorização e Xs vitais;
- **Análise e Melhoria:** análise, melhoria e controle;
- **Controle:** dados pós-intervenção, cartas X-AM e sustentabilidade.

As ferramentas ficam dentro da fase correspondente. O Mapa de processo, por exemplo, é acessado em **Medição**; Pareto e I-MR são ferramentas de inspeção rápida.

Em telas menores, use o botão de menu no topo para abrir ou fechar a barra lateral.

### 3.2 Barra superior

A barra superior apresenta:

- a etapa atual;
- o contexto do projeto;
- o campo de busca dos artefatos;
- o botão **Iniciar pipeline**;
- o menu de ações adicionais.

O botão de pipeline pode ser usado a partir de qualquer etapa. Para iniciar uma nova geração, confirme primeiro o conteúdo do problem statement.

### 3.3 Projetos salvos

O bloco **Projetos no Repositório** permite continuar um workspace persistido no banco de dados:

1. selecione um projeto na lista;
2. clique em **Carregar projeto**;
3. aguarde a restauração do problem statement, Charter e artefatos salvos.

Para começar do zero, use **Novo projeto**. Antes de trocar de projeto, salve as alterações atuais. O workspace local também preserva um rascunho temporário para ajudar na recuperação de edições não salvas.

### 3.4 Resumo executivo

O menu **Resumo executivo** reúne em uma única tela:

- problema do projeto;
- indicador Y e baseline;
- causas e hipóteses prioritárias;
- ações abertas;
- resultado atual da avaliação de Controle;
- alertas de pendências;
- trilha de rastreabilidade da causa ao resultado.

Use o filtro de status para visualizar hipóteses em **Backlog**, **Próximo**, **Em teste**, **Comprovada** ou **Rejeitada**. O campo de busca da barra superior pesquisa causas, evidências, Xs vitais e testes registrados no resumo.

O botão **Exportar relatório** gera um relatório executivo com problema, baseline, vínculos de rastreabilidade, decisões, histórico, resultado e anexos registrados.

O botão **Duplicar como modelo** cria uma cópia persistida do workspace no Repositório, preservando o conteúdo para reutilização em um novo projeto.

### 3.5 Painel de decisão e progresso

A **Visão geral** prioriza a decisão do próximo passo. Ela apresenta status do projeto, progresso das fases DMAIC, indicadores de pulso, pendências principais e o botão **Continuar em...** para abrir a próxima fase recomendada.

O Problem Statement e o Project Charter ficam no bloco recolhível **Contexto do projeto**, para não competir com o acompanhamento do ciclo.

Cada fase DMAIC possui um cabeçalho contextual fixo com objetivo, progresso, pendência principal e ação recomendada. O cabeçalho permanece visível durante a rolagem.

---

## 4. Fluxo recomendado de utilização

## Etapa 1 — Revisar o painel inicial

Ao abrir a aplicação, a tela **Visão geral** mostra:

- o resumo do propósito do workspace;
- o problem statement atual;
- indicadores de pulso do projeto;
- o mapa das três fases;
- o percentual visual de avanço de cada bloco.

Use essa tela para verificar se o problema está bem escrito antes de gerar os artefatos.

## Etapa 2 — Editar o problem statement

1. Localize o cartão **Problem statement**;
2. clique dentro da área de texto;
3. escreva ou revise a descrição do problema;
4. clique em **Salvar no Repositório**;
5. confirme a mensagem de sucesso exibida na tela.

O texto salvo é utilizado como entrada do pipeline da Suíte.

### Importante

O problem statement, Project Charter e os artefatos salvos são persistidos no Repositório. O topo da aplicação mostra **Salvo agora** ou **Alterações não salvas**. O rascunho local é atualizado automaticamente, mas use **Salvar no Repositório** para confirmar uma entrega importante. Ao trocar de projeto ou iniciar um novo, a aplicação avisa quando existem alterações pendentes.

## Etapa 3 — Iniciar o pipeline

1. Verifique se o problema possui pelo menos 10 caracteres;
2. clique em **Iniciar pipeline** no topo;
3. aguarde a mensagem **Montando seu caminho DMAIC**;
4. espere o retorno do Gemini;
5. após a conclusão, a aplicação direcionará você para **Definição**.

Durante a geração:

- não feche a aba;
- não clique repetidamente no botão;
- não trate os resultados como fatos medidos;
- prepare o time para revisar os artefatos assim que eles forem gerados.

O pipeline gera uma estrutura completa com:

- Project Charter;
- composição do time;
- VOC e CTQ;
- indicador Y;
- SIPOC;
- escopo;
- validação MSA;
- causas 6M;
- Xs vitais;
- hipóteses;
- plano 5W2H;
- acompanhamento de Controle.

### Como interpretar o resultado da Suíte

O Gemini, por meio da Suíte, propõe uma primeira estrutura a partir do enunciado informado. A saída deve ser tratada como:

- ponto de partida para uma conversa;
- hipótese de trabalho;
- rascunho estruturado;
- apoio à facilitação.

Ela não substitui:

- observação do processo;
- coleta de dados;
- validação com especialistas;
- aprovação do dono do processo;
- análise estatística com dados reais.

### 4.1 Alertas do workspace

O Resumo executivo pode sinalizar:

- ações sem responsável ou prazo;
- hipóteses sem evidência registrada;
- revisão de Controle pendente;
- dados ou artefatos ainda não salvos.

Esses alertas são orientações de governança e não substituem a revisão da equipe.

---

## 5. Definição

A Definição responde à pergunta:

> Estamos resolvendo o problema certo, com as pessoas certas e dentro de um escopo claro?

### 5.1 Project Charter

Abra o cartão **Project charter** para revisar:

- título do projeto;
- problema;
- objetivo;
- business case;
- economia ou ganho esperado;
- dono do processo;
- prazo ou marco de revisão.

O formulário é dividido em cinco etapas recolhíveis:

1. **Contexto:** projeto, cliente, área, líder, patrocinador, data, objetivo e histórico;
2. **Meta e escopo:** meta, KPIs, incluído, excluído, premissas e restrições;
3. **Cliente e VOC:** requisitos do cliente e contribuição para o negócio;
4. **Equipe:** membros, cargos, áreas e suporte técnico;
5. **Valor financeiro:** contribuições quantitativas e qualitativas, ganho esperado e informações financeiras.

Os estados dos artefatos distinguem autoria e aprovação: **Sugestão da IA**, **Editado pelo usuário**, **Validado**, **Aprovado** e **Desatualizado**. Uma sugestão gerada pela Suíte só se torna válida após revisão da equipe.

### 5.2 VOC → CTQ

O cartão **VOC → CTQ** traduz a voz do cliente em requisitos mensuráveis.

Analise cada linha considerando:

- **VOC need:** necessidade expressa pelo cliente;
- **issue:** dificuldade ou dor observada;
- **CTQ metric:** característica crítica para a qualidade que pode ser medida.

Exemplo:

| Voz do cliente | Problema traduzido | CTQ |
|---|---|---|
| Quero uma resposta previsível | O tempo varia muito entre solicitações | Tempo até aprovação |

### 5.3 Indicador Y

O indicador **Y** é o resultado que o projeto deseja melhorar. Revise:

- nome da métrica;
- definição operacional;
- baseline;
- meta;
- unidade de medida;
- frequência de medição;
- fonte do dado.

Evite indicadores vagos como “melhorar o atendimento”. Prefira algo como:

> Percentual de solicitações aprovadas em até 11 minutos, medido entre o registro da solicitação e a aprovação final.

### 5.4 SIPOC

O SIPOC ajuda a enxergar o processo no nível adequado antes de entrar em detalhes.

Revise as cinco colunas:

- **Suppliers:** fornecedores;
- **Inputs:** entradas;
- **Process:** principais etapas;
- **Outputs:** saídas;
- **Customers:** clientes ou próximos processos.

Mantenha o processo com aproximadamente 4 a 7 etapas macro. Um SIPOC detalhado demais perde sua função de alinhamento.

### 5.5 Dentro e fora do escopo

Confirme se cada item pertence ao projeto:

- **Dentro do escopo:** elementos que o time pode investigar e alterar;
- **Fora do escopo:** elementos importantes, mas que não serão tratados nesta iniciativa.

Registrar o que está fora evita expansão silenciosa do projeto.

---

## 6. Medição

A Medição responde à pergunta:

> O que os dados mostram e quais fatores merecem prioridade?

Antes das tabelas e gráficos, a fase apresenta uma **Leitura executiva** com três respostas: o que foi observado, o que isso significa e qual decisão é recomendada. Use essa leitura para a reunião e consulte os testes estatísticos para validar a decisão.

### 6.1 Validação MSA

Abra **MSA validation** para revisar a qualidade do sistema de medição.

Verifique:

- variável medida;
- repetibilidade;
- reprodutibilidade;
- status do Gage R&R;
- recomendação para uso dos dados.

Não avance para conclusões fortes se o sistema de medição não for confiável. Um padrão observado em uma medição ruim pode ser apenas erro de medição.

### 6.2 Causas 6M / Ishikawa

O agrupamento 6M organiza causas potenciais em:

- Método;
- Máquina;
- Material;
- Mão de obra;
- Medição;
- Meio ambiente.

Use o resultado para ampliar a investigação, não para confirmar automaticamente uma causa.

Pergunte ao time:

- essa causa realmente ocorre?
- há evidência?
- em qual etapa ela aparece?
- como podemos medi-la?
- ela está sob controle do projeto?

### 6.3 Matriz esforço x impacto

Classifique cada causa ou X conforme:

- esforço de tratar;
- impacto esperado;
- classificação resultante.

Uma ordem prática de ação é:

1. alto impacto e baixo esforço;
2. alto impacto e esforço moderado;
3. baixo impacto e baixo esforço, quando não distrair o time;
4. baixo impacto e alto esforço, geralmente para backlog.

### 6.4 Xs vitais

O Y é o resultado observado. Os **Xs vitais** são fatores controláveis que podem explicar ou movimentar esse resultado.

Para cada X vital, registre:

- identificador;
- descrição;
- meta específica;
- fase responsável;
- forma de medição;
- dono da investigação.

Selecione poucos Xs prioritários. A abordagem **One X Flow** funciona melhor quando cada fase testa um fator principal com clareza.

### 6.5 Mapa de processo

O cartão **Mapa de processo** permite desenhar e revisar o fluxo operacional:

- adicionar etapas do processo;
- conectar uma etapa à seguinte;
- registrar variáveis Y e X por etapa;
- classificar variáveis controláveis ou de ruído;
- editar propriedades da etapa;
- salvar o mapa no Repositório;
- exportar o mapa para uso em reuniões.

Use o mapa para conectar o SIPOC ao processo observado. O mapa é editável pela equipe e não deve ser tratado como fluxo validado sem revisão dos responsáveis.

O Mapa de processo abre em uma área ampla para facilitar edição, conexões e inspeção das variáveis. Pareto e I-MR permanecem adequados para inspeção rápida em painel compacto.

### 6.6 Análise de causa e efeito

O cartão **6M + matriz causa-efeito** reúne o Ishikawa e a organização das causas. A equipe pode:

- gerar uma estrutura inicial a partir das anotações;
- editar causas nos seis grupos 6M;
- adicionar ou remover causas;
- registrar evidências por hipótese;
- revisar o vínculo entre causa, X vital, teste, ação e resultado.

Uma hipótese só pode receber o status **Comprovada** quando houver evidência registrada. Sem evidência, a Suíte bloqueia a mudança e orienta o registro da justificativa.

---

## 7. Importação de CSV e análise de Pareto

O cartão **Pareto de defeitos** permite carregar um CSV diretamente no navegador.

### 7.1 Requisitos do arquivo

O arquivo deve:

- ter extensão `.csv`;
- possuir cabeçalho;
- conter pelo menos uma linha de dados;
- usar vírgula ou ponto e vírgula como separador;
- conter uma coluna textual para categoria/causa;
- opcionalmente conter uma coluna numérica.

### Exemplo simples

```csv
Motivo_Defeito,Quantidade
Documentação incompleta,38
Dado divergente,27
Aprovação pendente,18
Fila de integração,11
Outros,6
```

### 7.2 Como carregar

1. abra **Medição**;
2. clique em **Carregar CSV**;
3. escolha o arquivo;
4. aguarde a leitura local;
5. abra o cartão **Pareto de defeitos**;
6. revise as categorias ordenadas por ocorrência.

### 7.3 Como interpretar

O resultado organiza as categorias da maior para a menor frequência e mostra o percentual acumulado.

Use o gráfico para perguntar:

- quais poucas categorias concentram a maior parte do problema?
- essas categorias são controláveis?
- os dados representam todo o período?
- há categorias “Outros” grandes demais?
- a classificação foi consistente?

### 7.4 Privacidade dos dados

O arquivo CSV é lido no navegador para as análises locais. Não coloque senhas, chaves, dados pessoais desnecessários ou informações confidenciais no arquivo.

---

## 8. Importação de CSV e análise I-MR

O cartão **I-MR chart** analisa uma sequência de observações numéricas.

### 8.1 Requisitos do arquivo

O CSV deve ter:

- cabeçalho;
- pelo menos três observações numéricas;
- uma coluna com a métrica em ordem temporal ou de coleta;
- uma linha por observação.

### Exemplo

```csv
Amostra,Tempo_Aprovacao
1,24.2
2,25.1
3,23.8
4,24.9
5,25.5
6,24.1
7,26.0
```

### 8.2 Como carregar

1. abra **Medição**;
2. clique em **Carregar CSV**;
3. selecione o arquivo;
4. abra o cartão **I-MR chart**;
5. observe a sequência, a média e os sinais de variação.

### 8.3 O que a carta ajuda a observar

Use a carta para identificar:

- pontos fora dos limites;
- deslocamentos de nível;
- sequências prolongadas de um mesmo lado da média;
- mudanças abruptas;
- possível instabilidade do processo.

Um ponto fora do limite não explica a causa sozinho. Ele indica onde investigar.

### 8.4 Ordem da série

Mantenha as observações na ordem em que ocorreram. Não ordene os valores do menor para o maior, pois isso destrói a informação temporal necessária para uma carta de controle.

---

## 9. Análise e Melhoria

O ciclo A-I-C responde à pergunta:

> A equipe conseguiu comprovar a causa, melhorar o processo e criar condições para sustentar o resultado?

## 9.1 Análise Ágil

A etapa de análise pode incluir:

- testes de hipótese;
- ANOVA;
- teste t;
- regressão;
- confirmação ou rejeição de hipóteses.

Para cada hipótese, documente:

- X avaliado;
- Y impactado;
- teste utilizado;
- hipótese nula;
- resultado;
- decisão;
- evidência complementar.

Não use um p-valor isolado sem considerar contexto operacional, tamanho da amostra e relevância prática.

## 9.2 Melhoria Ágil

A etapa de melhoria transforma a hipótese em ação.

Use:

- brainstorming;
- solutions tree;
- experimentos pequenos;
- plano 5W2H;
- priorização de soluções.

O plano 5W2H deve deixar claro:

- **What:** o que será feito;
- **Why:** por que será feito;
- **Where:** onde ocorrerá;
- **When:** quando;
- **Who:** responsável;
- **How:** como;
- **How much:** custo ou esforço estimado.

Toda ação deve possuir um dono e uma evidência de conclusão.

### 9.3 Rastreabilidade das hipóteses e ações

Para cada hipótese, registre os vínculos:

- causa Ishikawa;
- X vital;
- teste realizado;
- decisão tomada;
- ação relacionada;
- resultado observado.

As ações do Plano de Ação possuem os campos 5W2H e uma área de notas da equipe. Para salvar uma ação, informe obrigatoriamente o responsável e o prazo. A ausência desses campos gera um bloqueio orientativo.

### 9.4 Decisões e histórico

Na seção **Decisões e histórico**, registre:

- decisão;
- responsável;
- data;
- evidência;
- impacto esperado.

As alterações de hipóteses e decisões entram no histórico do workspace e são persistidas no Repositório. Use esse registro para reconstruir por que o projeto tomou cada caminho.

## 9.5 Controle Ágil

A etapa de controle evita que o processo volte ao estado anterior.

Revise:

- parâmetro a controlar;
- especificação;
- frequência de medição;
- responsável;
- plano de reação;
- gatilho OCAP;
- Poka Yoke;
- plano de reação e controles de sustentação.

Um plano de controle útil responde:

> O que medir, com que frequência, por quem, contra qual limite e o que fazer quando sair do padrão?

## 9.6 Controle com CSV

A área **Controle** acompanha o comportamento pós-intervenção e verifica se o ganho foi sustentado.

Antes da avaliação, a Suíte exige uma baseline calculada a partir de dados da Medição. Sem essa referência inicial, a melhoria não pode ser avaliada de forma comparável.

### Carregar e selecionar dados

1. abra **Controle** no menu lateral;
2. clique em **Carregar CSV de Controle**;
3. escolha um CSV com cabeçalho e linhas de dados;
4. informe a quantidade de meses de coleta;
5. marque em **Indicadores para as cartas X-AM** as variáveis que deseja analisar.

Somente as variáveis marcadas entram nas cartas, no resumo estatístico e na avaliação da Suíte. Se o CSV possuir uma coluna de data reconhecida, o campo **Meses de coleta** seleciona as linhas mais recentes desse período.

### Informações exibidas

Para cada variável escolhida, a aplicação mostra:

- carta X-AM;
- média;
- desvio padrão;
- mínimo;
- máximo;
- quantidade de omissos;
- quantidade de observações numéricas válidas;
- limite superior e inferior de controle;
- último valor e variação em relação à baseline calculada.

Valores vazios ou não numéricos são tratados como omissos. A média, o desvio padrão, o mínimo e o máximo usam apenas valores numéricos válidos.

### Avaliação de sucesso e ganho financeiro via Suíte

Quando há pelo menos uma variável escolhida, a aplicação chama automaticamente a Suíte. A análise usa:

- **Definição da meta** do Project Charter;
- **Valor do ganho financeiro esperado**;
- **Informações financeiras coletadas**;
- baseline e média pós-controle;
- meses de coleta;
- estatísticas e limites das cartas X-AM;
- mínimo, máximo, desvio padrão e omissos.

A seção **Avaliação Suíte** informa se o sucesso está comprovado, apresenta o resumo da comparação e mostra o plano de sustentabilidade. O ganho financeiro só é calculado como valor real quando houver dados suficientes, como volume operacional, variação de eficiência, valor ou custo unitário, moeda e período.

Quando aplicável, a fórmula usada é:

> ganho financeiro = volume operacional do período × (variação de eficiência em p.p. ÷ 100) × valor ou custo unitário

Se algum componente não estiver preenchido, a Suíte deve informar o dado ausente e apresentar a fórmula sem inventar um valor.

### Salvar os dados de Controle

Clique em **Salvar no Repositório** para persistir no workspace:

- arquivo e linhas do CSV;
- meses de coleta;
- variáveis escolhidas;
- estatísticas calculadas;
- avaliação da Suíte disponível;
- plano de sustentabilidade.

Após o sucesso, aparece a confirmação **Controle salvo no Repositório**. O salvamento de Controle não depende de o pipeline completo já ter sido gerado.

O Controle começa com uma **Leitura executiva**: o que foi observado nos dados pós-intervenção, o que isso significa para a estabilidade e qual decisão é recomendada. Depois aparecem as cartas X-AM, o resumo estatístico e a avaliação da Suíte.

### Exportar todas as informações em PDF

Clique em **Exportar PDF**. Uma nova aba será aberta com o relatório completo, contendo:

- identificação do arquivo e período;
- variáveis selecionadas;
- resumo estatístico;
- gráficos das cartas X-AM com valores, média, LSC e LIC;
- avaliação da Suíte;
- baseline, média pós-controle e variação;
- ganho financeiro e memória de cálculo;
- plano de sustentabilidade.

Na nova aba, clique em **Imprimir / Salvar como PDF** e escolha a impressora **Salvar como PDF** do navegador.

---

## 10. Abrir e revisar detalhes

Os cartões de entregáveis podem ser abertos para visualizar detalhes.

No drawer lateral:

- **Visualização:** mostra a leitura resumida ou o gráfico;
- **Dados & notas:** explica a origem e a interpretação;
- **Fechar detalhe:** retorna à fase;
- **Exportar visão:** área reservada para saída visual do entregável.

Quando um pipeline tiver sido executado, o drawer informa que o conteúdo foi **gerado pela Suíte**. Quando não houver geração, o conteúdo de exemplo será identificado como local.

### 10.1 Evidências e anexos

No **Resumo executivo**, use **Adicionar anexo** para registrar metadados de atas, imagens, documentos e outros arquivos usados como evidência. Os anexos ficam associados ao workspace e aparecem no relatório executivo.

### 10.2 Duplicar como modelo

Use **Duplicar como modelo** no Resumo executivo para criar um novo projeto no Repositório com a estrutura atual como ponto de partida. Revise o nome, o problema e os artefatos antes de iniciar um novo pipeline.

## 10.3 Salvamento e segurança

- salve o Project Charter antes de iniciar o pipeline;
- salve o Controle depois de selecionar as variáveis e aguardar a avaliação;
- não coloque chaves de API, senhas ou tokens no CSV, no Charter ou em comentários;
- não versione arquivos `.env`;
- confirme o projeto ativo antes de salvar;
- trate sugestões da Suíte como material para revisão, não como aprovação automática.

### 10.4 Estados vazios, ferramentas e telas menores

Quando uma análise ainda não tem dados, a aplicação informa o que falta, por que o dado é necessário, o formato mínimo esperado e oferece uma ação direta para carregar o arquivo. Um estado vazio não significa que o processo foi analisado e não encontrou resultado.

O Mapa de processo, Ishikawa e Plano de ação abrem em área ampla, pois exigem edição e leitura detalhadas. Pareto, I-MR e detalhes resumidos permanecem em painéis compactos.

Em telas menores:

- use o botão de menu para abrir a navegação;
- use rolagem horizontal nas tabelas extensas;
- revise as colunas prioritárias antes de apresentar os dados;
- confirme o foco visível ao navegar pelo teclado;
- use os estados textuais, e não apenas cores, para distinguir situação e aprovação.

---

## 11. Como conduzir uma reunião usando a aplicação

### Reunião de abertura

1. leia o problem statement;
2. confirme o dono do processo;
3. revise o Project Charter;
4. valide o Y;
5. confirme o escopo;
6. aceite ou ajuste o SIPOC;
7. registre pendências.

### Reunião de medição

1. valide o sistema de medição;
2. carregue dados representativos;
3. revise Pareto;
4. analise a carta I-MR;
5. compare as causas com a observação no processo;
6. priorize as causas;
7. selecione o próximo X vital.

### Review de hipótese

1. escolha uma hipótese;
2. defina o teste;
3. confirme o período e o tamanho da amostra;
4. registre o resultado;
5. decida manter, rejeitar ou reformular a hipótese;
6. abra uma ação de melhoria somente quando houver evidência suficiente.

### Reunião de controle

1. compare baseline e resultado após a melhoria;
2. confirme se a mudança foi incorporada ao processo;
3. revise o plano de reação;
4. defina o responsável pelo monitoramento;
5. formalize POP, Poka Yoke ou OCAP;
6. agende a próxima revisão.

---

## 12. Boas práticas

- escreva problemas observáveis e mensuráveis;
- prefira dados reais a opiniões;
- valide toda saída da Suíte com o time;
- não transforme hipótese em causa confirmada sem evidência;
- mantenha o escopo explícito;
- escolha poucos Xs vitais;
- preserve a ordem temporal dos dados I-MR;
- não misture períodos ou populações sem registrar a mudança;
- mantenha unidades e definições operacionais consistentes;
- registre decisões e responsáveis;
- sempre crie um plano de reação para o pós-melhoria;
- faça backup dos arquivos de dados antes de qualquer análise importante.

---

## 13. Solução de problemas

### O pipeline não inicia

Verifique:

1. se o problem statement possui pelo menos 10 caracteres;
2. se a chave Gemini está configurada;
3. se a chave possui permissão para o modelo;
4. se o serviço está disponível;
5. se a mensagem de erro sugere tentar novamente.

### A geração retorna erro

Possíveis causas:

- chave inválida;
- limite ou cota da API;
- serviço Gemini indisponível;
- resposta incompleta;
- problema temporário de rede.

Tente novamente uma vez. Se persistir, reduza o texto do problema e confirme a configuração da chave.

### A Avaliação da Suíte não aparece

Confira:

- se o servidor da API está em execução;
- se `GOOGLE_API_KEY` está configurada no ambiente do servidor;
- se pelo menos uma variável foi selecionada;
- se há valores numéricos válidos no período;
- se o navegador foi atualizado após uma alteração no servidor.

Mensagens como **A integração Gemini ainda não está configurada** indicam ausência da chave no servidor. Mensagens sobre formato inválido indicam resposta incompleta da Suíte ou instabilidade temporária; tente novamente após confirmar a conexão.

### O botão Salvar no Repositório não mostra confirmação

Verifique se o problem statement possui pelo menos 10 caracteres e se o servidor consegue acessar o Repositório. Após o sucesso, a mensagem **Controle salvo no Repositório** aparece no painel. Se houver conflito de revisão, carregue a versão mais recente do projeto antes de salvar novamente.

### O PDF não mostra os gráficos

Use o botão **Exportar PDF** depois que as cartas forem exibidas. Na nova aba, aguarde o conteúdo carregar e escolha **Imprimir / Salvar como PDF**. Não use a impressão da tela original, pois ela não inclui necessariamente o relatório completo.

### O CSV não é aceito

Confira:

- extensão `.csv`;
- cabeçalho presente;
- linhas de dados presentes;
- separador consistente;
- valores numéricos válidos para I-MR;
- categorias textuais válidas para Pareto.

### A carta I-MR não aparece

É necessário ter pelo menos três valores numéricos. Remova linhas vazias, textos misturados na coluna de medição e valores com formatação inválida.

### O Pareto ficou com categorias incorretas

O leitor identifica a primeira célula textual não vazia de cada linha como categoria. Organize o CSV com uma coluna de causa claramente preenchida e evite colocar comentários textuais em outras colunas antes dela.

### Os dados não aparecem ao reabrir o projeto

Confirme que o botão de salvamento foi concluído e que o projeto correto foi carregado na lista **Projetos no Repositório**. Dados alterados depois do último salvamento podem permanecer apenas no rascunho local. CSVs e avaliações devem ser salvos novamente após qualquer mudança de período ou variável.

---

## 14. Glossário rápido

| Termo | Significado |
|---|---|
| **DMAIC** | Define, Measure, Analyze, Improve, Control |
| **Y** | Resultado ou indicador que o projeto quer melhorar |
| **X** | Fator que pode influenciar o Y |
| **X vital** | Fator prioritário com maior potencial de explicar ou mover o resultado |
| **VOC** | Voice of Customer, ou Voz do Cliente |
| **CTQ** | Critical to Quality, característica crítica para a qualidade |
| **SIPOC** | Suppliers, Inputs, Process, Outputs, Customers |
| **MSA** | Measurement System Analysis |
| **Gage R&R** | Avaliação de repetibilidade e reprodutibilidade do sistema de medição |
| **Pareto** | Priorização por frequência e percentual acumulado |
| **I-MR** | Carta de valores individuais e amplitude móvel |
| **5W2H** | Estrutura de planejamento de ações |
| **OCAP** | Plano de reação para condição fora do padrão |
| **Poka Yoke** | Mecanismo de prevenção de erro |

---

## 15. Checklist de encerramento do projeto

- [ ] Problem statement validado pelo dono do processo;
- [ ] Project Charter aprovado;
- [ ] VOC traduzida em CTQs;
- [ ] indicador Y definido operacionalmente;
- [ ] baseline registrado;
- [ ] escopo confirmado;
- [ ] MSA avaliado;
- [ ] dados de medição revisados;
- [ ] causas priorizadas;
- [ ] Xs vitais selecionados;
- [ ] hipóteses testadas;
- [ ] melhorias implementadas;
- [ ] resultado comparado ao baseline;
- [ ] plano de reação e controles de sustentação definidos;
- [ ] plano de reação definido;
- [ ] responsável pelo acompanhamento nomeado;
- [ ] próxima revisão agendada.
- [ ] dados pós-intervenção carregados em Controle;
- [ ] variáveis escolhidas e estatísticas revisadas;
- [ ] avaliação da Suíte revisada pelo time;
- [ ] ganho financeiro validado com o responsável financeiro;
- [ ] Controle salvo no Repositório;
- [ ] relatório de Controle exportado em PDF.

---

## 16. Nota sobre responsabilidade

O DMAIC Ágil Suite é uma ferramenta de apoio à análise e facilitação. Os resultados gerados pela Suíte, as classificações de causa e as recomendações de melhoria devem ser revisados por profissionais responsáveis pelo processo antes de qualquer decisão operacional, financeira, regulatória ou de segurança.
