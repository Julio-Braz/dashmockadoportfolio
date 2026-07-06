// ============================================================================
// GERADOR DE DADOS MOCKADOS — "Clínica Flow" (dados 100% fictícios)
// Todos os nomes, telefones, valores e métricas são gerados por seed fixo.
// Nenhum dado real de clientes ou pacientes está presente neste projeto.
// As datas são relativas a "hoje" para o demo estar sempre atual.
// ============================================================================

// --- PRNG determinístico (mulberry32) ---
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DIA_MS = 86400000
const HOJE = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d })()
const hojeMs = HOJE.getTime()
const iso = ms => new Date(ms).toISOString().slice(0, 10)

// --- catálogos fictícios ---
const NOMES_F = ['Ana', 'Beatriz', 'Camila', 'Daniela', 'Elisa', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Juliana', 'Karina', 'Larissa', 'Mariah', 'Natália', 'Olívia', 'Patrícia', 'Renata', 'Sabrina', 'Tatiana', 'Vanessa', 'Vitória', 'Yasmin', 'Clara', 'Sofia', 'Lívia', 'Bianca', 'Carolina', 'Débora', 'Eduarda', 'Flávia']
const NOMES_M = ['André', 'Bruno', 'Carlos', 'Diego', 'Eduardo', 'Felipe', 'Gustavo', 'Henrique', 'Igor', 'João', 'Leonardo', 'Marcelo', 'Rafael', 'Thiago', 'Vinícius']
const SOBRENOMES = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Ferreira', 'Gomes', 'Lacerda', 'Machado', 'Nogueira', 'Oliveira', 'Pereira', 'Queiroz', 'Ribeiro', 'Santos', 'Teixeira', 'Uchoa', 'Vasconcelos', 'Xavier', 'Azevedo', 'Braga', 'Camargo', 'Dias', 'Fontes', 'Guimarães', 'Lima', 'Moraes', 'Neves', 'Prado', 'Rocha']
const BAIRROS = ['Ipanema', 'Leblon', 'Copacabana', 'Botafogo', 'Tijuca', 'Barra da Tijuca', 'Flamengo', 'Laranjeiras', 'Jardim Botânico', 'Gávea', 'Recreio', 'Icaraí', 'Lagoa', 'Urca', 'Méier']
const PROFISSIONAIS = ['Dra Helena', 'Dra Laura']
const TRATAMENTOS = [
  { tag: 'Botox', txt: 'Toxina botulínica para linhas de expressão na testa e ao redor dos olhos.' },
  { tag: 'Preenchimento', txt: 'Preenchimento labial com ácido hialurônico, busca resultado natural.' },
  { tag: 'Bioestimulador', txt: 'Interesse em Sculptra e Radiesse para firmeza da pele.' },
  { tag: 'Ultraformer', txt: 'Flacidez na face e pescoço, quer saber sobre Ultraformer.' },
  { tag: 'Fotona', txt: 'Melhorar textura da pele e flacidez com laser Fotona.' },
  { tag: 'Melasma', txt: 'Manchas de melasma nas bochechas, já tentou clareadores.' },
  { tag: 'Capilar', txt: 'Queda de cabelo há alguns meses, interesse em tratamento capilar.' },
  { tag: 'Limpeza de pele', txt: 'Limpeza de pele profunda e cuidados com acne.' },
  { tag: 'Skinbooster', txt: 'Hidratação profunda com skinbooster antes de evento.' },
  { tag: 'Peeling', txt: 'Peeling para uniformizar o tom da pele e amenizar cicatrizes.' },
  { tag: 'Emface', txt: 'Lifting sem agulhas — quer entender o protocolo Emface.' },
  { tag: 'Harmonização', txt: 'Avaliação para harmonização facial completa.' },
]
const LOST_REASONS = ['Preço', 'Sem retorno / silêncio', 'Fechou em outra clínica', 'Distância', 'Só queria informação', 'Fora do perfil de atendimento', 'Vai decidir depois']
const HANDOFFS = ['Dúvida de preço', 'Caso clínico complexo', 'Pediu atendente humano', 'Reagendamento', 'Pós-venda', 'Outros']
const DISPOSITIVOS = ['Android', 'Apple', 'Web']

// --- campanhas Meta fictícias ---
const META_CAMPAIGNS = [
  { id: '120001', name: 'FUNDO | Conversão WhatsApp', ads: 4, spendDia: 120, msgRate: 1.0 },
  { id: '120002', name: 'MEIO | Remarketing Vídeo', ads: 3, spendDia: 65, msgRate: 0.35 },
  { id: '120003', name: 'TOPO | Reconhecimento', ads: 3, spendDia: 45, msgRate: 0.1 },
]
const IG_SHORTCODES = ['DEMOaa1Xy01', 'DEMObb2Xy02', 'DEMOcc3Xy03', 'DEMOdd4Xy04', 'DEMOee5Xy05', 'DEMOff6Xy06', 'DEMOgg7Xy07', 'DEMOhh8Xy08', 'DEMOii9Xy09', 'DEMOjj0Xy10']
const META_DIAS = 92    // janela de dados sincronizados da Meta (~"últimos 90 dias")

// --- campanhas Google fictícias ---
const GOOGLE_CAMPAIGNS = [
  { id: '21001', name: 'Pesquisa | Marca', channel: 'SEARCH', costDia: 18 },
  { id: '21002', name: 'Pesquisa | Tratamentos', channel: 'SEARCH', costDia: 34 },
  { id: '21003', name: 'PMax | Clínica', channel: 'PERFORMANCE_MAX', costDia: 12 },
]
const GOOGLE_KEYWORDS = [
  'clinica estetica zona sul', 'botox preço', 'preenchimento labial', 'ultraformer',
  'fotona laser', 'harmonização facial', 'bioestimulador de colágeno', 'tratamento melasma',
  'clinica flow', 'skinbooster', 'limpeza de pele profunda', 'peeling químico',
  'tratamento capilar', 'dermatologista estética',
]
const GOOGLE_TERMS_EXTRA = [
  'quanto custa botox na testa', 'melhor clinica estetica perto de mim', 'preenchimento labial antes e depois',
  'ultraformer mpt vale a pena', 'laser para manchas no rosto', 'harmonizacao facial preço',
  'sculptra quantas sessoes', 'clinica flow avaliações',
]
const GOOGLE_DIAS = 92  // janela de dados sincronizados do Google (~"últimos 90 dias")

const LEADS_DIAS = 365
const LEADS_SEED = 20260101

// helpers de sorteio
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]
const range = (rng, min, max) => min + rng() * (max - min)
const rint = (rng, min, max) => Math.floor(range(rng, min, max + 1))
const chance = (rng, p) => rng() < p

