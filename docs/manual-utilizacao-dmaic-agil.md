# Manual de Utilização

## DMAIC Ágil Suite

**Versão:** 1.0  
**Idioma da aplicação:** Português do Brasil  
**Público-alvo:** Master Black Belts, Black Belts, Green Belts, Product Owners, Scrum Masters e equipes responsáveis por melhoria de processos.

---

## 1. Sobre a aplicação

O **DMAIC Ágil Suite** é um workspace digital para organizar projetos de melhoria contínua usando uma combinação de:

- Lean Seis Sigma;
- ciclo DMAIC;
- práticas de Scrum e sprints curtas;
- análise estruturada de causas;
- geração assistida por Gemini;
- análises locais de Pareto e I-MR.

A aplicação organiza o trabalho em três blocos:

1. **Definição Ágil — Sprint 1:** entender o problema, alinhar o time, traduzir a voz do cliente e delimitar o projeto;
2. **Medição Ágil — Sprint 2:** verificar a confiabilidade da medição, priorizar causas e desdobrar o resultado em Xs vitais;
3. **Ciclo Iterativo A-I-C — Sprint 3+:** analisar hipóteses, melhorar o processo e controlar os ganhos obtidos.

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

O botão **Iniciar pipeline** utiliza a chave Gemini configurada no ambiente seguro da aplicação. A chave não deve ser colada no campo do problema nem compartilhada com outros usuários.

Se a chave estiver ausente, inválida ou sem permissão para o modelo utilizado, a geração será interrompida e a aplicação mostrará uma mensagem de erro.

---

## 3. Visão geral da tela

### 3.1 Barra lateral

A barra lateral contém:

- identificação do projeto ativo;
- percentual visual de avanço;
- navegação por etapa do DMAIC;
- acesso rápido à biblioteca de métodos;
- acesso ao guia da sala de melhoria.

As opções principais são:

- **Visão geral:** painel inicial do projeto;
- **Sprint 1 · Definição:** enquadramento e alinhamento;
- **Sprint 2 · Medição:** dados, priorização e Xs vitais;
- **Sprint 3+ · A-I-C:** análise, melhoria e controle;
- **Charter & VOC:** atalhos para entregáveis de definição;
- **Análises:** atalhos para ferramentas de medição;
- **Controle:** atalhos para ferramentas de sustentação.

Em telas menores, use o botão de menu no topo para abrir ou fechar a barra lateral.

### 3.2 Barra superior

A barra superior apresenta:

- a etapa atual;
- o contexto do projeto;
- o campo de busca visual;
- o botão **Iniciar pipeline**;
- o menu de ações adicionais.

O botão de pipeline pode ser usado a partir de qualquer etapa. Para iniciar uma nova geração, confirme primeiro o conteúdo do problem statement.

---

## 4. Fluxo recomendado de utilização

## Etapa 1 — Revisar o painel inicial

Ao abrir a aplicação, a tela **Visão geral** mostra:

- o resumo do propósito do workspace;
- o problem statement atual;
- indicadores de pulso do projeto;
- o mapa das três sprints;
- o percentual visual de avanço de cada bloco.

Use essa tela para verificar se o problema está bem escrito antes de gerar os artefatos.

## Etapa 2 — Editar o problem statement

1. Localize o cartão **Problem statement**;
2. clique dentro da área de texto;
3. escreva ou revise a descrição do problema;
4. clique em **Salvar mudança**;
5. confirme a mensagem de sucesso exibida na tela.

O texto salvo é utilizado como entrada do pipeline de IA.

### Importante

O estado atual do workspace é mantido na sessão do navegador. Recarregar a página pode restaurar os dados de exemplo e remover os resultados gerados durante a sessão.

## Etapa 3 — Iniciar o pipeline

1. Verifique se o problema possui pelo menos 10 caracteres;
2. clique em **Iniciar pipeline** no topo;
3. aguarde a mensagem **Montando seu caminho DMAIC**;
4. espere o retorno do Gemini;
5. após a conclusão, a aplicação direcionará você para a **Sprint 1 · Definição**.

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
- priorização GUT;
- Xs vitais;
- hipóteses;
- FMEA;
- plano 5W2H;
- plano de controle;
- padronização/SOP.

### Como interpretar o resultado da IA

