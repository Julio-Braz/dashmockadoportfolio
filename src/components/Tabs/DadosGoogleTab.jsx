import { useMemo, useState } from 'react'
import { Banknote, UserPlus, Coins, CalendarCheck, Target, TrendingUp, Trophy, Users, Info, CalendarRange, Search, MousePointerClick } from 'lucide-react'
import {
  getGoogleCrossKPIs, getGoogleByCampaign, getGoogleSpendVsLeadsSeries,
  getGoogleKeywordPerformance, getGoogleSearchTermPerformance, getMonthlyPerformance, isGanho, isLeadGoogle,
} from '../../utils/calculations'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'

// --- formatadores (pt-BR) ---
const r$ = v => (v > 0 ? `R$ ${Math.round(v).toLocaleString('pt-BR')}` : '—')
const r$2 = v => (v > 0 ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—')
const int = v => (v || 0).toLocaleString('pt-BR')
const num1 = v => (v > 0 ? Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—')
const pct = (v, d = 1) => `${(v || 0).toFixed(d)}%`
const xN = v => (v > 0 ? `${v.toFixed(2)}x` : '—')
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const fmtMes = k => { const [y, m] = String(k).split('-'); return `${MESES[+m - 1] || '?'}/${y}` }
const fmtData = s => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—')

// Badge do tipo de campanha do Google (Search, PMax, Display...)
const CHANNEL_LABELS = { SEARCH: 'SEARCH', PERFORMANCE_MAX: 'PMAX', DISPLAY: 'DISPLAY', VIDEO: 'VIDEO', SHOPPING: 'SHOPPING', DEMAND_GEN: 'DEMAND GEN' }
const channelColor = (ch) => ({ SEARCH: '#22d3ee', PERFORMANCE_MAX: '#a78bfa', DISPLAY: '#38bdf8', VIDEO: '#f87171', SHOPPING: '#34D399', DEMAND_GEN: '#fbbf24' }[ch] || 'var(--text-muted)')

// Badge do tipo de correspondência da keyword
const matchColor = (mt) => ({ EXACT: '#34D399', PHRASE: '#38bdf8', BROAD: '#fbbf24' }[mt] || 'var(--text-muted)')
const MATCH_LABELS = { EXACT: 'Exata', PHRASE: 'Frase', BROAD: 'Ampla' }

// Métricas do comparativo vs período anterior. better=1 => subir é bom (verde);
// better=0 => neutro (cinza, ex.: investimento).
const CMP_METRICS = [
  { key: 'cost', label: 'Investimento', fmt: 'money', src: 'google', better: 0 },
  { key: 'clicks', label: 'Cliques', fmt: 'int', src: 'google', better: 1 },
  { key: 'conversions', label: 'Conversões (Google)', fmt: 'int', src: 'google', better: 1 },
  { key: 'leadsGoogle', label: 'Leads Google', fmt: 'int', src: 'banco', better: 1 },
  { key: 'agendamentos', label: 'Agendamentos', fmt: 'int', src: 'banco', better: 1 },
  { key: 'receita', label: 'Receita', fmt: 'money', src: 'banco', better: 1 },
]
const fmtBy = (kind, v) => (kind === 'money' ? r$(v) : kind === 'pct' ? pct(v, 2) : int(Math.round(v)))

// Tag de origem do dado: google (Google Ads), banco (base de leads), cruzado (combinação)
const SRC = {
  google: { label: 'Google', color: '#fbbf24' },
  banco: { label: 'Banco', color: '#34D399' },
  cruzado: { label: 'Cruzado', color: '#a78bfa' },
}
function SourceTag({ type }) {
  const s = SRC[type] || SRC.banco
  return (
    <span style={{
      fontSize: '0.54rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      padding: '2px 6px', borderRadius: 6, color: s.color, background: `${s.color}1f`,
      border: `1px solid ${s.color}40`, whiteSpace: 'nowrap', lineHeight: 1.4,
    }}>{s.label}</span>
  )
}

function KPICard({ icon: Icon, label, value, sub, color, tooltip, source }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon-wrap" style={{ background: `linear-gradient(135deg, ${color}20, ${color}05)` }}>
        <Icon style={{ color }} size={22} strokeWidth={1.5} />
      </div>
      <div className="kpi-info">
        <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {label}{source && <SourceTag type={source} />}
        </div>
        <div className="kpi-value" style={{ color }}>{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
        {tooltip && <div className="kpi-desc">{tooltip}</div>}
      </div>
    </div>
  )
}

// Cabeçalho de coluna (th) com tag de origem e ordenação opcional.
function ThSrc({ children, src, sortKey, sort, onSort }) {
  const clickable = !!(sortKey && onSort)
  const active = clickable && sort && sort.key === sortKey
  return (
    <th onClick={clickable ? () => onSort(sortKey) : undefined}
      style={{ cursor: clickable ? 'pointer' : undefined, userSelect: 'none' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: active ? 'var(--neon-cyan)' : undefined }}>
          {children}
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : (clickable ? <span style={{ opacity: 0.3 }}>⇅</span> : null)}
        </span>
        {src && <SourceTag type={src} />}
      </div>
    </th>
  )
}

// Funil de conversão com glassmorphism. Escala LOG (não sqrt): no Google o topo
// (milhares de cliques) esmaga as etapas de unidades — log preserva a diferença
// visual entre 28 e 2 em vez de colapsar as duas no piso.
function Funnel3D({ stages }) {
  const maxV = Math.max(...stages.map(s => s.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 0 4px' }}>
      {stages.map((s, i) => {
        const ratio = Math.log((s.value || 0) + 1) / Math.log(maxV + 1)
        const widthPct = Math.max(10, Math.round(ratio * 100))
        const conv = i > 0 && stages[i - 1].value > 0 ? (s.value / stages[i - 1].value) * 100 : null
        return (
          <div key={i} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {conv != null && (
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: '1px 0' }}>
                ↓ <strong style={{ color: 'var(--text-secondary)' }}>{conv.toFixed(1)}%</strong>
              </div>
            )}
            <div style={{
              width: `${widthPct}%`, minWidth: 150, position: 'relative',
              padding: '14px 24px', borderRadius: 16,
              background: `linear-gradient(135deg, ${s.color}2e, ${s.color}10)`,
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${s.color}55`,
              boxShadow: `0 10px 28px rgba(0,0,0,0.4), 0 0 22px ${s.color}22, inset 0 1px 0 rgba(255,255,255,0.18)`,
              textAlign: 'center',
              transition: 'width 0.45s cubic-bezier(0.2,0.8,0.2,1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
                <SourceTag type={s.src} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1.1, textShadow: `0 0 20px ${s.color}66` }}>{int(s.value)}</div>
              {s.sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.sub}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Cabeçalho de seção com tag de origem
function SectionTitle({ title, source, icon: Icon }) {
  return (
    <div className="card-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="card-title">{title}</span>
        {source && <SourceTag type={source} />}
      </div>
      {Icon && <Icon size={16} className="card-icon" />}
    </div>
  )
}

export default function DadosGoogleTab({ allLeads = [], leads = [], googleInsights = [], googleKeywords = [], googleSearchTerms = [] }) {
  const baseLeads = allLeads.length ? allLeads : leads
  const hasGoogle = googleInsights && googleInsights.length > 0

  const availableMonths = useMemo(() => {
    const set = new Set()
    googleInsights.forEach(r => { if (r.date) set.add(String(r.date).slice(0, 7)) })
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [googleInsights])

  const [month, setMonth] = useState('all')
  // Ordenação das tabelas "Por Palavra-chave" e "Termos de Pesquisa"
  const [ksort, setKsort] = useState({ key: 'cost', dir: 'desc' })
  const [tsort, setTsort] = useState({ key: 'cost', dir: 'desc' })
  // Popover de leads (CRM)
  const [leadsModal, setLeadsModal] = useState(null) // { title, leads, x, y }
  const openChatguru = (e, leadsArr, title) => {
    const arr = leadsArr || []
    if (!arr.length) return
    if (arr.length === 1 && arr[0].chat) {
      window.open(arr[0].chat, '_blank', 'noopener,noreferrer')
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(rect.left, window.innerWidth - 360)
    const y = rect.bottom + 6
    setLeadsModal({ title, leads: arr, x, y })
  }
  const onSortKeyword = (key) => setKsort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  const onSortTerm = (key) => setTsort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))

  const range = useMemo(() => {
    if (month !== 'all') {
      // último dia REAL do mês (não "-31": quebraria o Date do prevRange em fev/abr/jun/set/nov)
      const [y, m] = month.split('-').map(Number)
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
      return { min: `${month}-01`, max: `${month}-${String(lastDay).padStart(2, '0')}` }
    }
    const ds = googleInsights.map(r => String(r.date).slice(0, 10)).filter(Boolean).sort()
    return ds.length ? { min: ds[0], max: ds[ds.length - 1] } : null
  }, [month, googleInsights])

  const insightsInRange = useMemo(() => {
    if (!range) return []
    return googleInsights.filter(r => {
      const d = r.date ? String(r.date).slice(0, 10) : null
      return d && d >= range.min && d <= range.max
    })
  }, [googleInsights, range])

  const keywordsInRange = useMemo(() => {
    if (!range) return []
    return googleKeywords.filter(r => {
      const d = r.date ? String(r.date).slice(0, 10) : null
      return d && d >= range.min && d <= range.max
    })
  }, [googleKeywords, range])

  const termsInRange = useMemo(() => {
    if (!range) return []
    return googleSearchTerms.filter(r => {
      const d = r.date ? String(r.date).slice(0, 10) : null
      return d && d >= range.min && d <= range.max
    })
  }, [googleSearchTerms, range])

  const leadsInRange = useMemo(() => {
    if (!range) return baseLeads
    return baseLeads.filter(l => {
      const d = l.created_at ? l.created_at.slice(0, 10) : null
      return d && d >= range.min && d <= range.max
    })
  }, [baseLeads, range])

  const googleLeadsInRange = useMemo(() => leadsInRange.filter(isLeadGoogle), [leadsInRange])
  const googleLeadsAll = useMemo(() => baseLeads.filter(isLeadGoogle), [baseLeads])

  const kpis = useMemo(() => getGoogleCrossKPIs(leadsInRange, insightsInRange), [leadsInRange, insightsInRange])
  // Agendamentos pela DATA DO AGENDAMENTO (quando_agendou no período), leads Google
  const agendNaData = useMemo(() => {
    if (!range) return 0
    return baseLeads.filter(l => {
      if (l.status_agendado !== true || !l.quando_agendou || !isLeadGoogle(l)) return false
      const d = String(l.quando_agendou).slice(0, 10)
      return d >= range.min && d <= range.max
    }).length
  }, [baseLeads, range])
  const series = useMemo(() => getGoogleSpendVsLeadsSeries(leadsInRange, insightsInRange), [leadsInRange, insightsInRange])
  const campaigns = useMemo(() => getGoogleByCampaign(leadsInRange, insightsInRange), [leadsInRange, insightsInRange])
  const keywordPerf = useMemo(() => getGoogleKeywordPerformance(leadsInRange, keywordsInRange), [leadsInRange, keywordsInRange])
  // Tabela mensal: universo Google (leads Google × investimento Google)
  const monthly = useMemo(
    () => getMonthlyPerformance(googleLeadsAll, googleInsights.map(r => ({ date: r.date, spend: r.cost })), 12),
    [googleLeadsAll, googleInsights]
  )

  // Funil: clique (Google) -> lead Google -> agendamento -> novo paciente.
  // Leads/agendamentos/pacientes pela DATA DE CRIAÇÃO (cohort). Sem impressões
  // (métrica de mídia removida a pedido — o dado segue nas tabelas via CTR).
  const funilStages = useMemo(() => {
    const leadsN = googleLeadsInRange.length
    const agendamentos = googleLeadsInRange.filter(l => l.status_agendado === true).length
    const novosPacientes = googleLeadsInRange.filter(isGanho).length
    return [
      { label: 'Cliques', value: kpis.clicks, color: '#22d3ee', src: 'google', sub: `Investimento: ${r$(kpis.cost)}` },
      { label: 'Leads Google', value: leadsN, color: '#38bdf8', src: 'banco' },
      { label: 'Agendamentos', value: agendamentos, color: '#a78bfa', src: 'banco' },
      { label: 'Novos pacientes', value: novosPacientes, color: '#34D399', src: 'banco' },
    ]
  }, [googleLeadsInRange, kpis])

  // Quebra por Perfil_lead dos leads Google no período (classificação da IA)
  const perfilBreakdown = useMemo(() => {
    const PERFIL_META = {
      'LEAD PRIORITÁRIO': { label: 'Prioritário', color: '#34D399' },
      'LEAD POTENCIAL': { label: 'Potencial', color: '#38bdf8' },
      'LEAD PERFIL FORA': { label: 'Perfil Fora', color: '#ff5a5f' },
      'LEAD PERFIL FORA / BAIXO FIT': { label: 'Perfil Fora / Baixo Fit', color: '#ff5a5f' },
      'LEAD FANTASMA': { label: 'Fantasma', color: '#94a3b8' },
    }
    const map = {}
    googleLeadsInRange.forEach(l => {
      const key = l.Perfil_lead || 'Não classificado'
      map[key] = (map[key] || 0) + 1
    })
    const total = googleLeadsInRange.length || 1
    return Object.entries(map)
      .map(([key, count]) => ({
        key,
        label: (PERFIL_META[key] && PERFIL_META[key].label) || key,
        color: (PERFIL_META[key] && PERFIL_META[key].color) || 'var(--text-muted)',
        count,
        pct: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count)
  }, [googleLeadsInRange])

  // Comparativo com o período anterior (mesma duração, imediatamente antes)
  const prevRange = useMemo(() => {
    if (!range) return null
    const day = 86400000
    const toMs = s => new Date(s + 'T00:00:00Z').getTime()
    const iso = ms => new Date(ms).toISOString().slice(0, 10)
    const days = Math.round((toMs(range.max) - toMs(range.min)) / day) + 1
    const pMax = toMs(range.min) - day
    const pMin = pMax - (days - 1) * day
    return { min: iso(pMin), max: iso(pMax) }
  }, [range])
  const kpisPrev = useMemo(() => {
    if (!prevRange) return null
    const gi = googleInsights.filter(r => { const d = String(r.date).slice(0, 10); return d >= prevRange.min && d <= prevRange.max })
    const li = baseLeads.filter(l => { const d = l.created_at ? l.created_at.slice(0, 10) : null; return d && d >= prevRange.min && d <= prevRange.max })
    return { kpis: getGoogleCrossKPIs(li, gi), hasData: gi.length > 0 }
  }, [prevRange, googleInsights, baseLeads])

  // Linhas de keyword com ordenação aplicada
  const keywordRows = useMemo(() => {
    const { key, dir } = ksort
    const mul = dir === 'asc' ? 1 : -1
    return [...keywordPerf.rows].sort((a, b) => {
      const av = a[key], bv = b[key]
      if (typeof av === 'string' || typeof bv === 'string') return String(av || '').localeCompare(String(bv || '')) * mul
      return ((Number(av) || 0) - (Number(bv) || 0)) * mul
    })
  }, [keywordPerf.rows, ksort])

  // Termos de pesquisa reais, com ordenação aplicada
  const searchTermRows = useMemo(() => {
    const rows = getGoogleSearchTermPerformance(termsInRange, keywordsInRange)
    const { key, dir } = tsort
    const mul = dir === 'asc' ? 1 : -1
    return rows.sort((a, b) => {
      const av = a[key], bv = b[key]
      if (typeof av === 'boolean' || typeof bv === 'boolean') return ((av ? 1 : 0) - (bv ? 1 : 0)) * mul
      if (typeof av === 'string' || typeof bv === 'string') return String(av || '').localeCompare(String(bv || '')) * mul
      return ((Number(av) || 0) - (Number(bv) || 0)) * mul
    })
  }, [termsInRange, keywordsInRange, tsort])

  const lowVolume = hasGoogle && googleLeadsInRange.length < 20

  return (
    <>
      {/* Filtro de mês + legenda de origem */}
      <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarRange size={16} style={{ color: 'var(--neon-cyan)' }} />
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Período</span>
          <select className="filter-select" value={month} onChange={e => setMonth(e.target.value)}>
            <option value="all">Últimos 90 dias</option>
            {availableMonths.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}
          </select>
        </div>
        {range && <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{fmtData(range.min)} a {fmtData(range.max)}</span>}
        {hasGoogle && (
          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            Match keyword: <strong style={{ color: keywordPerf.matchRate >= 50 ? '#34D399' : '#fbbf24' }}>{pct(keywordPerf.matchRate, 0)}</strong>
            <span style={{ color: 'var(--text-muted)' }}> ({keywordPerf.matched}/{keywordPerf.totalGoogle} leads Google)</span>
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Origem:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><SourceTag type="google" /><span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>direto do Google</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><SourceTag type="banco" /><span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>nosso banco</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><SourceTag type="cruzado" /><span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>combinação</span></span>
        </div>
      </div>

      {/* Banner: dados ainda não sincronizados */}
      {!hasGoogle && (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <Info size={18} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Dados do Google Ads ainda não sincronizados.</strong>
            A tabela mensal abaixo já funciona com os leads Google do banco.
          </div>
        </div>
      )}

      {/* Banner: volume baixo de leads Google */}
      {lowVolume && (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <Info size={18} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Volume baixo de leads Google no período ({int(googleLeadsInRange.length)}).</strong> CPL,
            CPA e ROAS são indicativos com poucos leads — leia junto com os valores absolutos.
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid-kpi">
        <KPICard icon={Banknote} label="Investimento" value={r$(kpis.cost)} color="#34D399" source="google" tooltip="Total investido em Google Ads no período" />
        <KPICard icon={MousePointerClick} label="Conversões (Google)" value={num1(kpis.conversions)} color="#fbbf24" source="google" tooltip="Conversões da tag do Google. Frações (ex.: 0,5) = atribuição data-driven divide o crédito de 1 conversão entre as palavras/cliques do caminho" />
        <KPICard icon={UserPlus} label="Leads Google" value={int(kpis.leadsGoogle)} color="var(--neon-cyan)" source="banco" tooltip="Leads com utm_source=google ou gclid, pela data de criação no período" />
        <KPICard icon={Coins} label="Custo por lead" value={r$2(kpis.cpl)} color="#fbbf24" source="cruzado" tooltip="Investimento (Google) ÷ leads Google (Banco) = CPL" />
        <KPICard icon={CalendarCheck} label="Agend. (criação)" value={int(kpis.agendamentos)} color="var(--neon-blue)" source="banco" tooltip="Leads Google que agendaram, contados pela data de criação do lead no período" />
        <KPICard icon={CalendarCheck} label="Agend. (data agend.)" value={int(agendNaData)} color="var(--neon-cyan)" source="banco" tooltip="Leads Google cuja consulta foi agendada no período (pela data do agendamento / quando_agendou)" />
        <KPICard icon={Target} label="Custo / agendamento" value={r$2(kpis.cpa)} color="#a78bfa" source="cruzado" tooltip="Investimento (Google) ÷ agendamentos por criação (Banco) = CPA" />
        <KPICard icon={Trophy} label="Receita atribuída" value={r$(kpis.receita)} color="#34D399" source="banco" tooltip="Valor fechado dos leads Google no período" />
        <KPICard icon={TrendingUp} label="ROAS" value={xN(kpis.roas)} color="#34D399" source="cruzado" tooltip="Receita (Banco) ÷ investimento (Google). A venda fecha ~17d depois, então subconta no curto prazo" />
        <KPICard icon={Users} label="CAC" value={r$(kpis.cac)} color="var(--neon-rose)" source="cruzado" tooltip="Investimento do período ÷ novos pacientes (leads Google criados no período que compareceram)" />
      </div>

      {/* Investimento x Leads x Receita no tempo */}
      <div className="glass-card">
        <SectionTitle title="Investimento × Leads × Receita (diário)" source="cruzado" />
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={v => (v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${Math.round(v)}`)} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
                formatter={(v, n) => [n === 'Investimento' || n === 'Receita' ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : v, n]} />
              <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
              <Bar yAxisId="l" dataKey="cost" name="Investimento" fill="var(--neon-blue)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar yAxisId="l" dataKey="receita" name="Receita" fill="rgba(52,211,153,0.55)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Line yAxisId="r" type="monotone" dataKey="leads" name="Leads Google" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem dados de investimento no período.</p>}
      </div>

      {/* Comparativo vs período anterior */}
      {hasGoogle && kpisPrev && (
        <div className="glass-card">
          <SectionTitle title={`Comparativo vs período anterior (${fmtData(prevRange.min)} a ${fmtData(prevRange.max)})`} source="cruzado" />
          {kpisPrev.hasData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {CMP_METRICS.map(m => {
                const cur = kpis[m.key] || 0
                const prev = kpisPrev.kpis[m.key] || 0
                const has = prev > 0
                const delta = has ? ((cur - prev) / prev) * 100 : null
                const up = (delta || 0) >= 0
                const color = m.better ? (up ? '#34D399' : '#ff5a5f') : 'var(--text-secondary)'
                return (
                  <div key={m.key} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                    <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{m.label}<SourceTag type={m.src} /></div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{fmtBy(m.fmt, cur)}</div>
                    <div style={{ fontSize: '0.7rem', marginTop: 4, color }}>
                      {has ? `${up ? '▲' : '▼'} ${Math.abs(delta).toFixed(0)}%` : (cur > 0 ? 'novo' : '—')}
                      <span style={{ color: 'var(--text-muted)' }}> vs {fmtBy(m.fmt, prev)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem dados no período anterior para comparar.</p>}
        </div>
      )}

      {/* Funil de conversão (3D) */}
      <div className="glass-card">
        <SectionTitle title="Funil de Conversão" source="cruzado" />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }}>
          Do clique no Google até o novo paciente. Leads, agendamentos e pacientes contados pela <strong>data de criação do lead</strong> no período.
        </p>
        <Funnel3D stages={funilStages} />
      </div>

      {/* Perfil dos leads Google (classificação da IA) */}
      <div className="glass-card">
        <SectionTitle title="Perfil dos Leads (Google)" source="banco" />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
          Como a IA classificou os leads vindos do Google no período — termômetro da <strong>qualidade do tráfego</strong>. Fantasma/Perfil Fora altos indicam clique pago de má qualidade.
        </p>
        {perfilBreakdown.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {perfilBreakdown.map(p => (
              <div key={p.key} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.color}35`, borderRadius: 'var(--radius-sm)', padding: 14 }}>
                <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>{p.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: p.color, textShadow: `0 0 16px ${p.color}44` }}>{int(p.count)}</div>
                <div style={{ fontSize: '0.7rem', marginTop: 4, color: 'var(--text-secondary)' }}>{pct(p.pct, 0)} dos leads Google</div>
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem leads Google no período.</p>}
      </div>

      {/* TABELA MENSAL — universo Google */}
      <div className="glass-card full-width">
        <SectionTitle title="Desempenho Mensal (Investimento × Leads × Receita)" source="cruzado" />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
          Universo <strong>Google</strong>: "Novos Leads" = leads Google (utm_source=google ou gclid). Tudo pela <strong>data de criação do lead</strong> (coorte), exceto "Agend. (data agend.)". Investimento só aparece nos meses com dados do Google sincronizados.
          <br /><strong>Agend. (criação)</strong> = agendamentos contados pelo mês em que o lead foi criado · <strong>Agend. (data agend.)</strong> = pelo mês em que a consulta foi agendada (quando_agendou).
          <br /><strong style={{ color: SRC.google.color }}>Google:</strong> Investimento · <strong style={{ color: SRC.banco.color }}>Banco:</strong> Novos Leads, Agend., Compareceram, Faltou, Receita · <strong style={{ color: SRC.cruzado.color }}>Cruzado:</strong> Conv., Custo/Lead, ROAS, CAC, Conv. Real
        </p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mês</th><th>Novos Leads</th><th>Agend. (criação)</th><th>Agend. (data agend.)</th><th>Conv.</th>
                <th>Compareceram</th><th>Faltou/Cancel.</th>
                <th>Investimento</th><th>Custo/Lead</th><th>Receita</th>
                <th>ROAS</th><th>CAC</th><th>Conv. Real</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map(m => (
                <tr key={m.mes}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{fmtMes(m.mes)}</td>
                  <td>{int(m.novosLeads)}</td>
                  <td>{int(m.agendamentos)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{int(m.agendamentosNaData)}</td>
                  <td>{pct(m.conversao, 1)}</td>
                  <td style={{ color: m.compareceram > 0 ? '#22d3ee' : undefined }}>{int(m.compareceram)}</td>
                  <td>{int(m.faltaram)}</td>
                  <td style={{ color: m.investimento > 0 ? '#34D399' : 'var(--text-muted)' }}>{r$(m.investimento)}</td>
                  <td>{r$2(m.custoPorLead)}</td>
                  <td style={{ color: m.receita > 0 ? '#34D399' : undefined, fontWeight: m.receita > 0 ? 600 : 400 }}>{r$(m.receita)}</td>
                  <td style={{ color: m.roas > 0 ? '#34D399' : undefined }}>{xN(m.roas)}</td>
                  <td>{r$(m.cac)}</td>
                  <td>{pct(m.conversaoReal, 1)}</td>
                </tr>
              ))}
              {monthly.length === 0 && <tr><td colSpan={13} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Sem dados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela por campanha */}
      <div className="glass-card full-width">
        <SectionTitle title="Por Campanha (Google)" source="cruzado" />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
          Leads cruzados via utm_campaign (ID da campanha do Google). Match campanha: <strong style={{ color: 'var(--text-secondary)' }}>{pct(campaigns.matchRate, 0)}</strong> ({campaigns.matched}/{campaigns.totalGoogle} leads Google).
        </p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <ThSrc src="google">Campanha</ThSrc>
                <ThSrc src="google">Tipo</ThSrc>
                <ThSrc src="google">Investimento</ThSrc>
                <ThSrc src="google">Cliques</ThSrc>
                <ThSrc src="google">CTR</ThSrc>
                <ThSrc src="google">CPC</ThSrc>
                <ThSrc src="google">Conv. Google</ThSrc>
                <ThSrc src="banco">Leads</ThSrc>
                <ThSrc src="banco">Agend.</ThSrc>
                <ThSrc src="cruzado">CPL</ThSrc>
              </tr>
            </thead>
            <tbody>
              {campaigns.rows.map((c, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.campaign_name}</td>
                  <td>
                    {c.channel_type
                      ? <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: `${channelColor(c.channel_type)}1f`, color: channelColor(c.channel_type), whiteSpace: 'nowrap' }}>{CHANNEL_LABELS[c.channel_type] || c.channel_type}</span>
                      : '—'}
                  </td>
                  <td style={{ color: '#34D399' }}>{r$(c.cost)}</td>
                  <td>{int(c.clicks)}</td>
                  <td>{pct(c.ctr, 2)}</td>
                  <td>{r$2(c.cpc)}</td>
                  <td>{num1(c.conversions)}</td>
                  <td>{int(c.leads)}</td>
                  <td>
                    <span
                      title={c.agendadosLeads?.length ? 'Clique para ver leads agendados' : undefined}
                      onClick={e => c.agendadosLeads?.length && openChatguru(e, c.agendadosLeads, `Agendados — ${c.campaign_name}`)}
                      style={{ cursor: c.agendadosLeads?.length ? 'pointer' : undefined, color: c.agendados > 0 ? 'var(--neon-blue)' : undefined }}
                    >{int(c.agendados)}</span>
                  </td>
                  <td>{r$2(c.cpl)}</td>
                </tr>
              ))}
              {campaigns.rows.length === 0 && <tr><td colSpan={10} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Sem dados de campanha no período</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela por palavra-chave */}
      <div className="glass-card full-width">
        <SectionTitle title="Por Palavra-chave" source="cruzado" icon={Search} />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
          Cruza o custo da keyword (Google) com os leads cujo utm_term é a mesma keyword (Banco). Taxa de match: <strong style={{ color: 'var(--text-secondary)' }}>{pct(keywordPerf.matchRate, 0)}</strong>.
          {keywordPerf.semTerm > 0 && <> {int(keywordPerf.semTerm)} lead(s) Google sem utm_term entram nos KPIs, mas não são atribuíveis por keyword.</>}
        </p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <ThSrc src="google" sortKey="keyword" sort={ksort} onSort={onSortKeyword}>Palavra-chave</ThSrc>
                <ThSrc src="google" sortKey="match_type" sort={ksort} onSort={onSortKeyword}>Corresp.</ThSrc>
                <ThSrc src="google" sortKey="campaign_name" sort={ksort} onSort={onSortKeyword}>Campanha</ThSrc>
                <ThSrc src="google" sortKey="cost" sort={ksort} onSort={onSortKeyword}>Investimento</ThSrc>
                <ThSrc src="google" sortKey="clicks" sort={ksort} onSort={onSortKeyword}>Cliques</ThSrc>
                <ThSrc src="google" sortKey="ctr" sort={ksort} onSort={onSortKeyword}>CTR</ThSrc>
                <ThSrc src="google" sortKey="cpc" sort={ksort} onSort={onSortKeyword}>CPC</ThSrc>
                <ThSrc src="google" sortKey="conversions" sort={ksort} onSort={onSortKeyword}>Conv. Google</ThSrc>
                <ThSrc src="banco" sortKey="leads" sort={ksort} onSort={onSortKeyword}>Leads</ThSrc>
                <ThSrc src="banco" sortKey="agendados" sort={ksort} onSort={onSortKeyword}>Agend.</ThSrc>
                <ThSrc src="cruzado" sortKey="cpl" sort={ksort} onSort={onSortKeyword}>CPL</ThSrc>
                <ThSrc src="cruzado" sortKey="cpa" sort={ksort} onSort={onSortKeyword}>CPA</ThSrc>
              </tr>
            </thead>
            <tbody>
              {keywordRows.map((k, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: 260 }}>{k.keyword}</td>
                  <td>
                    {k.match_type
                      ? <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: `${matchColor(k.match_type)}1f`, color: matchColor(k.match_type), whiteSpace: 'nowrap' }}>{MATCH_LABELS[k.match_type] || k.match_type}</span>
                      : '—'}
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k.campaign_name}>{k.campaign_name}</td>
                  <td style={{ color: '#34D399' }}>{r$2(k.cost)}</td>
                  <td>{int(k.clicks)}</td>
                  <td>{pct(k.ctr, 2)}</td>
                  <td>{r$2(k.cpc)}</td>
                  <td>{num1(k.conversions)}</td>
                  <td style={{ color: k.leads > 0 ? 'var(--neon-cyan)' : undefined, fontWeight: k.leads > 0 ? 600 : 400 }}>{int(k.leads)}</td>
                  <td>
                    <span
                      title={k.agendadosLeads?.length ? 'Clique para ver leads agendados' : undefined}
                      onClick={e => k.agendadosLeads?.length && openChatguru(e, k.agendadosLeads, `Agendados — ${k.keyword}`)}
                      style={{ cursor: k.agendadosLeads?.length ? 'pointer' : undefined, color: k.agendados > 0 ? 'var(--neon-blue)' : undefined }}
                    >{int(k.agendados)}</span>
                  </td>
                  <td>{r$2(k.cpl)}</td>
                  <td>{r$2(k.cpa)}</td>
                </tr>
              ))}
              {keywordRows.length === 0 && <tr><td colSpan={12} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Sem keywords no período (rode o seed) ou sem match de utm_term</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela de termos de pesquisa REAIS */}
      <div className="glass-card full-width">
        <SectionTitle title="Termos de Pesquisa (o que digitaram de verdade)" source="google" />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
          O que a pessoa <strong>realmente digitou</strong> no Google antes de clicar (a coluna "Ativou" mostra a keyword que disparou o anúncio).
          Use para achar: <strong style={{ color: '#ff5a5f' }}>desperdício</strong> (termo com custo e zero conversão → candidato a <em>palavra negativa</em>) e
          <strong style={{ color: '#34D399' }}> oportunidades</strong> (termo bom marcado "Novo" → candidato a virar keyword própria).
        </p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <ThSrc src="google" sortKey="term" sort={tsort} onSort={onSortTerm}>Termo digitado</ThSrc>
                <ThSrc src="google" sortKey="isKeyword" sort={tsort} onSort={onSortTerm}>Status</ThSrc>
                <ThSrc src="google" sortKey="keyword" sort={tsort} onSort={onSortTerm}>Ativou a keyword</ThSrc>
                <ThSrc src="google" sortKey="cost" sort={tsort} onSort={onSortTerm}>Custo</ThSrc>
                <ThSrc src="google" sortKey="clicks" sort={tsort} onSort={onSortTerm}>Cliques</ThSrc>
                <ThSrc src="google" sortKey="cpc" sort={tsort} onSort={onSortTerm}>CPC</ThSrc>
                <ThSrc src="google" sortKey="conversions" sort={tsort} onSort={onSortTerm}>Conv. Google</ThSrc>
              </tr>
            </thead>
            <tbody>
              {searchTermRows.map((t, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: 300 }}>{t.term}</td>
                  <td>
                    {t.isKeyword
                      ? <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(148,163,184,0.12)', color: '#94a3b8', whiteSpace: 'nowrap' }}>Já é keyword</span>
                      : <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(52,211,153,0.12)', color: '#34D399', whiteSpace: 'nowrap' }}>Novo</span>}
                  </td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }} title={t.keyword}>{t.keyword}</td>
                  <td style={{ color: '#34D399' }}>{r$2(t.cost)}</td>
                  <td>{int(t.clicks)}</td>
                  <td>{r$2(t.cpc)}</td>
                  <td style={{ color: t.conversions > 0 ? '#34D399' : (t.cost > 5 ? '#ff5a5f' : undefined) }}>{num1(t.conversions)}</td>
                </tr>
              ))}
              {searchTermRows.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Sem termos no período — rode o SQL novo (google_search_terms_daily) e o seed</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popover de leads (CRM) — aparece próximo ao clique */}
      {leadsModal && (
        <div onClick={() => setLeadsModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', left: leadsModal.x, top: leadsModal.y,
            width: 320, maxHeight: 300, overflowY: 'auto',
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 10, padding: '12px 16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.75)',
            zIndex: 1001,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{leadsModal.title}</span>
              <button onClick={() => setLeadsModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
            {leadsModal.leads.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{l.nome}</span>
                {l.chat
                  ? <a href={l.chat} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)', fontSize: '0.72rem', textDecoration: 'none', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>Abrir →</a>
                  : <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', flexShrink: 0, marginLeft: 8 }}>Sem link</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>
        <strong>Atribuição por keyword:</strong> o utm_term traz a palavra-chave que <em>disparou</em> o anúncio (ValueTrack {'{keyword}'}), não o termo exato que a pessoa digitou.
        <br /><strong>Performance Max:</strong> campanhas PMax não têm palavras-chave — o custo delas aparece só em "Por Campanha". Por isso a soma da tabela de keywords pode ser menor que o investimento total (não é erro).
        <br /><strong>Conversões (Google):</strong> vêm da tag do Google (janela de atribuição própria) e não batem 1:1 com os leads do banco — as tags de origem existem para separar as fontes. Valores com fração (ex.: 0,5) são normais: a atribuição data-driven do Google divide o crédito de 1 conversão entre as palavras/cliques que participaram do caminho.
        <br /><strong>Volume:</strong> com poucas vendas de leads Google, ROAS e CAC aparecem como '—' até existirem conversões — é o comportamento correto, não um erro.
      </p>
    </>
  )
}