function nomeCompleto(rng, sexo) {
  const primeiro = sexo === 'M' ? pick(rng, NOMES_M) : pick(rng, NOMES_F)
  return `${primeiro} ${pick(rng, SOBRENOMES)} ${pick(rng, SOBRENOMES)}`
}
function telefoneFake(rng) {
  // número fictício — bloco 9 0000-xxxx não é atribuído a assinantes no Brasil
  const ddd = pick(rng, ['21', '21', '21', '11', '22', '24'])
  return `55${ddd}9000${String(rint(rng, 0, 9999)).padStart(4, '0')}`
}
const chatLink = id => `https://example.com/chat/${id}`

// ============================================================================
// LEADS — tabela principal (mesmo shape consumido pelas abas/calculations)
// ============================================================================
let _leads = null
export function getMockLeads() {
  if (_leads) return _leads
  const rng = mulberry32(LEADS_SEED)
  const leads = []
  let id = 1000

  for (let d = LEADS_DIAS; d >= 0; d--) {
    const diaMs = hojeMs - d * DIA_MS
    const dow = new Date(diaMs).getUTCDay()
    // volume cresce ao longo do ano (3 → 8,5 leads/dia), mais fraco no fim de semana
    const base = 3 + 5.5 * ((LEADS_DIAS - d) / LEADS_DIAS)
    const fimDeSemana = dow === 0 || dow === 6 ? 0.45 : 1
    const n = Math.max(0, Math.round(base * fimDeSemana + range(rng, -1.2, 1.6)))

    for (let i = 0; i < n; i++) {
      id++
      const sexo = chance(rng, 0.86) ? 'F' : 'M'
      const trat = pick(rng, TRATAMENTOS)
      const hourCreated = rint(rng, 7, 22)
      const createdMs = diaMs + (hourCreated * 60 + rint(rng, 0, 59)) * 60000
      const dentroMeta = d <= META_DIAS

      // ---- aquisição ----
      // pagos Meta crescem quando há dados sincronizados; Google constante e menor
      const rPago = rng()
      let utm_source = null, utm_medium = null, utm_campaign = null, utm_content = null, utm_term = null, gclid = null, tag_origem, origem
      if (rPago < (dentroMeta ? 0.46 : 0.32)) {
        utm_source = 'instagram'; utm_medium = 'ad'
        const code = pick(rng, IG_SHORTCODES)
        if (chance(rng, 0.85)) utm_content = `https://www.instagram.com/p/${code}/`
        tag_origem = 'Anúncio Instagram'; origem = 'Vi um anúncio no Instagram'
      } else if (rPago < (dentroMeta ? 0.58 : 0.44)) {
        utm_source = 'google'; utm_medium = 'cpc'
        utm_campaign = pick(rng, GOOGLE_CAMPAIGNS.slice(0, 2)).id
        if (chance(rng, 0.75)) utm_term = pick(rng, GOOGLE_KEYWORDS)
        gclid = `demo${Math.floor(rng() * 1e9).toString(36)}`
        tag_origem = 'Google'; origem = 'Pesquisei no Google'
      } else {
        tag_origem = pick(rng, ['Instagram Orgânico', 'Instagram Orgânico', 'Indicação', 'Site', 'Retorno'])
        origem = tag_origem === 'Indicação' ? 'Indicação de amiga'
          : tag_origem === 'Site' ? 'Vi no site da clínica'
            : tag_origem === 'Retorno' ? 'Já sou paciente' : 'Vi no Instagram da clínica'
      }

      // ---- perfil / classificação ----
      const rPerfil = rng()
      const Perfil_lead = rPerfil < 0.22 ? 'LEAD PRIORITÁRIO'
        : rPerfil < 0.55 ? 'LEAD POTENCIAL'
          : rPerfil < 0.70 ? 'LEAD PERFIL FORA / BAIXO FIT'
            : rPerfil < 0.84 ? 'LEAD FANTASMA' : null

      // ---- funil ----
      // taxa de agendamento depende do perfil (prioritário converte mais)
      const pAgendar = Perfil_lead === 'LEAD PRIORITÁRIO' ? 0.72
        : Perfil_lead === 'LEAD POTENCIAL' ? 0.52
          : Perfil_lead === 'LEAD PERFIL FORA / BAIXO FIT' ? 0.18
            : Perfil_lead === 'LEAD FANTASMA' ? 0.04 : 0.35
      const agendou = chance(rng, pAgendar)

      let stage_pipeline, status_agendado = null, quando_agendou = null, agendado_para = null
      let horario_agendamento = null, hora_agendamento_realizado = null
      let tempo_medio_agendamento_em_horas = null, quem_fez_o_agendamento = null
      let status_comparecimento = null, valor_fechado = null, lost_reason_category = null

      if (agendou) {
        stage_pipeline = 'Agendado'
        status_agendado = true
        // tempo até agendar: 70% no mesmo dia, 30% em 1–6 dias
        const mesmoDia = chance(rng, 0.7)
        tempo_medio_agendamento_em_horas = mesmoDia
          ? Math.round(range(rng, 0.1, 9) * 100) / 100
          : Math.round(range(rng, 26, 140) * 100) / 100
        const agendouMs = createdMs + tempo_medio_agendamento_em_horas * 3600000
        quando_agendou = iso(agendouMs)
        // consulta 2–21 dias após o agendamento
        const consultaMs = agendouMs + rint(rng, 2, 21) * DIA_MS
        agendado_para = iso(consultaMs)
        // horário comercial com "golden hour" no fim da manhã / meio da tarde
        const hCons = pick(rng, [9, 10, 10, 11, 11, 11, 14, 15, 15, 16, 16, 17])
        horario_agendamento = `${String(hCons).padStart(2, '0')}:${pick(rng, ['00', '20', '40'])}:00`
        // hora em que o AGENDAMENTO foi feito (IA atende fora do comercial também)
        const hReal = pick(rng, [8, 9, 10, 10, 11, 11, 12, 13, 14, 15, 15, 16, 17, 18, 19, 20, 21, 22])
        hora_agendamento_realizado = `${String(hReal).padStart(2, '0')}:${String(rint(rng, 0, 59)).padStart(2, '0')}:00`
        quem_fez_o_agendamento = chance(rng, 0.78) ? 'IA' : 'Equipe'

        // comparecimento só para consultas no passado
        if (consultaMs < hojeMs - DIA_MS) {
          const rComp = rng()
          if (rComp < 0.58) {
            status_comparecimento = chance(rng, 0.6) ? 'CONFIRMADO_PACIENTE' : 'FINALIZADO'
            // parte dos que compareceram fecha tratamento
            if (chance(rng, 0.5)) {
              const tabela = { Botox: [1200, 2800], Preenchimento: [1600, 3600], Bioestimulador: [2400, 6500], Ultraformer: [3800, 9500], Fotona: [2600, 7000], Melasma: [1000, 3200], Capilar: [1300, 4500], 'Limpeza de pele': [380, 850], Skinbooster: [1200, 2800], Peeling: [700, 2200], Emface: [4200, 9800], 'Harmonização': [3400, 10500] }
              const [mn, mx] = tabela[trat.tag] || [800, 5000]
              valor_fechado = Math.round(range(rng, mn, mx) / 50) * 50
            }
          } else if (rComp < 0.75) {
            status_comparecimento = 'FALTOU'
          } else if (rComp < 0.85) {
            status_comparecimento = 'CANCELADO_PACIENTE'
          } // restante fica pendente de atualização
        }
      } else {
        const rStage = rng()
        if (rStage < 0.30) {
          stage_pipeline = 'Perdido'
          lost_reason_category = pick(rng, LOST_REASONS)
        } else if (rStage < 0.55) {
          stage_pipeline = 'Contato Inicial'
        } else if (rStage < 0.78) {
          stage_pipeline = 'Coleta de Dados'
        } else {
          stage_pipeline = 'Em Qualificação'
        }
      }

      // dados demográficos: mais completos para quem avançou no funil
      const avancado = agendou || stage_pipeline === 'Em Qualificação'
      const idade = chance(rng, avancado ? 0.85 : 0.4) ? rint(rng, 24, 74) : null
      const nome = chance(rng, avancado ? 0.95 : 0.35) ? nomeCompleto(rng, sexo) : null
      const bairro = chance(rng, avancado ? 0.8 : 0.3) ? pick(rng, BAIRROS) : null
      const telefone = telefoneFake(rng)

      leads.push({
        id,
        created_at: new Date(createdMs).toISOString(),
        telefone,
        Nome_completo: nome,
        sexo: nome ? sexo : null,
        bairro,
        idade_momento_preenchido: idade,
        profissional: chance(rng, 0.9) ? (chance(rng, 0.64) ? PROFISSIONAIS[0] : PROFISSIONAIS[1]) : null,
        interesse_ou_queixas: chance(rng, avancado ? 0.9 : 0.5) ? trat.txt : null,
        tag_interesse_queixa: trat.tag,
        origem,
        tag_origem,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid,
        utm_content_atualizado: utm_content,
        utm_image: null,
        stage_pipeline,
        status_agendado,
        quando_agendou,
        agendado_para,
        horario_agendamento,
        hora_agendamento_realizado,
        tempo_medio_agendamento_em_horas,
        quem_fez_o_agendamento,
        status_comparecimento,
        valor_fechado,
        fez_tratamento_antes: chance(rng, 0.7) ? chance(rng, 0.38) : null,
        lost_reason_category,
        handoff_category: chance(rng, 0.16) ? pick(rng, HANDOFFS) : null,
        Perfil_lead,
        Dispositivo: chance(rng, 0.82) ? pick(rng, [...DISPOSITIVOS.slice(0, 1), 'Android', 'Apple', 'Apple', 'Web']) : null,
        ia_travada: chance(rng, 0.06),
        quantidade_mensagens_enviadas: agendou ? rint(rng, 4, 18) : rint(rng, 1, 12),
        chatguru_chat: chance(rng, 0.75) ? chatLink(id) : null,
      })
    }
  }
  _leads = leads
  return _leads
}

