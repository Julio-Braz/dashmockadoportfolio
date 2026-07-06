import { tokenizeText } from './stopwords';

export function filterLeads(leads, filters) {
  return leads.filter(lead => {
    // F1 - Date range on created_at (Data de Cadastro)
    if (filters.dateFrom || filters.dateTo) {
      const created = new Date(lead.created_at);
      if (filters.dateFrom && created < new Date(filters.dateFrom)) return false;
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59);
        if (created > to) return false;
      }
    }
    // F1b - Date range on quando_agendou (Data de Agendamento)
    if (filters.scheduleDateFrom || filters.scheduleDateTo) {
      if (!lead.quando_agendou) return false; // exclude leads with no schedule date
      const scheduled = new Date(lead.quando_agendou);
      if (filters.scheduleDateFrom && scheduled < new Date(filters.scheduleDateFrom)) return false;
      if (filters.scheduleDateTo) {
        const to = new Date(filters.scheduleDateTo);
        to.setHours(23, 59, 59);
        if (scheduled > to) return false;
      }
    }
    // F2 - Pipeline stage
    if (filters.stages && filters.stages.length > 0) {
      if (!filters.stages.includes(lead.stage_pipeline)) return false;
    }
    // F3 - Professional
    if (filters.profissional && filters.profissional !== 'Todos') {
      const norm = (s) => (s || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
      if (norm(lead.profissional) !== norm(filters.profissional)) return false;
    }
    // F4 - Attendance
    if (filters.comparecimento && filters.comparecimento !== 'Todos') {
      const comp = (lead.status_comparecimento || '').toUpperCase();
      const isPendente = !comp || comp === 'PENDENTE';
      const didAttend = comp === 'CONFIRMADO_PACIENTE' || comp === 'FINALIZADO';
      const didNotAttend = comp === 'CANCELADO_PACIENTE' || comp === 'FALTOU' || comp === 'CANCELADO' || comp === 'CANELADO';

      if (filters.comparecimento === 'Pendente' && !isPendente) return false;
      if (filters.comparecimento === 'Compareceu' && !didAttend) return false;
      if (filters.comparecimento === 'Não Compareceu' && !didNotAttend) return false;
    }
    // F5 - Origin channel
    if (filters.origem && filters.origem !== 'Todos') {
      if ((lead.tag_origem || '') !== filters.origem) return false;
    }
    // F6 - UTM Source
    if (filters.utmSource && filters.utmSource !== 'Todos') {
      if ((lead.utm_source || '') !== filters.utmSource) return false;
    }
    // F7 - Campaign
    if (filters.utmCampaign && filters.utmCampaign !== 'Todos') {
      if ((lead.utm_campaign || '') !== filters.utmCampaign) return false;
    }
    // F8 - Perfil do Lead
    if (filters.perfilLead && filters.perfilLead !== 'Todos') {
      const cls = getLeadClassification(lead);
      if (filters.perfilLead === 'NÃO CLASSIFICADO') {
        if (cls !== 'Não Classificado') return false;
      } else {
        const perfilMap = {
          'LEAD PRIORITÁRIO': 'Prioritário',
          'LEAD POTENCIAL': 'Potencial',
          'LEAD FANTASMA': 'Fantasma',
        };
        const expected = perfilMap[filters.perfilLead] || (
          (filters.perfilLead.toUpperCase().includes('PERFIL FORA') || filters.perfilLead.toUpperCase().includes('BAIXO FIT'))
            ? 'Baixo Fit' : null
        );
        if (expected ? cls !== expected : (lead.Perfil_lead || '') !== filters.perfilLead) return false;
      }
    }

    return true;
  });
}

// Mesma regra da coluna "Compareceu (Ganho)" do Kanban
export function isGanho(lead) {
  const comp = String(lead.status_comparecimento ?? '').toUpperCase();
  return comp === 'CONFIRMADO_PACIENTE' || comp === 'FINALIZADO';
}

