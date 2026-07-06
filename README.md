# Clínica Flow — Dashboard de Gestão de Leads e Pacientes

> **Projeto de portfólio.** Todos os dados exibidos são **100% fictícios**, gerados por algoritmo
> determinístico no navegador ([src/utils/mockData.js](src/utils/mockData.js)). Nomes, telefones,
> valores e métricas não correspondem a nenhuma pessoa ou empresa real.

Dashboard de inteligência comercial para clínicas de estética, com atendimento por IA no WhatsApp.
Demonstra a arquitetura e as visualizações de um produto real em produção, sem expor dados de clientes.

## Abas

| Aba | O que mostra |
| --- | --- |
| **Visão Geral** | KPIs do funil (leads, agendamentos, comparecimento, receita, ticket médio), evolução diária, funil de conversão, ROI por canal e agendamentos por perfil do lead |
| **Pipeline de Vendas** | Kanban por estágio (Contato Inicial → Agendado → Perdido) com busca, valor da venda e motivos de perda |
| **Performance IA** | Atribuição IA × humano, esforço de conversão (mensagens/tempo), golden hour, agendamentos fora do horário comercial e categorias de handoff |
| **Marketing & UTMs** | Performance por origem/campanha/criativo com base nos parâmetros UTM |
| **Perfil do Lead** | Demografia (idade, bairro, dispositivo), interesses e nuvem de palavras das queixas |
| **Dados Meta** | Cruzamento investimento (Meta Ads) × leads × receita: CPL, CPA, CAC, ROAS, funil de conversão, desempenho mensal, por campanha e por criativo |
| **Dados Google** | Mesmo cruzamento para Google Ads, incluindo performance por palavra-chave e termos de pesquisa |
| **Pacientes** | Programa de níveis (LTV): classificação por valor de pico 12m, status de retenção, matriz nível × status, receita recuperável e alertas inteligentes |

## Stack

- **React 18 + Vite** — SPA estática, sem backend (dados mockados no cliente)
- **Recharts** — gráficos
- **lucide-react** — ícones
- Design system próprio (dark, glassmorphism) em [src/index.css](src/index.css)

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
```

## Deploy

Build estático servido por Nginx via Docker:

```bash
docker build -t clinic-flow-dashboard .
docker run -p 8080:80 clinic-flow-dashboard
```

O [docker-compose.yml](docker-compose.yml) contém a configuração de produção (Traefik + Docker Swarm).