// ============================================================================
// META ADS — insights diários + mapa de criativos
// ============================================================================
let _metaInsights = null
let _metaAdMap = null

function buildMeta() {
  const rng = mulberry32(LEADS_SEED + 7)
  const insights = []
  const adMap = []
  let sc = 0
  for (const c of META_CAMPAIGNS) {
    for (let a = 1; a <= c.ads; a++) {
      const adId = `${c.id}_ad${a}`
      adMap.push({
        ad_id: adId,
        ad_name: `${c.name.split('|')[0].trim()} — Criativo ${a}`,
        campaign_id: c.id,
        ig_shortcode: IG_SHORTCODES[sc % IG_SHORTCODES.length],
        thumbnail_url: null,
        instagram_permalink: null,
      })
      sc++
    }
  }
  for (let d = META_DIAS; d >= 1; d--) {
    const date = iso(hojeMs - d * DIA_MS)
    for (const c of META_CAMPAIGNS) {
      for (let a = 1; a <= c.ads; a++) {
        const fator = range(rng, 0.6, 1.4) / c.ads
        const spend = Math.round(c.spendDia * fator * 100) / 100
        const cpm = range(rng, 9, 16)
        const impressions = Math.round((spend / cpm) * 1000)
        const ctr = range(rng, 0.9, 2.2) / 100
        const clicks = Math.round(impressions * ctr)
        insights.push({
          date,
          campaign_id: c.id,
          campaign_name: c.name,
          ad_id: `${c.id}_ad${a}`,
          spend,
          impressions,
          reach: Math.round(impressions * range(rng, 0.55, 0.8)),
          clicks,
          link_clicks: Math.round(clicks * range(rng, 0.5, 0.8)),
          messaging_started: Math.round(spend / range(rng, 9, 16) * c.msgRate),
          video_views: Math.round(impressions * range(rng, 0.12, 0.35)),
          post_engagement: Math.round(impressions * range(rng, 0.02, 0.06)),
        })
      }
    }
  }
  _metaInsights = insights
  _metaAdMap = adMap
}
export function getMockMetaInsights() { if (!_metaInsights) buildMeta(); return _metaInsights }
export function getMockMetaAdMap() { if (!_metaAdMap) buildMeta(); return _metaAdMap }