O Gemini propõe uma primeira estrutura a partir do enunciado informado. A saída deve ser tratada como:

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

---

## 5. Sprint 1 — Definição Ágil

A Sprint 1 responde à pergunta:

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

## 6. Sprint 2 — Medição Ágil

A Sprint 2 responde à pergunta:

> O que os dados mostram e quais fatores merecem prioridade?

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

### 6.3 Priorização GUT

A matriz GUT usa três critérios:

- **Gravidade:** tamanho do impacto;
- **Urgência:** necessidade de agir rapidamente;
- **Tendência:** probabilidade de piora.

O score GUT ajuda a ordenar a investigação. Ele não prova causalidade.

Use a matriz para escolher poucas causas de alto valor e evitar tentar resolver tudo ao mesmo tempo.

### 6.4 Matriz esforço x impacto

Classifique cada causa ou X conforme:

- esforço de tratar;
- impacto esperado;
- classificação resultante.

Uma ordem prática de ação é:

1. alto impacto e baixo esforço;
2. alto impacto e esforço moderado;
3. baixo impacto e baixo esforço, quando não distrair o time;
4. baixo impacto e alto esforço, geralmente para backlog.

### 6.5 Xs vitais

O Y é o resultado observado. Os **Xs vitais** são fatores controláveis que podem explicar ou movimentar esse resultado.

Para cada X vital, registre:

- identificador;
- descrição;
- meta específica;
- sprint responsável;
- forma de medição;
- dono da investigação.

Selecione poucos Xs prioritários. A abordagem **One X Flow** funciona melhor quando cada sprint testa um fator principal com clareza.

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

1. abra **Sprint 2 · Medição**;
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

1. abra **Sprint 2 · Medição**;
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

## 9. Sprint 3+ — Ciclo A-I-C

O ciclo A-I-C responde à pergunta:

> A equipe conseguiu comprovar a causa, melhorar o processo e criar condições para sustentar o resultado?

## 9.1 Análise Ágil

A etapa de análise pode incluir:

- testes de hipótese;
- ANOVA;
- teste t;
- regressão;
- FMEA;
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

## 9.3 Controle Ágil

A etapa de controle evita que o processo volte ao estado anterior.

Revise:

- parâmetro a controlar;
- especificação;
- frequência de medição;
- responsável;
- plano de reação;
- gatilho OCAP;
- Poka Yoke;
- POP/SOP;
- plano de controle.

Um plano de controle útil responde:

> O que medir, com que frequência, por quem, contra qual limite e o que fazer quando sair do padrão?

---

## 10. Abrir e revisar detalhes

Os cartões de entregáveis podem ser abertos para visualizar detalhes.

No drawer lateral:

- **Visualização:** mostra a leitura resumida ou o gráfico;
- **Dados & notas:** explica a origem e a interpretação;
- **Fechar detalhe:** retorna à sprint;
- **Exportar visão:** área reservada para saída visual do entregável.

Quando um pipeline tiver sido executado, o drawer informa que o conteúdo foi **gerado com IA**. Quando não houver geração, o conteúdo de exemplo será identificado como local.

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
- valide toda saída de IA com o time;
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

### Os dados desapareceram após atualizar a página

O workspace atual mantém os dados na sessão do navegador e ainda não funciona como um repositório persistente de projetos. Execute novamente o pipeline e carregue novamente os arquivos quando necessário.

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
| **GUT** | Gravidade, Urgência e Tendência |
| **FMEA** | Análise de modos e efeitos de falha |
| **5W2H** | Estrutura de planejamento de ações |
| **OCAP** | Plano de reação para condição fora do padrão |
| **Poka Yoke** | Mecanismo de prevenção de erro |
| **POP/SOP** | Procedimento Operacional Padrão |

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
- [ ] plano de controle aprovado;
- [ ] POP/SOP atualizado;
- [ ] plano de reação definido;
- [ ] responsável pelo acompanhamento nomeado;
- [ ] próxima revisão agendada.

---

## 16. Nota sobre responsabilidade

O DMAIC Ágil Suite é uma ferramenta de apoio à análise e facilitação. Os resultados gerados por IA, as classificações de causa e as recomendações de melhoria devem ser revisados por profissionais responsáveis pelo processo antes de qualquer decisão operacional, financeira, regulatória ou de segurança.