export function countByField(leads, field) {
  const map = {};
  leads.forEach(l => {
    const val = l[field] || 'Não Informado';
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function calcKPIs(leads) {
  const total = leads.length;
  const agendados = leads.filter(l => l.status_agendado === true).length;
  const taxaConversao = total > 0 ? ((agendados / total) * 100).toFixed(1) : '0.0';

  const temposMesmoDia = leads.filter(l => l.tempo_medio_agendamento_em_horas != null && l.tempo_medio_agendamento_em_horas <= 24).map(l => l.tempo_medio_agendamento_em_horas);
  const tempoMedioMesmoDia = temposMesmoDia.length > 0 ? temposMesmoDia.reduce((a, b) => a + b, 0) / temposMesmoDia.length : 0;
  const tempoMesmoDiaH = Math.floor(tempoMedioMesmoDia);
  const tempoMesmoDiaM = Math.round((tempoMedioMesmoDia - tempoMesmoDiaH) * 60);

  const temposMaisUmDia = leads.filter(l => l.tempo_medio_agendamento_em_horas != null && l.tempo_medio_agendamento_em_horas > 24).map(l => l.tempo_medio_agendamento_em_horas);
  const tempoMedioMaisUmDia = temposMaisUmDia.length > 0 ? temposMaisUmDia.reduce((a, b) => a + b, 0) / temposMaisUmDia.length : 0;
  const tempoMaisUmDiaD = Math.floor(tempoMedioMaisUmDia / 24);
  const tempoMaisUmDiaH = Math.floor(tempoMedioMaisUmDia % 24);

  const valores = leads.filter(l => l.valor_fechado != null).map(l => l.valor_fechado);
  const ticketMedio = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
  const receitaTotal = valores.reduce((a, b) => a + b, 0);

  const ganhos = leads.filter(isGanho);
  const pacientesGanhos = ganhos.length;
  const pacientesGanhosNovos = ganhos.filter(l => l.fez_tratamento_antes === false).length;

  let leadsPrioritarios = 0;
  let leadsPotenciais = 0;
  let leadsPerfilFora = 0;
  let leadsFantasma = 0;
  let leadsNaoClassificados = 0;
  leads.forEach(l => {
    const cls = getLeadClassification(l);
    if (cls === 'Prioritário') leadsPrioritarios++;
    else if (cls === 'Potencial') leadsPotenciais++;
    else if (cls === 'Baixo Fit') leadsPerfilFora++;
    else if (cls === 'Fantasma') leadsFantasma++;
    else leadsNaoClassificados++;
  });

  return { total, agendados, taxaConversao, tempoMesmoDiaH, tempoMesmoDiaM, tempoMaisUmDiaD, tempoMaisUmDiaH, ticketMedio, receitaTotal, pacientesGanhos, pacientesGanhosNovos, leadsPrioritarios, leadsPotenciais, leadsPerfilFora, leadsFantasma, leadsNaoClassificados };
}

export function getEvolutionData(leads) {
  const byDay = {};
  leads.forEach(l => {
    const day = l.created_at ? l.created_at.slice(0, 10) : null;
    if (!day) return;
    if (!byDay[day]) byDay[day] = { date: day, leads: 0, agendados: 0 };
    byDay[day].leads++;
  });
  leads.forEach(l => {
    const day = l.quando_agendou;
    if (!day) return;
    if (!byDay[day]) byDay[day] = { date: day, leads: 0, agendados: 0 };
    byDay[day].agendados++;
  });
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

export function getAtribuicao(leads) {
  const agendados = leads.filter(l => l.status_agendado === true);
  const ia = agendados.filter(l => l.quem_fez_o_agendamento === 'IA').length;
  const humano = agendados.filter(l => l.quem_fez_o_agendamento && l.quem_fez_o_agendamento !== 'IA').length;
  const sem = agendados.length - ia - humano;
  return [
    { name: 'IA', value: ia },
    { name: 'Humano', value: humano },
    { name: 'Sem Info', value: sem },
  ].filter(d => d.value > 0);
}

export function getFunnelData(leads) {
  const stages = ['Contato Inicial', 'Coleta de Dados', 'Em Qualificação', 'Agendado'];
  return stages.map(s => ({
    name: s,
    value: leads.filter(l => l.stage_pipeline === s).length,
  }));
}

export function getMsgFaixas(leads) {
  const faixas = [
    { label: '1-3', min: 1, max: 3 },
    { label: '4-7', min: 4, max: 7 },
    { label: '8-12', min: 8, max: 12 },
    { label: '13+', min: 13, max: 9999 },
  ];
  return faixas.map(f => {
    const inRange = leads.filter(l => l.quantidade_mensagens_enviadas >= f.min && l.quantidade_mensagens_enviadas <= f.max);
    return {
      faixa: f.label,
      agendou: inRange.filter(l => l.status_agendado === true).length,
      naoAgendou: inRange.filter(l => l.status_agendado !== true).length,
    };
  });
}

export function getTempoFaixas(leads) {
  const faixas = [
    { label: '< 15min', min: 0, max: 0.25 },
    { label: '15-30min', min: 0.25, max: 0.5 },
    { label: '30min-1h', min: 0.5, max: 1 },
    { label: '1-2h', min: 1, max: 2 },
    { label: '2-4h', min: 2, max: 4 },
    { label: '> 4h', min: 4, max: 9999 },
  ];
  return faixas.map(f => ({
    faixa: f.label,
    count: leads.filter(l => l.tempo_medio_agendamento_em_horas != null && l.tempo_medio_agendamento_em_horas >= f.min && l.tempo_medio_agendamento_em_horas < f.max).length,
  }));
}

export function getScatterData(leads) {
  return leads
    .filter(l => l.tempo_medio_agendamento_em_horas != null && l.quantidade_mensagens_enviadas != null)
    .map(l => ({
      mensagens: l.quantidade_mensagens_enviadas,
      tempo: l.tempo_medio_agendamento_em_horas,
      profissional: l.profissional || 'N/A',
    }));
}

export function getIdadeFaixas(leads) {
  const faixas = [
    { label: '18-25', min: 18, max: 25 },
    { label: '26-35', min: 26, max: 35 },
    { label: '36-45', min: 36, max: 45 },
    { label: '46-55', min: 46, max: 55 },
    { label: '56-65', min: 56, max: 65 },
    { label: '65+', min: 65, max: 999 },
  ];
  return faixas.map(f => {
    const inRange = leads.filter(l => l.idade_momento_preenchido != null && l.idade_momento_preenchido >= f.min && l.idade_momento_preenchido <= f.max);
    return {
      faixa: f.label,
      agendou: inRange.filter(l => l.status_agendado === true).length,
      naoAgendou: inRange.filter(l => l.status_agendado !== true).length,
      total: inRange.length,
    };
  });
}

export function getWordCloudData(leads) {
  const freq = {};
  leads.forEach(l => {
    const words = tokenizeText(l.interesse_ou_queixas);
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  });
  return Object.entries(freq)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 40);
}

export function getOrigemPerformance(leads) {
  const map = {};
  leads.forEach(l => {
    const orig = l.tag_origem || 'Não Informado';
    if (!map[orig]) map[orig] = { name: orig, agendou: 0, naoAgendou: 0 };
    if (l.status_agendado === true) map[orig].agendou++;
    else map[orig].naoAgendou++;
  });
  return Object.values(map).sort((a, b) => (b.agendou + b.naoAgendou) - (a.agendou + a.naoAgendou));
}

export function getRecorrencia(leads) {
  const retorno = leads.filter(l => l.fez_tratamento_antes === true).length;
  const novo = leads.filter(l => l.fez_tratamento_antes === false).length;
  const ni = leads.filter(l => l.fez_tratamento_antes == null).length;
  return [
    { name: 'Retorno', value: retorno },
    { name: 'Novo', value: novo },
    { name: 'Não Informado', value: ni },
  ].filter(d => d.value > 0);
}

export function getUniqueProfissionais(leads) {
  const set = new Set();
  leads.forEach(l => {
    if (l.profissional) set.add(l.profissional);
  });
  return [...set].sort();
}

export function getUniqueOrigens(leads) {
  const set = new Set();
  leads.forEach(l => {
    if (l.tag_origem) set.add(l.tag_origem);
  });
  return [...set].sort();
}

export function getUniqueUtmSources(leads) {
  const set = new Set();
  leads.forEach(l => {
    if (l.utm_source) set.add(l.utm_source);
  });
  return [...set].sort();
}

export function getLostReasons(leads) {
  const map = {};
  leads.forEach(l => {
    if (l.lost_reason_category) {
      // Clean up common variations or just use raw strings up to a limit
      let reason = l.lost_reason_category.trim();
      // Cap at 40 chars for the chart labels
      if (reason.length > 40) reason = reason.substring(0, 37) + '...';
      map[reason] = (map[reason] || 0) + 1;
    }
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function getBairrosData(leads) {
  const map = {};
  leads.forEach(l => {
    if (l.bairro) {
      let b = l.bairro.trim();
      if (b.length > 2) {
        map[b] = (map[b] || 0) + 1;
      }
    }
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function getLeadClassification(l) {
  const perfil = (l.Perfil_lead || '').toUpperCase();
  if (perfil === 'LEAD PRIORITÁRIO') return 'Prioritário';
  if (perfil === 'LEAD POTENCIAL') return 'Potencial';
  if (perfil.includes('PERFIL FORA') || perfil.includes('BAIXO FIT')) return 'Baixo Fit';
  if (perfil === 'LEAD FANTASMA') return 'Fantasma';
  return 'Não Classificado';
}

export function getLeadClassificationData(leads) {
  let prioritario = 0;
  let potencial = 0;
  let baixoFit = 0;
  let fantasma = 0;
  let naoClassificado = 0;

  leads.forEach(l => {
    const cls = getLeadClassification(l);
    if (cls === 'Prioritário') prioritario++;
    else if (cls === 'Potencial') potencial++;
    else if (cls === 'Baixo Fit') baixoFit++;
    else if (cls === 'Fantasma') fantasma++;
    else naoClassificado++;
  });

  return [
    { name: 'LEAD PRIORITÁRIO', value: prioritario },
    { name: 'LEAD POTENCIAL', value: potencial },
    { name: 'LEAD PERFIL FORA', value: baixoFit },
    { name: 'LEAD FANTASMA', value: fantasma },
    { name: 'NÃO CLASSIFICADO', value: naoClassificado },
  ].filter(d => d.value > 0);
}

// Normaliza o nome do canal para aglutinar variações de grafia:
// caixa, acentos, espaços extras ("Anuncio Instagram" === "Anúncio  instagram")
function normalizeCanalKey(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const CANAL_DESCONHECIDO_KEYS = new Set([
  '', 'nao encontrado', 'nao informado', 'nao identificado', 'desconhecido', 'null', 'undefined', 'sem origem',
]);

// Lead é comprovadamente pago se qualquer campo UTM veio preenchido.
// Sem UTM NÃO dá para afirmar que é orgânico (trackeamento incompleto),
// então não rotulamos o restante.
export function isLeadPago(lead) {
  return !!(lead.utm_source || lead.utm_campaign || lead.utm_medium || lead.utm_content);
}

// ROI consolidado por canal de origem. Como utm_campaign raramente vem
// preenchido, agrupa pelo melhor identificador disponível
// (tag_origem > utm_source), aglutinando grafias equivalentes.
export function getRoiPorCanal(leads) {
  const map = {};
  leads.forEach(l => {
    const raw = (l.tag_origem && String(l.tag_origem).trim()) || (l.utm_source && String(l.utm_source).trim()) || '';
    let key = normalizeCanalKey(raw);
    if (CANAL_DESCONHECIDO_KEYS.has(key)) key = '__nao_informado__';
    if (!map[key]) map[key] = { canal: key === '__nao_informado__' ? 'Não Informado' : raw, leads: 0, pagos: 0, agendados: 0, ganhos: 0, receita: 0, comValor: 0 };
    // Prefere exibir a variante com acento, se aparecer depois
    if (key !== '__nao_informado__' && raw.normalize('NFD').length > raw.length && map[key].canal.normalize('NFD').length === map[key].canal.length) {
      map[key].canal = raw;
    }
    map[key].leads++;
    if (isLeadPago(l)) map[key].pagos++;
    if (l.status_agendado === true) map[key].agendados++;
    if (isGanho(l)) map[key].ganhos++;
    if (l.valor_fechado != null) {
      map[key].receita += l.valor_fechado;
      map[key].comValor++;
    }
  });
  return Object.values(map)
    .map(r => ({
      ...r,
      taxaAgendamento: r.leads > 0 ? (r.agendados / r.leads) * 100 : 0,
      taxaComparecimento: r.agendados > 0 ? (r.ganhos / r.agendados) * 100 : 0,
      receitaPorLead: r.leads > 0 ? r.receita / r.leads : 0,
      ticketMedio: r.comValor > 0 ? r.receita / r.comValor : 0,
    }))
    .sort((a, b) => b.receita - a.receita || b.ganhos - a.ganhos || b.leads - a.leads);
}

export function getGoldenHour(leads) {
  const hourMap = {};
  leads.forEach(l => {
    if (l.status_agendado && l.hora_agendamento_realizado) {
      const horaStr = l.hora_agendamento_realizado.split(':')[0];
      if (!isNaN(horaStr)) {
        const horaInt = parseInt(horaStr, 10);
        hourMap[horaInt] = (hourMap[horaInt] || 0) + 1;
      }
    }
  });

  const data = [];
  for (let i = 0; i <= 23; i++) {
    data.push({
      hora: `${i.toString().padStart(2, '0')}h`,
      agendamentos: hourMap[i] || 0
    });
  }
  return data;
}

export function getGoldenDay(leads) {
  const dayMap = [0, 0, 0, 0, 0, 0, 0]; // 0=Dom ... 6=Sab
  leads.forEach(l => {
    if (l.status_agendado && l.quando_agendou) {
      const date = new Date(`${l.quando_agendou}T12:00:00Z`);
      const dayOfWeek = date.getUTCDay();
      if (!isNaN(dayOfWeek)) {
        dayMap[dayOfWeek]++;
      }
    }
  });

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return dayMap.map((val, idx) => ({
    dia: dayNames[idx],
    agendamentos: val
  }));
}

export function getCommercialHours(leads) {
  const holidays2026RJ = [
    '2026-01-01', '2026-01-20', '2026-02-16', '2026-02-17', '2026-02-18',
    '2026-04-03', '2026-04-21', '2026-04-23', '2026-05-01', '2026-06-04',
    '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25'
  ];

  let comercial = 0;
  let naoComercial = 0;

  leads.forEach(l => {
    if (l.status_agendado === true && l.quem_fez_o_agendamento === 'IA' && l.hora_agendamento_realizado) {
      const dateStr = l.quando_agendou;
      if (!dateStr) return;

      const date = new Date(`${dateStr}T12:00:00Z`);
      const dayOfWeek = date.getUTCDay();

      if (holidays2026RJ.includes(dateStr)) {
        naoComercial++;
        return;
      }

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        naoComercial++;
        return;
      }

      const horaStr = l.hora_agendamento_realizado.split(':')[0];
      const hora = parseInt(horaStr, 10);
      if (!isNaN(hora)) {
        if (hora >= 9 && hora < 18) {
          comercial++;
        } else {
          naoComercial++;
        }
      }
    }
  });

  return [
    { name: 'Horário Comercial (seg-sex, 09h-18h)', value: comercial },
    { name: 'Fora do Horário Comercial*', value: naoComercial }
  ].filter(d => d.value > 0);
}

// ============================================================================
// RELATÓRIOS META — cruzamento de custo (Meta) com leads/receita (banco de leads)
// ============================================================================

// Extrai o shortcode de uma URL de post do Instagram.
// Ex.: https://www.instagram.com/p/DKkdW7NP-oj/ -> "DKkdW7NP-oj"
export function parseIgShortcode(url) {
  if (!url) return null;
  const m = String(url).match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

// Filtra linhas diárias da Meta pelo range de datas do filtro global (created_at).
// As datas são strings YYYY-MM-DD, então comparação lexicográfica funciona.
export function filterMetaByDate(insights, filters) {
  if (!filters || (!filters.dateFrom && !filters.dateTo)) return insights || [];
  return (insights || []).filter(r => {
    if (!r.date) return false;
    const d = String(r.date).slice(0, 10);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo && d > filters.dateTo) return false;
    return true;
  });
}

// Totais agregados da Meta. CTR/CPC/CPM são recalculados a partir dos totais
// (média ponderada), não a média das médias.
export function aggregateMetaTotals(insights) {
  const t = { spend: 0, impressions: 0, clicks: 0, reach: 0, link_clicks: 0, messaging_started: 0, video_views: 0, post_engagement: 0 };
  (insights || []).forEach(r => {
    t.spend += Number(r.spend) || 0;
    t.impressions += Number(r.impressions) || 0;
    t.clicks += Number(r.clicks) || 0;
    t.reach += Number(r.reach) || 0; // soma diária (não é alcance único)
    t.link_clicks += Number(r.link_clicks) || 0;
    t.messaging_started += Number(r.messaging_started) || 0;
    t.video_views += Number(r.video_views) || 0;
    t.post_engagement += Number(r.post_engagement) || 0;
  });
  t.ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
  t.cpc = t.clicks > 0 ? t.spend / t.clicks : 0;
  t.cpm = t.impressions > 0 ? (t.spend / t.impressions) * 1000 : 0;
  return t;
}

// Agrega métricas Meta por campanha.
export function getMetaByCampaign(insights) {
  const map = {};
  (insights || []).forEach(r => {
    const key = r.campaign_id || r.campaign_name || '—';
    if (!map[key]) map[key] = { campaign_id: r.campaign_id, campaign_name: r.campaign_name || '—', spend: 0, impressions: 0, clicks: 0, link_clicks: 0, messaging_started: 0 };
    map[key].spend += Number(r.spend) || 0;
    map[key].impressions += Number(r.impressions) || 0;
    map[key].clicks += Number(r.clicks) || 0;
    map[key].link_clicks += Number(r.link_clicks) || 0;
    map[key].messaging_started += Number(r.messaging_started) || 0;
  });
  return Object.values(map)
    .map(c => ({
      ...c,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

// Série diária combinando investimento (Meta) com leads pagos / receita (banco).
export function getMetaSpendVsLeadsSeries(leads, insights) {
  const byDay = {};
  const ensure = d => (byDay[d] = byDay[d] || { date: d, spend: 0, leads: 0, agendados: 0, receita: 0 });
  (insights || []).forEach(r => {
    const d = r.date ? String(r.date).slice(0, 10) : null;
    if (!d) return;
    ensure(d).spend += Number(r.spend) || 0;
  });
  (leads || []).forEach(l => {
    if (!isLeadPago(l)) return;
    const d = l.created_at ? l.created_at.slice(0, 10) : null;
    if (!d) return;
    const e = ensure(d);
    e.leads++;
    if (l.status_agendado === true) e.agendados++;
    if (l.valor_fechado != null) e.receita += Number(l.valor_fechado) || 0;
  });
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

// KPIs cruzados: investimento vs leads pagos / agendamentos / receita.
export function getMetaCrossKPIs(leads, insights) {
  const t = aggregateMetaTotals(insights);
  const pagos = (leads || []).filter(isLeadPago);
  const leadsPagos = pagos.length;
  const agendamentos = pagos.filter(l => l.status_agendado === true).length;
  const convertidos = pagos.filter(isGanho).length;
  const receita = pagos.filter(l => l.valor_fechado != null).reduce((a, l) => a + (Number(l.valor_fechado) || 0), 0);
  return {
    ...t,
    leadsPagos,
    agendamentos,
    convertidos,
    receita,
    cpl: leadsPagos > 0 ? t.spend / leadsPagos : 0,
    cpa: agendamentos > 0 ? t.spend / agendamentos : 0,
    cac: convertidos > 0 ? t.spend / convertidos : 0,
    roas: t.spend > 0 ? receita / t.spend : 0,
  };
}

// Visão MENSAL no estilo da planilha "DASHBOARD": uma linha por mês cruzando
// novos leads (banco, por created_at) com investimento (Meta, por dia→mês),
// derivando custo por lead, custo por agendamento, ROAS, CAC e conversão real.
// Usa o histórico completo (não o filtro de data), limitado aos últimos N meses.
export function getMonthlyPerformance(leads, insights, monthsLimit = 12) {
  const m = {};
  const ensure = k => (m[k] = m[k] || { mes: k, novosLeads: 0, agendamentos: 0, agendamentosNaData: 0, compareceram: 0, faltaram: 0, convertidos: 0, receita: 0, investimento: 0 });
  // Por DATA DE CRIAÇÃO do lead (created_at) — base padrão dos dados cruzados
  (leads || []).forEach(l => {
    const k = l.created_at ? l.created_at.slice(0, 7) : null;
    if (!k) return;
    const e = ensure(k);
    e.novosLeads++;
    if (l.status_agendado === true) e.agendamentos++;
    if (isGanho(l)) { e.compareceram++; e.convertidos++; }
    const comp = String(l.status_comparecimento ?? '').toUpperCase();
    if (comp === 'CANCELADO_PACIENTE' || comp === 'FALTOU' || comp === 'CANCELADO' || comp === 'CANELADO') e.faltaram++;
    if (l.valor_fechado != null) e.receita += Number(l.valor_fechado) || 0;
  });
  // Agendamentos pela DATA DO AGENDAMENTO (quando_agendou) — coluna adicional
  (leads || []).forEach(l => {
    if (l.status_agendado === true && l.quando_agendou) {
      const k = String(l.quando_agendou).slice(0, 7);
      ensure(k).agendamentosNaData++;
    }
  });
  (insights || []).forEach(r => {
    const k = r.date ? String(r.date).slice(0, 7) : null;
    if (!k) return;
    ensure(k).investimento += Number(r.spend) || 0;
  });
  return Object.values(m)
    .map(e => ({
      ...e,
      conversao: e.novosLeads > 0 ? (e.agendamentos / e.novosLeads) * 100 : 0,
      custoPorLead: e.novosLeads > 0 && e.investimento > 0 ? e.investimento / e.novosLeads : 0,
      custoPorAgendamento: e.agendamentos > 0 && e.investimento > 0 ? e.investimento / e.agendamentos : 0,
      roas: e.investimento > 0 ? e.receita / e.investimento : 0,
      cac: e.convertidos > 0 && e.investimento > 0 ? e.investimento / e.convertidos : 0,
      conversaoReal: e.novosLeads > 0 ? (e.convertidos / e.novosLeads) * 100 : 0,
    }))
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .slice(0, monthsLimit);
}

// Funil de custo: do investimento até a venda, com o custo por etapa.
export function getMetaCostFunnel(leads, insights) {
  const t = aggregateMetaTotals(insights);
  const pagos = (leads || []).filter(isLeadPago);
  const leadsN = pagos.length;
  const agend = pagos.filter(l => l.status_agendado === true).length;
  const vendas = pagos.filter(l => l.valor_fechado != null).length;
  const s = t.spend;
  return [
    { etapa: 'Impressões', valor: t.impressions, custo: t.impressions > 0 ? (s / t.impressions) * 1000 : 0, custoLabel: 'CPM' },
    { etapa: 'Cliques', valor: t.clicks, custo: t.clicks > 0 ? s / t.clicks : 0, custoLabel: 'CPC' },
    { etapa: 'Conversas WhatsApp', valor: t.messaging_started, custo: t.messaging_started > 0 ? s / t.messaging_started : 0, custoLabel: 'Custo/conversa' },
    { etapa: 'Leads pagos', valor: leadsN, custo: leadsN > 0 ? s / leadsN : 0, custoLabel: 'CPL' },
    { etapa: 'Agendamentos', valor: agend, custo: agend > 0 ? s / agend : 0, custoLabel: 'CPA' },
    { etapa: 'Vendas', valor: vendas, custo: vendas > 0 ? s / vendas : 0, custoLabel: 'Custo/venda' },
  ];
}

// Performance por CRIATIVO (post do Instagram): cruza o spend do anúncio (via
// meta_ad_creative_map → ig_shortcode) com os leads cujo utm_content tem o mesmo
// shortcode. Retorna as linhas + a taxa de match dos leads pagos.
export function getMetaCreativePerformance(leads, insights, adMap) {
  // 1) spend/impressões/cliques por ad_id
  const adAgg = {};
  (insights || []).forEach(r => {
    const id = r.ad_id;
    if (!id) return;
    if (!adAgg[id]) adAgg[id] = { spend: 0, impressions: 0, clicks: 0 };
    adAgg[id].spend += Number(r.spend) || 0;
    adAgg[id].impressions += Number(r.impressions) || 0;
    adAgg[id].clicks += Number(r.clicks) || 0;
  });
  // 2) consolida por shortcode (um post pode ter mais de um anúncio)
  const byCode = {};
  (adMap || []).forEach(m => {
    const code = m.ig_shortcode;
    if (!code) return;
    if (!byCode[code]) byCode[code] = {
      shortcode: code, ad_name: m.ad_name, campaign_id: m.campaign_id,
      thumbnail: m.thumbnail_url, permalink: m.instagram_permalink,
      spend: 0, impressions: 0, clicks: 0, leads: 0, agendados: 0, ganhos: 0, receita: 0, comValor: 0,
      agendadosLeads: [], ganhosLeads: [],
    };
    const a = adAgg[m.ad_id];
    if (a) { byCode[code].spend += a.spend; byCode[code].impressions += a.impressions; byCode[code].clicks += a.clicks; }
  });
  // 3) atribui leads pagos por shortcode do utm_content
  let matched = 0, totalPaid = 0;
  (leads || []).forEach(l => {
    if (!isLeadPago(l)) return;
    totalPaid++;
    const code = parseIgShortcode(l.utm_content_atualizado || l.utm_content);
    if (!code || !byCode[code]) return;
    matched++;
    const e = byCode[code];
    const leadInfo = { nome: l.Nome_completo || l.telefone || '—', chat: l.chatguru_chat || null };
    e.leads++;
    if (l.status_agendado === true) { e.agendados++; e.agendadosLeads.push(leadInfo); }
    if (isGanho(l)) { e.ganhos++; e.ganhosLeads.push(leadInfo); }
    if (l.valor_fechado != null) { e.receita += Number(l.valor_fechado) || 0; e.comValor++; }
  });
  const rows = Object.values(byCode)
    .filter(e => e.spend > 0 || e.leads > 0)
    .map(e => ({
      ...e,
      ctr: e.impressions > 0 ? (e.clicks / e.impressions) * 100 : 0,
      cpl: e.leads > 0 ? e.spend / e.leads : 0,
      cpa: e.agendados > 0 ? e.spend / e.agendados : 0,
      roas: e.spend > 0 ? e.receita / e.spend : 0,
      ticketMedio: e.comValor > 0 ? e.receita / e.comValor : 0,
    }))
    .sort((a, b) => b.spend - a.spend || b.leads - a.leads);
  return { rows, matched, totalPaid, matchRate: totalPaid > 0 ? (matched / totalPaid) * 100 : 0 };
}

// ============================================================================
// RELATÓRIOS GOOGLE — cruzamento de custo (Google Ads) com leads/receita
// (banco). Espelha o bloco Meta acima, adaptado ao Google:
//  - lead Google = utm_source 'google' OU gclid presente (clique pago).
//  - lead.utm_campaign = ID numérico da campanha Google → casa com campaign_id.
//  - lead.utm_term = texto da palavra-chave (ValueTrack {keyword}) → casa com
//    google_keywords_daily.keyword_norm depois de normalizado.
// ============================================================================

// Lead veio do Google Ads (pago). NÃO usar tag_origem — inclui orgânico/GBP.
export function isLeadGoogle(lead) {
  return String(lead.utm_source || '').toLowerCase().trim() === 'google' || !!lead.gclid;
}

// Normaliza keyword para o cruzamento utm_term ↔ keyword_text.
// MESMA lógica de normKw no scripts/seed_google.mjs (manter em sincronia).
export function normalizeKeyword(s) {
  if (!s) return '';
  let v = String(s);
  if (v.includes('%')) { try { v = decodeURIComponent(v); } catch { /* mantém cru */ } }
  return v
    .replace(/\+/g, ' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[[\]"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Totais agregados do Google. CTR/CPC recalculados a partir dos totais
// (média ponderada, não média das médias).
export function aggregateGoogleTotals(insights) {
  const t = { cost: 0, impressions: 0, clicks: 0, conversions: 0 };
  (insights || []).forEach(r => {
    t.cost += Number(r.cost) || 0;
    t.impressions += Number(r.impressions) || 0;
    t.clicks += Number(r.clicks) || 0;
    t.conversions += Number(r.conversions) || 0;
  });
  t.ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
  t.cpc = t.clicks > 0 ? t.cost / t.clicks : 0;
  return t;
}

// KPIs cruzados: investimento (Google) vs leads Google / agendamentos / receita
// (Banco). Tudo pela DATA DE CRIAÇÃO do lead (o recorte por range é do caller).
export function getGoogleCrossKPIs(leads, insights) {
  const t = aggregateGoogleTotals(insights);
  const google = (leads || []).filter(isLeadGoogle);
  const leadsGoogle = google.length;
  const agendamentos = google.filter(l => l.status_agendado === true).length;
  const convertidos = google.filter(isGanho).length;
  const receita = google.filter(l => l.valor_fechado != null).reduce((a, l) => a + (Number(l.valor_fechado) || 0), 0);
  return {
    ...t,
    leadsGoogle,
    agendamentos,
    convertidos,
    receita,
    cpl: leadsGoogle > 0 ? t.cost / leadsGoogle : 0,
    cpa: agendamentos > 0 ? t.cost / agendamentos : 0,
    cac: convertidos > 0 ? t.cost / convertidos : 0,
    roas: t.cost > 0 ? receita / t.cost : 0,
  };
}

// Série diária combinando investimento (Google) com leads Google / receita (Banco).
export function getGoogleSpendVsLeadsSeries(leads, insights) {
  const byDay = {};
  const ensure = d => (byDay[d] = byDay[d] || { date: d, cost: 0, leads: 0, agendados: 0, receita: 0 });
  (insights || []).forEach(r => {
    const d = r.date ? String(r.date).slice(0, 10) : null;
    if (!d) return;
    ensure(d).cost += Number(r.cost) || 0;
  });
  (leads || []).forEach(l => {
    if (!isLeadGoogle(l)) return;
    const d = l.created_at ? l.created_at.slice(0, 10) : null;
    if (!d) return;
    const e = ensure(d);
    e.leads++;
    if (l.status_agendado === true) e.agendados++;
    if (l.valor_fechado != null) e.receita += Number(l.valor_fechado) || 0;
  });
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

// Por campanha: agrega insights por campaign_id e cruza os leads Google via
// lead.utm_campaign (ID numérico) === campaign_id.
export function getGoogleByCampaign(leads, insights) {
  const map = {};
  (insights || []).forEach(r => {
    const key = String(r.campaign_id || '—');
    if (!map[key]) map[key] = {
      campaign_id: key, campaign_name: r.campaign_name || key, channel_type: r.channel_type || null,
      cost: 0, impressions: 0, clicks: 0, conversions: 0,
      leads: 0, agendados: 0, ganhos: 0, receita: 0, agendadosLeads: [], ganhosLeads: [],
    };
    map[key].cost += Number(r.cost) || 0;
    map[key].impressions += Number(r.impressions) || 0;
    map[key].clicks += Number(r.clicks) || 0;
    map[key].conversions += Number(r.conversions) || 0;
    if (r.campaign_name) map[key].campaign_name = r.campaign_name;
    if (r.channel_type) map[key].channel_type = r.channel_type;
  });
  let matched = 0, totalGoogle = 0;
  (leads || []).forEach(l => {
    if (!isLeadGoogle(l)) return;
    totalGoogle++;
    const key = String(l.utm_campaign || '').trim();
    if (!key || !map[key]) return;
    matched++;
    const e = map[key];
    const leadInfo = { nome: l.Nome_completo || l.telefone || '—', chat: l.chatguru_chat || null };
    e.leads++;
    if (l.status_agendado === true) { e.agendados++; e.agendadosLeads.push(leadInfo); }
    if (isGanho(l)) { e.ganhos++; e.ganhosLeads.push(leadInfo); }
    if (l.valor_fechado != null) e.receita += Number(l.valor_fechado) || 0;
  });
  const rows = Object.values(map)
    .filter(c => c.cost > 0 || c.leads > 0)
    .map(c => ({
      ...c,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cpc: c.clicks > 0 ? c.cost / c.clicks : 0,
      cpl: c.leads > 0 ? c.cost / c.leads : 0,
      cpa: c.agendados > 0 ? c.cost / c.agendados : 0,
    }))
    .sort((a, b) => b.cost - a.cost);
  return { rows, matched, totalGoogle, matchRate: totalGoogle > 0 ? (matched / totalGoogle) * 100 : 0 };
}

// Performance por PALAVRA-CHAVE — o coração da aba Google. Agrega
// google_keywords_daily por keyword_norm (a mesma keyword pode existir em
// campanhas/grupos diferentes; o utm_term do lead só traz o TEXTO, então o
// cruzamento é no nível do texto normalizado). campaign_name/match_type
// exibidos são os da variante de maior custo.
export function getGoogleKeywordPerformance(leads, keywordRows) {
  const byNorm = {};
  (keywordRows || []).forEach(r => {
    const norm = r.keyword_norm || normalizeKeyword(r.keyword_text);
    if (!norm) return;
    if (!byNorm[norm]) byNorm[norm] = {
      keyword: r.keyword_text || norm, norm,
      campaign_name: r.campaign_name || '—', match_type: r.match_type || null, _topCost: -1,
      cost: 0, impressions: 0, clicks: 0, conversions: 0,
      leads: 0, agendados: 0, ganhos: 0, receita: 0, agendadosLeads: [], ganhosLeads: [],
    };
    const e = byNorm[norm];
    const cost = Number(r.cost) || 0;
    e.cost += cost;
    e.impressions += Number(r.impressions) || 0;
    e.clicks += Number(r.clicks) || 0;
    e.conversions += Number(r.conversions) || 0;
    // rótulos da variante mais cara
    if (cost > e._topCost) {
      e._topCost = cost;
      if (r.campaign_name) e.campaign_name = r.campaign_name;
      if (r.match_type) e.match_type = r.match_type;
      if (r.keyword_text) e.keyword = r.keyword_text;
    }
  });
  let matched = 0, totalGoogle = 0, semTerm = 0;
  (leads || []).forEach(l => {
    if (!isLeadGoogle(l)) return;
    totalGoogle++;
    const norm = normalizeKeyword(l.utm_term);
    if (!norm) { semTerm++; return; }
    if (!byNorm[norm]) return;
    matched++;
    const e = byNorm[norm];
    const leadInfo = { nome: l.Nome_completo || l.telefone || '—', chat: l.chatguru_chat || null };
    e.leads++;
    if (l.status_agendado === true) { e.agendados++; e.agendadosLeads.push(leadInfo); }
    if (isGanho(l)) { e.ganhos++; e.ganhosLeads.push(leadInfo); }
    if (l.valor_fechado != null) e.receita += Number(l.valor_fechado) || 0;
  });
  const rows = Object.values(byNorm)
    .filter(e => e.cost > 0 || e.leads > 0)
    .map(({ _topCost, ...e }) => ({
      ...e,
      ctr: e.impressions > 0 ? (e.clicks / e.impressions) * 100 : 0,
      cpc: e.clicks > 0 ? e.cost / e.clicks : 0,
      cpl: e.leads > 0 ? e.cost / e.leads : 0,
      cpa: e.agendados > 0 ? e.cost / e.agendados : 0,
    }))
    .sort((a, b) => b.cost - a.cost || b.leads - a.leads);
  return { rows, matched, totalGoogle, semTerm, matchRate: totalGoogle > 0 ? (matched / totalGoogle) * 100 : 0 };
}

// Termos de pesquisa REAIS (search_term_view): o que a pessoa digitou, agregado
// por termo. isKeyword = o termo já existe como palavra-chave da conta (senão é
// oportunidade de keyword nova — ou de negativação, se gasta sem converter).
export function getGoogleSearchTermPerformance(searchTermRows, keywordRows) {
  const kwSet = new Set((keywordRows || []).map(r => r.keyword_norm || normalizeKeyword(r.keyword_text)).filter(Boolean));
  const byTerm = {};
  (searchTermRows || []).forEach(r => {
    const norm = normalizeKeyword(r.search_term);
    if (!norm) return;
    if (!byTerm[norm]) byTerm[norm] = {
      term: r.search_term, norm,
      keyword: r.keyword_text || '—', campaign_name: r.campaign_name || '—', _topCost: -1,
      cost: 0, impressions: 0, clicks: 0, conversions: 0,
    };
    const e = byTerm[norm];
    const cost = Number(r.cost) || 0;
    e.cost += cost;
    e.impressions += Number(r.impressions) || 0;
    e.clicks += Number(r.clicks) || 0;
    e.conversions += Number(r.conversions) || 0;
    if (cost > e._topCost) {
      e._topCost = cost;
      if (r.search_term) e.term = r.search_term;
      if (r.keyword_text) e.keyword = r.keyword_text;
      if (r.campaign_name) e.campaign_name = r.campaign_name;
    }
  });
  return Object.values(byTerm)
    .filter(e => e.cost > 0 || e.clicks > 0)
    .map(({ _topCost, ...e }) => ({
      ...e,
      cpc: e.clicks > 0 ? e.cost / e.clicks : 0,
      isKeyword: kwSet.has(e.norm),
    }))
    .sort((a, b) => b.cost - a.cost || b.clicks - a.clicks);
}

// ============================================================================
// PACIENTES — Programa de Níveis (LTV) a partir das vendas do ERP
// Entrada: vendas [{ cod_contato, nome_contato, dt_venda, valor_total }] e
//          contatos [{ codigo, nome, fones, bairro }] (ERP).
// Tudo computado no frontend; o n8n só sincroniza as linhas cruas.
// ============================================================================

const DIA_MS = 86400000;
const MES_DIAS = 30.44;            // mês médio (definição do doc)
const JANELA_12M_MS = 365 * DIA_MS;

// Níveis por VP (valor de pico de 12 meses). Ordenados do topo para a base.
// Rampa fria (violeta -> índigo -> azul -> ciano -> aço), coesa com o app
export const NIVEIS = [
  { nome: 'Unique', min: 100000, cor: '#a78bfa' },
  { nome: 'Private', min: 60000, cor: '#818cf8' },
  { nome: 'Prime', min: 30000, cor: '#38bdf8' },
  { nome: 'Select', min: 15000, cor: '#22d3ee' },
  { nome: 'Start', min: 0, cor: '#cbd5e1' },        // titânio
];

export const STATUS_PACIENTE = [
  { nome: 'Ativo', cor: '#34d399' },                // verde (frio, saudável)
  { nome: 'Adormecido', cor: '#60a5fa' },           // azul frio (esfriando)
  { nome: 'Perdido', cor: '#94a3b8' },              // aço (apagado/frio)
];

// 'YYYY-MM-DD' -> epoch ms em meia-noite UTC (evita drift de timezone).
function tsData(s) {
  if (!s) return NaN;
  return new Date(String(s).slice(0, 10) + 'T00:00:00Z').getTime();
}
function isoDoTs(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}
function mesDoTs(ts) {
  return new Date(ts).toISOString().slice(0, 7); // 'YYYY-MM'
}

// VP — maior soma móvel de 12 meses sobre todo o histórico.
// vendasOrdenadas: [{ ts, valor }] ordenado asc por ts (valor > 0).
// Janela (ts_i − 365d, ts_i]. Two-pointer O(n).
export function valorDePico12m(vendasOrdenadas) {
  let vp = 0, soma = 0, ini = 0;
  for (let fim = 0; fim < vendasOrdenadas.length; fim++) {
    soma += vendasOrdenadas[fim].valor;
    const limite = vendasOrdenadas[fim].ts - JANELA_12M_MS;
    while (ini <= fim && vendasOrdenadas[ini].ts <= limite) {
      soma -= vendasOrdenadas[ini].valor;
      ini++;
    }
    if (soma > vp) vp = soma;
  }
  return vp;
}

export function recenciaMeses(ultimaTs, hojeTs) {
  return (hojeTs - ultimaTs) / (MES_DIAS * DIA_MS);
}

export function nivelDeVP(vp) {
  for (const n of NIVEIS) if (vp >= n.min) return n;
  return NIVEIS[NIVEIS.length - 1];
}

export function statusDeRecencia(recMeses) {
  if (recMeses <= 15) return 'Ativo';
  if (recMeses <= 24) return 'Adormecido';
  return 'Perdido';
}

// Próxima ação sugerida (heurística fixa v1; a IA "Cora" assume depois).
export function proximaAcaoDe(nivel, status) {
  const altoValor = nivel === 'Unique' || nivel === 'Private' || nivel === 'Prime';
  if (altoValor && (status === 'Adormecido' || status === 'Perdido')) return 'Resgatar (alto valor)';
  if (nivel === 'Select' && status === 'Ativo') return 'Subir de faixa';
  if (nivel === 'Start' && status === 'Ativo') return 'Converter (2ª compra)';
  if (status === 'Adormecido') return 'Reativar';
  if (status === 'Perdido') return 'Recuperar';
  return 'Manter';
}

// Classificador principal — uma linha por paciente.
export function classificarPacientes(vendas, contatos = [], hoje = new Date()) {
  const contatoById = new Map();
  for (const c of contatos || []) contatoById.set(c.codigo, c);

  const hojeTs = (hoje instanceof Date ? hoje.getTime() : new Date(hoje).getTime());

  // agrupa vendas pagas (valor > 0) por paciente
  const porPaciente = new Map();
  for (const v of vendas || []) {
    const valor = Number(v.valor_total) || 0;
    if (valor <= 0) continue;
    const id = v.cod_contato;
    if (id == null) continue;
    const ts = tsData(v.dt_venda);
    if (isNaN(ts)) continue;
    if (!porPaciente.has(id)) porPaciente.set(id, []);
    porPaciente.get(id).push({ ts, valor, nome: v.nome_contato });
  }

  const out = [];
  for (const [id, vs] of porPaciente) {
    vs.sort((a, b) => a.ts - b.ts);
    const vp = valorDePico12m(vs);
    const gastoTotal = vs.reduce((s, x) => s + x.valor, 0);
    const limite12mTs = hojeTs - JANELA_12M_MS;
    const gasto12m = vs.reduce((s, x) => s + ((x.ts > limite12mTs && x.ts <= hojeTs) ? x.valor : 0), 0);
    const primeiraTs = vs[0].ts;
    const ultimaTs = vs[vs.length - 1].ts;
    const rec = recenciaMeses(ultimaTs, hojeTs);
    const nivelObj = nivelDeVP(vp);
    const status = statusDeRecencia(rec);
    const c = contatoById.get(id);
    const nome = (c && c.nome) || vs[vs.length - 1].nome || vs[0].nome || `Paciente ${id}`;
    const telefone = c && Array.isArray(c.fones) && c.fones.length ? c.fones[0] : '';
    let idade = null;
    if (c && c.dt_nasc) {
      const nasc = new Date(String(c.dt_nasc).slice(0, 10) + 'T00:00:00Z').getTime();
      if (!isNaN(nasc) && nasc < hojeTs) idade = Math.floor((hojeTs - nasc) / (365.25 * DIA_MS));
    }
    out.push({
      codContato: id,
      nome,
      telefone,
      bairro: c ? c.bairro : null,
      idade,
      nivel: nivelObj.nome,
      nivelCor: nivelObj.cor,
      status,
      nCompras: vs.length,
      gastoTotal,
      vp,
      gasto12m,
      recenciaMeses: rec,
      recenciaDias: Math.floor((hojeTs - ultimaTs) / DIA_MS),
      primeiraCompra: isoDoTs(primeiraTs),
      ultimaCompra: isoDoTs(ultimaTs),
      proximaAcao: proximaAcaoDe(nivelObj.nome, status),
    });
  }
  return out;
}

// KPIs dos cards (saúde da base, ação, carteira).
export function kpisPacientes(classificados, vendas, hoje = new Date()) {
  const hojeTs = (hoje instanceof Date ? hoje.getTime() : new Date(hoje).getTime());
  const mesAtual = mesDoTs(hojeTs);
  const total = classificados.length;
  const ativos = classificados.filter(p => p.status === 'Ativo').length;
  const novosNoMes = classificados.filter(p => p.primeiraCompra.slice(0, 7) === mesAtual).length;

  const limite12m = hojeTs - JANELA_12M_MS;
  let receita12m = 0;
  for (const v of vendas || []) {
    const valor = Number(v.valor_total) || 0;
    if (valor <= 0) continue;
    const ts = tsData(v.dt_venda);
    if (!isNaN(ts) && ts > limite12m && ts <= hojeTs) receita12m += valor;
  }

  const carteira = classificados.reduce((s, p) => s + p.gastoTotal, 0);
  const resgateAltoValor = classificados.filter(p =>
    (p.nivel === 'Unique' || p.nivel === 'Private' || p.nivel === 'Prime') &&
    (p.status === 'Adormecido' || p.status === 'Perdido')
  ).length;
  const aSubir = classificados.filter(p => p.nivel === 'Select' && p.status === 'Ativo').length;
  const aConverter = classificados.filter(p => p.nivel === 'Start' && p.status === 'Ativo').length;
  const emRisco = classificados.filter(p => p.status === 'Adormecido' || p.status === 'Perdido');
  const receitaEmRisco = emRisco.reduce((s, p) => s + p.gastoTotal, 0);
  const receitaEmRiscoAltoValor = emRisco
    .filter(p => p.nivel === 'Unique' || p.nivel === 'Private' || p.nivel === 'Prime')
    .reduce((s, p) => s + p.gastoTotal, 0);

  return { total, ativos, novosNoMes, receita12m, carteira, resgateAltoValor, aSubir, aConverter, receitaEmRisco, receitaEmRiscoAltoValor };
}

// Distribuição por nível (donut) — com % da base e % da receita (carteira).
export function distribuicaoPorNivel(classificados) {
  const carteira = classificados.reduce((s, p) => s + p.gastoTotal, 0) || 1;
  const total = classificados.length || 1;
  return NIVEIS.map(n => {
    const grupo = classificados.filter(p => p.nivel === n.nome);
    const receita = grupo.reduce((s, p) => s + p.gastoTotal, 0);
    return {
      nivel: n.nome,
      cor: n.cor,
      count: grupo.length,
      pctBase: (grupo.length / total) * 100,
      receita,
      pctReceita: (receita / carteira) * 100,
    };
  }).filter(d => d.count > 0);
}

// Status da base (donut).
export function statusDaBase(classificados) {
  return STATUS_PACIENTE.map(s => ({
    status: s.nome,
    cor: s.cor,
    count: classificados.filter(p => p.status === s.nome).length,
  })).filter(d => d.count > 0);
}

// Matriz Nível × Status (heatmap 5×3).
export function matrizNivelStatus(classificados) {
  return NIVEIS.map(n => {
    const linha = { nivel: n.nome, cor: n.cor, Ativo: 0, Adormecido: 0, Perdido: 0, total: 0 };
    for (const p of classificados) {
      if (p.nivel === n.nome) { linha[p.status]++; linha.total++; }
    }
    return linha;
  });
}

// Receita por mês (barras de sazonalidade). Últimos nMeses.
export function receitaPorMes(vendas, nMeses = 24) {
  const map = {};
  for (const v of vendas || []) {
    const valor = Number(v.valor_total) || 0;
    if (valor <= 0) continue;
    const ts = tsData(v.dt_venda);
    if (isNaN(ts)) continue;
    const mes = mesDoTs(ts);
    if (!map[mes]) map[mes] = { mes, receita: 0, nVendas: 0 };
    map[mes].receita += valor;
    map[mes].nVendas++;
  }
  return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-nMeses);
}

// Movimentação da base por mês: novos / adormeceram / perderam / reativaram + saldo.
// Baseado em eventos derivados do histórico de cada paciente (O(total vendas)).
export function movimentacaoDaBase(vendas, hoje = new Date(), nMeses = 24) {
  const hojeTs = (hoje instanceof Date ? hoje.getTime() : new Date(hoje).getTime());
  const ADORM_MS = 15 * MES_DIAS * DIA_MS;
  const PERD_MS = 24 * MES_DIAS * DIA_MS;

  const porPaciente = new Map();
  for (const v of vendas || []) {
    const valor = Number(v.valor_total) || 0;
    if (valor <= 0) continue;
    const id = v.cod_contato;
    if (id == null) continue;
    const ts = tsData(v.dt_venda);
    if (isNaN(ts)) continue;
    if (!porPaciente.has(id)) porPaciente.set(id, []);
    porPaciente.get(id).push(ts);
  }

  const ev = {};
  const add = (mes, campo) => {
    if (!ev[mes]) ev[mes] = { mes, novos: 0, adormeceram: 0, perderam: 0, reativaram: 0 };
    ev[mes][campo]++;
  };

  for (const tss of porPaciente.values()) {
    tss.sort((a, b) => a - b);
    add(mesDoTs(tss[0]), 'novos');
    for (let i = 1; i < tss.length; i++) {
      const gap = tss[i] - tss[i - 1];
      if (gap > ADORM_MS) {
        add(mesDoTs(tss[i - 1] + ADORM_MS), 'adormeceram');
        if (gap > PERD_MS) add(mesDoTs(tss[i - 1] + PERD_MS), 'perderam');
        add(mesDoTs(tss[i]), 'reativaram'); // voltou depois de silêncio >= 15m
      }
    }
    // cauda após a última compra (transições passivas até hoje)
    const last = tss[tss.length - 1];
    if (last + ADORM_MS <= hojeTs) add(mesDoTs(last + ADORM_MS), 'adormeceram');
    if (last + PERD_MS <= hojeTs) add(mesDoTs(last + PERD_MS), 'perderam');
  }

  return Object.values(ev)
    .map(m => ({ ...m, saldoLiquido: m.novos + m.reativaram - m.adormeceram - m.perderam }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-nMeses);
}

// ============================================================================
// §5.3 ANÁLISE DE VALOR — por que um paciente vale mais
// ============================================================================

// Gasto médio por faixa de recorrência (nº de compras). "Valor é frequência."
export function gastoPorRecorrencia(classificados) {
  const faixas = [
    { label: '1 compra', test: n => n === 1 },
    { label: '2–4', test: n => n >= 2 && n <= 4 },
    { label: '5–9', test: n => n >= 5 && n <= 9 },
    { label: '10+', test: n => n >= 10 },
  ];
  return faixas.map(f => {
    const grupo = classificados.filter(p => f.test(p.nCompras));
    return {
      faixa: f.label,
      gastoMedio: grupo.length ? grupo.reduce((s, p) => s + p.gastoTotal, 0) / grupo.length : 0,
      pacientes: grupo.length,
    };
  });
}

// Distribuição de receita (gasto histórico) por faixa etária.
export function receitaPorIdade(classificados) {
  const faixas = [
    { label: '<30', min: 0, max: 29 }, { label: '30–39', min: 30, max: 39 },
    { label: '40–49', min: 40, max: 49 }, { label: '50–59', min: 50, max: 59 },
    { label: '60–69', min: 60, max: 69 }, { label: '70+', min: 70, max: 200 },
  ];
  return faixas.map(f => {
    const grupo = classificados.filter(p => p.idade != null && p.idade >= f.min && p.idade <= f.max);
    return { faixa: f.label, receita: grupo.reduce((s, p) => s + p.gastoTotal, 0), pacientes: grupo.length };
  }).filter(d => d.pacientes > 0);
}

// Top-N bairros por receita histórica.
export function receitaPorBairro(classificados, topN = 10) {
  const map = {};
  classificados.forEach(p => {
    const b = (p.bairro && String(p.bairro).trim()) || null;
    if (!b || b.length < 2) return;
    if (!map[b]) map[b] = { bairro: b, receita: 0, pacientes: 0 };
    map[b].receita += p.gastoTotal; map[b].pacientes++;
  });
  return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, topN);
}

// Aparelhos/tecnologias premium (lista ajustável — derivada do catálogo do ERP).
export const APARELHOS_PREMIUM = [
  { nome: 'Ultraformer', kw: ['ultraformer', 'uf ponteira', 'uf '] },
  { nome: 'Fotona', kw: ['fotona'] },
  { nome: 'Exilis', kw: ['exilis', 'vtip'] },
  { nome: 'Emface', kw: ['emface'] },
  { nome: 'Volnewmer', kw: ['volnewmer'] },
  { nome: 'Virtue', kw: ['virtue'] },
  { nome: 'Mesoject', kw: ['mesoject'] },
];
export function premiumDeNome(descricao) {
  const d = String(descricao || '').toLowerCase();
  for (const a of APARELHOS_PREMIUM) if (a.kw.some(k => d.includes(k))) return a.nome;
  return null;
}

// Gasto médio por nº de aparelhos premium distintos usados.
// premiumCountById: Map codContato -> nº de aparelhos premium distintos.
export function adocaoPremium(classificados, premiumCountById) {
  const faixas = [
    { label: 'Nenhum', test: n => n === 0 }, { label: '1', test: n => n === 1 },
    { label: '2', test: n => n === 2 }, { label: '3+', test: n => n >= 3 },
  ];
  return faixas.map(f => {
    const grupo = classificados.filter(p => f.test(premiumCountById.get(p.codContato) || 0));
    return {
      faixa: f.label,
      gastoMedio: grupo.length ? grupo.reduce((s, p) => s + p.gastoTotal, 0) / grupo.length : 0,
      pacientes: grupo.length,
    };
  });
}

// ============================================================================
// §6.2 CURVA DE REATIVAÇÃO — receita recuperável
// 95% dos retornos em ≤14m; 15–24m ~4%; >24m ~1%.
// ============================================================================
export function taxaRetorno(recMeses) {
  if (recMeses <= 15) return 0.20;   // recém-adormecido — ainda alta
  if (recMeses <= 18) return 0.10;
  if (recMeses <= 24) return 0.04;
  if (recMeses <= 36) return 0.015;
  return 0.005;
}
// Estima receita anual recuperável aplicando a curva ao valor (VP) dos dormentes/perdidos.
export function receitaRecuperavel(classificados) {
  const alvos = classificados.filter(p => p.status === 'Adormecido' || p.status === 'Perdido');
  let recuperavel = 0, recuperavelAltoValor = 0;
  for (const p of alvos) {
    const valor = taxaRetorno(p.recenciaMeses) * p.vp;
    recuperavel += valor;
    if (p.nivel === 'Unique' || p.nivel === 'Private' || p.nivel === 'Prime') recuperavelAltoValor += valor;
  }
  return { recuperavel, recuperavelAltoValor, nAlvos: alvos.length };
}

// ============================================================================
// §6.3 ALERTAS INTELIGENTES — eventos detectados automaticamente
// ============================================================================
export function getAlertas(classificados) {
  const alertas = [];
  for (const p of classificados) {
    const altoValor = p.nivel === 'Unique' || p.nivel === 'Private' || p.nivel === 'Prime';
    // 1) alto valor recém-adormecido (15–17 meses)
    if (altoValor && p.recenciaMeses > 15 && p.recenciaMeses <= 17) {
      alertas.push({ tipo: 'Adormeceu', urgencia: 3, paciente: p.nome, codContato: p.codContato, nivel: p.nivel,
        detalhe: `${p.nivel} acabou de entrar em adormecido (${p.recenciaMeses.toFixed(0)} meses sem comprar)`, acao: 'Resgatar', telefone: p.telefone });
    }
    // 2) janela de renovação (11–15 meses, não-Start)
    if (p.recenciaMeses >= 11 && p.recenciaMeses <= 15 && p.nivel !== 'Start') {
      alertas.push({ tipo: 'Renovar', urgencia: altoValor ? 2 : 1, paciente: p.nome, codContato: p.codContato, nivel: p.nivel,
        detalhe: `${p.recenciaMeses.toFixed(0)} meses desde a última compra — hora de renovar`, acao: 'Renovar', telefone: p.telefone });
    }
  }
  return alertas.sort((a, b) => b.urgencia - a.urgencia || b.codContato - a.codContato);
}