// ============================================================================
// GOOGLE ADS — insights diários + keywords + termos de pesquisa
// ============================================================================
let _gInsights = null, _gKeywords = null, _gTerms = null

function buildGoogle() {
  const rng = mulberry32(LEADS_SEED + 13)
  const insights = []
  const keywords = []
  const terms = []

  for (let d = GOOGLE_DIAS; d >= 1; d--) {
    const date = iso(hojeMs - d * DIA_MS)
    for (const c of GOOGLE_CAMPAIGNS) {
      const cost = Math.round(c.costDia * range(rng, 0.55, 1.5) * 100) / 100
      const cpc = range(rng, 1.2, 3.4)
      const clicks = Math.round(cost / cpc)
      insights.push({
        date,
        campaign_id: c.id,
        campaign_name: c.name,
        channel_type: c.channel,
        cost,
        impressions: Math.round(clicks * range(rng, 8, 20)),
        clicks,
        conversions: Math.round(clicks * range(rng, 0.05, 0.16)),
      })
    }
    // linhas de keyword a cada 3 dias (volume menor, mesmo formato)
    if (d % 3 === 0) {
      for (const kw of GOOGLE_KEYWORDS) {
        if (!chance(rng, 0.6)) continue
        const camp = kw === 'clinica flow' ? GOOGLE_CAMPAIGNS[0] : GOOGLE_CAMPAIGNS[1]
        const cost = Math.round(range(rng, 1.5, 16) * 100) / 100
        const clicks = Math.max(1, Math.round(cost / range(rng, 1.1, 3)))
        keywords.push({
          date,
          keyword_text: kw,
          keyword_norm: kw,
          match_type: pick(rng, ['BROAD', 'PHRASE', 'EXACT']),
          campaign_id: camp.id,
          campaign_name: camp.name,
          cost,
          impressions: Math.round(clicks * range(rng, 7, 18)),
          clicks,
          conversions: chance(rng, 0.35) ? rint(rng, 1, 3) : 0,
        })
      }
      for (const term of [...GOOGLE_KEYWORDS, ...GOOGLE_TERMS_EXTRA]) {
        if (!chance(rng, 0.35)) continue
        const cost = Math.round(range(rng, 0.8, 9) * 100) / 100
        const clicks = Math.max(1, Math.round(cost / range(rng, 1.1, 3)))
        terms.push({
          date,
          search_term: term,
          keyword_text: GOOGLE_KEYWORDS.includes(term) ? term : pick(rng, GOOGLE_KEYWORDS),
          campaign_name: GOOGLE_CAMPAIGNS[1].name,
          cost,
          impressions: Math.round(clicks * range(rng, 6, 15)),
          clicks,
          conversions: chance(rng, 0.25) ? 1 : 0,
        })
      }
    }
  }
  _gInsights = insights
  _gKeywords = keywords
  _gTerms = terms
}
export function getMockGoogleInsights() { if (!_gInsights) buildGoogle(); return _gInsights }
export function getMockGoogleKeywords() { if (!_gKeywords) buildGoogle(); return _gKeywords }
export function getMockGoogleSearchTerms() { if (!_gTerms) buildGoogle(); return _gTerms }

// ============================================================================
// PACIENTES (ERP fictício) — vendas, contatos, produtos e links de chat
// ============================================================================
const CATALOGO = [
  { descricao: 'Toxina Botulínica Full Face', min: 1400, max: 3200 },
  { descricao: 'Preenchimento Ácido Hialurônico 1ml', min: 1800, max: 3600 },
  { descricao: 'Sculptra — 2 frascos', min: 3400, max: 6800 },
  { descricao: 'Ultraformer MPT Face Completa', min: 4500, max: 12000 },
  { descricao: 'Fotona 4D Protocolo', min: 3200, max: 9500 },
  { descricao: 'Exilis Ultra — pacote 4 sessões', min: 2800, max: 7500 },
  { descricao: 'Emface Protocolo Completo', min: 6000, max: 15000 },
  { descricao: 'Volnewmer Corporal', min: 5000, max: 13000 },
  { descricao: 'Mesoject Hair — pacote', min: 1800, max: 5200 },
  { descricao: 'Skinbooster Hidratação Profunda', min: 1400, max: 3200 },
  { descricao: 'Limpeza de Pele Premium', min: 380, max: 850 },
  { descricao: 'Peeling Químico Facial', min: 700, max: 2400 },
  { descricao: 'Consulta de Avaliação', min: 350, max: 700 },
]
// índices de itens premium (aparelhos) — pacientes de faixa alta compram mais deles
const CAT_PREMIUM = [3, 4, 5, 6, 7, 8]
const CAT_BASICO = [0, 1, 2, 9, 10, 11, 12]

// bandas de valor: [nº pacientes, alvo de pico 12m (min, max), compras no pico]
const BANDAS = [
  { n: 6, vp: [105000, 180000], nPico: [8, 14], extraAnos: 3 },   // Unique
  { n: 14, vp: [62000, 98000], nPico: [6, 11], extraAnos: 3 },    // Private
  { n: 45, vp: [31000, 58000], nPico: [4, 8], extraAnos: 2 },     // Prime
  { n: 85, vp: [15500, 29000], nPico: [3, 6], extraAnos: 2 },     // Select
  { n: 370, vp: [400, 14000], nPico: [1, 3], extraAnos: 1 },      // Start
]

let _vendas = null, _contatos = null, _produtosRows = null, _chatLinks = null

function buildPacientes() {
  const rng = mulberry32(LEADS_SEED + 29)
  const vendas = []
  const contatos = []
  const produtosRows = []
  const chatLinks = new Map()
  let codigo = 3000

  for (let b = 0; b < BANDAS.length; b++) {
    const banda = BANDAS[b]
    for (let i = 0; i < banda.n; i++) {
      codigo++
      const sexo = chance(rng, 0.88) ? 'F' : 'M'
      const nome = nomeCompleto(rng, sexo)
      const fone = telefoneFake(rng)
      const nasc = `${rint(rng, 1950, 2000)}-${String(rint(rng, 1, 12)).padStart(2, '0')}-${String(rint(rng, 1, 28)).padStart(2, '0')}`
      contatos.push({ codigo, nome, fones: [fone], bairro: pick(rng, BAIRROS), dt_nasc: nasc })
      if (chance(rng, 0.55)) chatLinks.set(fone, chatLink(`p${codigo}`))

      // status desejado → distância da última compra até hoje (em meses)
      const rSt = rng()
      const gapMeses = rSt < 0.55 ? range(rng, 0.3, 14.5)      // Ativo
        : rSt < 0.74 ? range(rng, 15.2, 23.5)                  // Adormecido
          : range(rng, 24.5, 48)                               // Perdido
      const ultimaMs = hojeMs - gapMeses * 30.44 * DIA_MS

      // compras do "pico": janela de 12m terminando na última compra
      const alvoVP = range(rng, banda.vp[0], banda.vp[1])
      const nPico = rint(rng, banda.nPico[0], banda.nPico[1])
      const valoresPico = []
      for (let k = 0; k < nPico; k++) valoresPico.push(range(rng, 0.6, 1.4))
      const fatorNorm = alvoVP / valoresPico.reduce((s, x) => s + x, 0)
      for (let k = 0; k < nPico; k++) {
        const valor = Math.round((valoresPico[k] * fatorNorm) / 10) * 10
        if (valor <= 0) continue
        const ts = ultimaMs - range(rng, 0, 330) * DIA_MS
        registrarVenda(rng, vendas, produtosRows, codigo, nome, ts, valor, b)
      }
      // garante que a última compra cai exatamente na data da recência sorteada
      const valorFinal = Math.round(range(rng, banda.vp[0] * 0.05, banda.vp[0] * 0.15) / 10) * 10 || 400
      registrarVenda(rng, vendas, produtosRows, codigo, nome, ultimaMs, Math.max(200, valorFinal), b)

      // histórico antigo fora do pico (mantém VP, engorda gasto total)
      const nExtra = b <= 2 ? rint(rng, 2, 8) : rint(rng, 0, 2)
      for (let k = 0; k < nExtra; k++) {
        const ts = ultimaMs - range(rng, 380, 380 + banda.extraAnos * 365) * DIA_MS
        const valor = Math.round(range(rng, 400, alvoVP * 0.12) / 10) * 10
        registrarVenda(rng, vendas, produtosRows, codigo, nome, ts, valor, b)
      }
    }
  }
  _vendas = vendas
  _contatos = contatos
  _produtosRows = produtosRows
  _chatLinks = chatLinks
}

function registrarVenda(rng, vendas, produtosRows, codigo, nome, ts, valor, banda) {
  if (ts > hojeMs) ts = hojeMs - DIA_MS
  vendas.push({ cod_contato: codigo, nome_contato: nome, dt_venda: iso(ts), valor_total: valor })
  // ~75% das vendas têm itens detalhados (cobertura parcial, como no mundo real)
  if (chance(rng, 0.75)) {
    const premium = banda <= 2 ? chance(rng, 0.6) : banda === 3 ? chance(rng, 0.35) : chance(rng, 0.12)
    const idx = premium ? pick(rng, CAT_PREMIUM) : pick(rng, CAT_BASICO)
    produtosRows.push({ cod_contato: codigo, produtos: [{ descricao: CATALOGO[idx].descricao }] })
  }
}

export function getMockVendas() { if (!_vendas) buildPacientes(); return _vendas }
export function getMockContatos() { if (!_contatos) buildPacientes(); return _contatos }
export function getMockProdutosRows() { if (!_produtosRows) buildPacientes(); return _produtosRows }
export function getMockChatLinks() { if (!_chatLinks) buildPacientes(); return _chatLinks }
