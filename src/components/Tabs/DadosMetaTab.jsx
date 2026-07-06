import { useMemo, useState } from 'react'
import { Banknote, UserPlus, Coins, CalendarCheck, Target, MessageCircle, TrendingUp, Trophy, Users, Info, Image as ImageIcon, CalendarRange } from 'lucide-react'
import {
  getMetaCrossKPIs, getMetaByCampaign, getMetaSpendVsLeadsSeries,
  getMetaCreativePerformance, getMonthlyPerformance, isGanho, isLeadPago,
} from '../../utils/calculations'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'

// --- formatadores (pt-BR) ---
const r$ = v => (v > 0 ? `R$ ${Math.round(v).toLocaleString('pt-BR')}` : '—')
const r$2 = v => (v > 0 ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—')
const int = v => (v || 0).toLocaleString('pt-BR')
const pct = (v, d = 1) => `${(v || 0).toFixed(d)}%`
const xN = v => (v > 0 ? `${v.toFixed(2)}x` : '—')
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const fmtMes = k => { const [y, m] = String(k).split('-'); return `${MESES[+m - 1] || '?'}/${y}` }
const fmtData = s => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—')

// Estágio do funil a partir do nome da campanha (TOPO | ... / MEIO | ... / FUNDO | ...)
const stageOf = (name) => {
  const s = String(name || '').toUpperCase()
  if (s.startsWith('TOPO')) return 'TOPO'
  if (s.startsWith('MEIO')) return 'MEIO'
  if (s.startsWith('FUNDO')) return 'FUNDO'
  return name ? String(name).split('|')[0].trim().slice(0, 12) : '—'
}
const stageColor = (st) => ({ TOPO: '#22d3ee', MEIO: '#38bdf8', FUNDO: '#a78bfa' }[st] || 'var(--text-muted)')

// Métricas do comparativo vs período anterior. better=1 => subir é bom (verde);
// better=0 => neutro (cinza, ex.: investimento/impressões).
const CMP_METRICS = [
  { key: 'spend', label: 'Investimento', fmt: 'money', src: 'meta', better: 0 },
  { key: 'post_engagement', label: 'Engajamento (interações)', fmt: 'int', src: 'meta', better: 1 },
  { key: 'video_views', label: 'Views de vídeo', fmt: 'int', src: 'meta', better: 1 },
  { key: 'messaging_started', label: 'Conversas WhatsApp', fmt: 'int', src: 'meta', better: 1 },
  { key: 'leadsPagos', label: 'Leads pagos', fmt: 'int', src: 'banco', better: 1 },
  { key: 'agendamentos', label: 'Agendamentos', fmt: 'int', src: 'banco', better: 1 },
  { key: 'receita', label: 'Receita', fmt: 'money', src: 'banco', better: 1 },
]
const fmtBy = (kind, v) => (kind === 'money' ? r$(v) : kind === 'pct' ? pct(v, 2) : int(v))

// Tag de origem do dado: meta (Meta Ads), banco (base de leads), cruzado (combinação)
const SRC = {
  meta: { label: 'Meta', color: '#38bdf8' },
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
// Passe sortKey + sort + onSort para torná-lo clicável (asc/desc).
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

// Funil de conversão com glassmorphism. Usa escala sqrt para que etapas com
// valores muito menores que o topo ainda sejam visualmente distinguíveis.
function Funnel3D({ stages }) {
  const maxV = Math.max(...stages.map(s => s.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 0 4px' }}>
      {stages.map((s, i) => {
        const ratio = Math.sqrt(s.value / maxV)
        const widthPct = Math.max(12, Math.round(ratio * 100)) // escala sqrt, piso de 12%
        const conv = i > 0 && stages[i - 1].value > 0 ? (s.value / stages[i - 1].value) * 100 : null
        return (
          <div key={i} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {conv != null && (
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: '1px 0' }}>
                ↓ <strong style={{ color: 'var(--text-secondary)' }}>{conv.toFixed(1)}%</strong>
              </div>
            )}
            <div style={{
              width: `${widthPct}%`, minWidth: 190, position: 'relative',
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

export default function DadosMetaTab({ allLeads = [], leads = [], metaInsights = [], metaAdMap = [] }) {
  const baseLeads = allLeads.length ? allLeads : leads
  const hasMeta = metaInsights && metaInsights.length > 0

  const availableMonths = useMemo(() => {
    const set = new Set()
    metaInsights.forEach(r => { if (r.date) set.add(String(r.date).slice(0, 7)) })
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [metaInsights])

  const [month, setMonth] = useState('all')
  // Ordenação da tabela "Por Criativo"
  const [csort, setCsort] = useState({ key: 'spend', dir: 'desc' })
  // Modal de leads (CRM)
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
  const onSortCreative = (key) => setCsort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))

  const range = useMemo(() => {
    if (month !== 'all') {
      // último dia REAL do mês (não "-31": quebraria o Date do prevRange em fev/abr/jun/set/nov)
      const [y, m] = month.split('-').map(Number)
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
      return { min: `${month}-01`, max: `${month}-${String(lastDay).padStart(2, '0')}` }
    }
    const ds = metaInsights.map(r => String(r.date).slice(0, 10)).filter(Boolean).sort()
    return ds.length ? { min: ds[0], max: ds[ds.length - 1] } : null
  }, [month, metaInsights])

  const metaInRange = useMemo(() => {
    if (!range) return []
    return metaInsights.filter(r => {
      const d = r.date ? String(r.date).slice(0, 10) : null
      return d && d >= range.min && d <= range.max
    })
  }, [metaInsights, range])

  const leadsInRange = useMemo(() => {
    if (!range) return baseLeads
    return baseLeads.filter(l => {
      const d = l.created_at ? l.created_at.slice(0, 10) : null
      return d && d >= range.min && d <= range.max
    })
  }, [baseLeads, range])

  const kpis = useMemo(() => getMetaCrossKPIs(leadsInRange, metaInRange), [leadsInRange, metaInRange])
  // Agendamentos pela DATA DO AGENDAMENTO (quando_agendou no período), leads pagos
  const agendNaData = useMemo(() => {
    if (!range) return 0
    return baseLeads.filter(l => {
      if (l.status_agendado !== true || !l.quando_agendou || !isLeadPago(l)) return false
      const d = String(l.quando_agendou).slice(0, 10)
      return d >= range.min && d <= range.max
    }).length
  }, [baseLeads, range])
  const series = useMemo(() => getMetaSpendVsLeadsSeries(leadsInRange, metaInRange), [leadsInRange, metaInRange])
  const campaigns = useMemo(() => getMetaByCampaign(metaInRange), [metaInRange])
  const creative = useMemo(() => getMetaCreativePerformance(leadsInRange, metaInRange, metaAdMap), [leadsInRange, metaInRange, metaAdMap])
  const monthly = useMemo(() => getMonthlyPerformance(baseLeads, metaInsights, 12), [baseLeads, metaInsights])

  // Funil de conversão: conversas geradas (Meta) -> novas conversas WhatsApp ->
  // agendamentos -> novos pacientes. Tudo por DATA DE CRIAÇÃO do lead (cohort).
  const funilStages = useMemo(() => {
    const novasConversas = leadsInRange.length
    const agendamentos = leadsInRange.filter(l => l.status_agendado === true).length
    const novosPacientes = leadsInRange.filter(isGanho).length
    return [
      { label: 'Conversas geradas', value: kpis.messaging_started, color: '#22d3ee', src: 'meta', sub: `Investimento: ${r$(kpis.spend)}` },
      { label: 'Novas conversas WhatsApp', value: novasConversas, color: '#38bdf8', src: 'banco' },
      { label: 'Agendamentos', value: agendamentos, color: '#a78bfa', src: 'banco' },
      { label: 'Novos pacientes', value: novosPacientes, color: '#34D399', src: 'banco' },
    ]
  }, [leadsInRange, kpis])

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
    const mi = metaInsights.filter(r => { const d = String(r.date).slice(0, 10); return d >= prevRange.min && d <= prevRange.max })
    const li = baseLeads.filter(l => { const d = l.created_at ? l.created_at.slice(0, 10) : null; return d && d >= prevRange.min && d <= prevRange.max })
    return { kpis: getMetaCrossKPIs(li, mi), hasData: mi.length > 0 }
  }, [prevRange, metaInsights, baseLeads])

  // campaign_id -> nome (vem dos insights), para rotular o estágio do criativo
  const campNameById = useMemo(() => {
    const m = {}
    metaInsights.forEach(r => { if (r.campaign_id && r.campaign_name) m[r.campaign_id] = r.campaign_name })
    return m
  }, [metaInsights])

  // Linhas de criativo + coluna de campanha (estágio) + ordenação aplicada
  const creativeRows = useMemo(() => {
    const rows = creative.rows.map(c => ({ ...c, stage: stageOf(campNameById[c.campaign_id]) }))
    const { key, dir } = csort
    const mul = dir === 'asc' ? 1 : -1
    return rows.sort((a, b) => {
      const av = a[key], bv = b[key]
      if (typeof av === 'string' || typeof bv === 'string') return String(av || '').localeCompare(String(bv || '')) * mul
      return ((Number(av) || 0) - (Number(bv) || 0)) * mul
    })
  }, [creative.rows, campNameById, csort])

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
        {hasMeta && (
          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            Match criativo: <strong style={{ color: creative.matchRate >= 50 ? '#34D399' : '#fbbf24' }}>{pct(creative.matchRate, 0)}</strong>
            <span style={{ color: 'var(--text-muted)' }}> ({creative.matched}/{creative.totalPaid} leads pagos)</span>
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Origem:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><SourceTag type="meta" /><span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>direto da Meta</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><SourceTag type="banco" /><span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>nosso banco</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><SourceTag type="cruzado" /><span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>combinação</span></span>
        </div>
      </div>

      {/* Banner: dados ainda não sincronizados */}
      {!hasMeta && (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <Info size={18} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Dados da Meta ainda não sincronizados.</strong> A tabela mensal abaixo já funciona com os leads do banco.
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid-kpi">
        <KPICard icon={Banknote} label="Investimento" value={r$(kpis.spend)} color="#34D399" source="meta" tooltip="Total investido em anúncios no período" />
        <KPICard icon={MessageCircle} label="Conversas WhatsApp" value={int(kpis.messaging_started)} color="#22d3ee" source="meta" tooltip="Conversas iniciadas via anúncio (Meta)" />
        <KPICard icon={UserPlus} label="Leads pagos" value={int(kpis.leadsPagos)} color="var(--neon-cyan)" source="banco" tooltip="Leads com UTM no período (vindos de anúncio)" />
        <KPICard icon={Coins} label="Custo por lead" value={r$2(kpis.cpl)} color="#fbbf24" source="cruzado" tooltip="Investimento (Meta) ÷ leads pagos (Banco) = CPL" />
        <KPICard icon={CalendarCheck} label="Agend. (criação)" value={int(kpis.agendamentos)} color="var(--neon-blue)" source="banco" tooltip="Leads pagos que agendaram, contados pela data de criação do lead no período" />
        <KPICard icon={CalendarCheck} label="Agend. (data agend.)" value={int(agendNaData)} color="var(--neon-cyan)" source="banco" tooltip="Leads pagos cuja consulta foi agendada no período (pela data do agendamento / quando_agendou)" />
        <KPICard icon={Target} label="Custo / agendamento" value={r$2(kpis.cpa)} color="#a78bfa" source="cruzado" tooltip="Investimento (Meta) ÷ agendamentos por criação (Banco) = CPA" />
        <KPICard icon={Trophy} label="Receita atribuída" value={r$(kpis.receita)} color="#34D399" source="banco" tooltip="Valor fechado dos leads pagos no período" />
        <KPICard icon={TrendingUp} label="ROAS" value={xN(kpis.roas)} color="#34D399" source="cruzado" tooltip="Receita (Banco) ÷ investimento (Meta). A venda fecha ~17d depois, então subconta no curto prazo" />
        <KPICard icon={Users} label="CAC" value={r$(kpis.cac)} color="var(--neon-rose)" source="cruzado" tooltip="Investimento do período ÷ novos pacientes (leads PAGOS criados no período que compareceram). Lead criado em maio com consulta em junho só entra em maio quando comparece." />
      </div>

      {/* Investimento x Leads x Receita no tempo */}
      <div className="glass-card">
        <SectionTitle title="Investimento × Leads × Receita (diário)" source="cruzado" />
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
                formatter={(v, n) => [n === 'Investimento' || n === 'Receita' ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : v, n]} />
              <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
              <Bar yAxisId="l" dataKey="spend" name="Investimento" fill="var(--neon-blue)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar yAxisId="l" dataKey="receita" name="Receita" fill="rgba(52,211,153,0.55)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Line yAxisId="r" type="monotone" dataKey="leads" name="Leads pagos" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem dados de investimento no período.</p>}
      </div>

      {/* Comparativo vs período anterior */}
      {hasMeta && kpisPrev && (
        <div className="glass-card">
          <SectionTitle title={`Comparativo vs período anterior (${fmtData(prevRange.min)} a ${fmtData(prevRange.max)})`} source="cruzado" />
          {kpisPrev.hasData ? (
            <>
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
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 10 }}>
                Engajamento e views são do tráfego pago (gerados pelos anúncios). Seguidores e alcance orgânico do Instagram exigem permissões de IG no token (ver observação no rodapé).
              </p>
            </>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem dados no período anterior para comparar.</p>}
        </div>
      )}

      {/* Funil de conversão (3D) */}
      <div className="glass-card">
        <SectionTitle title="Funil de Conversão" source="cruzado" />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }}>
          Da conversa gerada pelos anúncios (Meta) até o novo paciente. Conversas WhatsApp, agendamentos e pacientes contados pela <strong>data de criação do lead</strong> no período.
        </p>
        <Funnel3D stages={funilStages} />
      </div>

      {/* TABELA MENSAL — espelho da aba DASHBOARD da planilha */}
      <div className="glass-card full-width">
        <SectionTitle title="Desempenho Mensal (Investimento × Leads × Receita)" source="cruzado" />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
          Tudo pela <strong>data de criação do lead</strong> (coorte), exceto "Agend. (data agend.)". Investimento só aparece nos meses com dados da Meta sincronizados.
          <br /><strong>Agend. (criação)</strong> = agendamentos contados pelo mês em que o lead foi criado · <strong>Agend. (data agend.)</strong> = pelo mês em que a consulta foi agendada (quando_agendou).
          <br /><strong style={{ color: SRC.meta.color }}>Meta:</strong> Investimento · <strong style={{ color: SRC.banco.color }}>Banco:</strong> Novos Leads, Agend., Compareceram, Faltou, Receita · <strong style={{ color: SRC.cruzado.color }}>Cruzado:</strong> Conv., Custo/Lead, ROAS, CAC, Conv. Real
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
        <SectionTitle title="Por Campanha (Meta)" source="meta" />
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Campanha</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>CTR</th><th>CPC</th><th>CPM</th><th>Conversas WA</th></tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.campaign_name}</td>
                  <td style={{ color: '#34D399' }}>{r$(c.spend)}</td>
                  <td>{int(c.impressions)}</td>
                  <td>{int(c.clicks)}</td>
                  <td>{pct(c.ctr, 2)}</td>
                  <td>{r$2(c.cpc)}</td>
                  <td>{r$2(c.cpm)}</td>
                  <td>{int(c.messaging_started)}</td>
                </tr>
              ))}
              {campaigns.length === 0 && <tr><td colSpan={8} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Sem dados de campanha no período</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela por criativo (post do Instagram) */}
      <div className="glass-card full-width">
        <SectionTitle title="Por Criativo (Post do Instagram)" source="cruzado" icon={ImageIcon} />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
          Cruza o investimento do anúncio (Meta) com os leads cujo utm_content é o mesmo post (Banco). Taxa de match: <strong style={{ color: 'var(--text-secondary)' }}>{pct(creative.matchRate, 0)}</strong>.
        </p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <ThSrc src="meta" sortKey="shortcode" sort={csort} onSort={onSortCreative}>Criativo</ThSrc>
                <ThSrc src="meta" sortKey="stage" sort={csort} onSort={onSortCreative}>Campanha</ThSrc>
                <ThSrc src="meta" sortKey="spend" sort={csort} onSort={onSortCreative}>Investimento</ThSrc>
                <ThSrc src="meta" sortKey="impressions" sort={csort} onSort={onSortCreative}>Impressões</ThSrc>
                <ThSrc src="meta" sortKey="ctr" sort={csort} onSort={onSortCreative}>CTR</ThSrc>
                <ThSrc src="banco" sortKey="leads" sort={csort} onSort={onSortCreative}>Leads</ThSrc>
                <ThSrc src="banco" sortKey="agendados" sort={csort} onSort={onSortCreative}>Agend.</ThSrc>
                <ThSrc src="banco" sortKey="ganhos" sort={csort} onSort={onSortCreative}>Compareceram</ThSrc>
                <ThSrc src="banco" sortKey="receita" sort={csort} onSort={onSortCreative}>Receita</ThSrc>
                <ThSrc src="banco" sortKey="ticketMedio" sort={csort} onSort={onSortCreative}>Ticket Médio</ThSrc>
                <ThSrc src="cruzado" sortKey="cpl" sort={csort} onSort={onSortCreative}>CPL</ThSrc>
                <ThSrc src="cruzado" sortKey="roas" sort={csort} onSort={onSortCreative}>ROAS</ThSrc>
              </tr>
            </thead>
            <tbody>
              {creativeRows.map((c, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)' }}>
                    <div title={c.ad_name || c.shortcode} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'help' }}>
                      {c.thumbnail
                        ? <img src={c.thumbnail} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} onError={e => e.currentTarget.style.display = 'none'} />
                        : <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />}
                      {c.permalink
                        ? <a href={c.permalink} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)', textDecoration: 'none' }}>{c.shortcode}</a>
                        : <span>{c.shortcode}</span>}
                    </div>
                  </td>
                  <td>
                    {c.stage && c.stage !== '—'
                      ? <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: `${stageColor(c.stage)}1f`, color: stageColor(c.stage) }}>{c.stage}</span>
                      : '—'}
                  </td>
                  <td style={{ color: '#34D399' }}>{r$(c.spend)}</td>
                  <td>{int(c.impressions)}</td>
                  <td>{pct(c.ctr, 2)}</td>
                  <td>{int(c.leads)}</td>
                  <td>
                    <span
                      title={c.agendadosLeads?.length ? 'Clique para ver leads agendados' : undefined}
                      onClick={e => c.agendadosLeads?.length && openChatguru(e, c.agendadosLeads, `Agendados — ${c.shortcode}`)}
                      style={{ cursor: c.agendadosLeads?.length ? 'pointer' : undefined, color: c.agendados > 0 ? 'var(--neon-blue)' : undefined }}
                    >{int(c.agendados)}</span>
                  </td>
                  <td>
                    <span
                      title={c.ganhosLeads?.length ? 'Clique para ver leads que compareceram' : undefined}
                      onClick={e => c.ganhosLeads?.length && openChatguru(e, c.ganhosLeads, `Compareceram — ${c.shortcode}`)}
                      style={{ cursor: c.ganhosLeads?.length ? 'pointer' : undefined, color: c.ganhos > 0 ? '#22d3ee' : undefined }}
                    >{int(c.ganhos)}</span>
                  </td>
                  <td style={{ color: c.receita > 0 ? '#34D399' : undefined }}>{r$(c.receita)}</td>
                  <td>{r$(c.ticketMedio)}</td>
                  <td>{r$2(c.cpl)}</td>
                  <td style={{ color: c.roas > 0 ? '#34D399' : undefined }}>{xN(c.roas)}</td>
                </tr>
              ))}
              {creativeRows.length === 0 && <tr><td colSpan={12} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Sem cruzamento criativo no período (sem anúncios sincronizados ou sem match de utm_content)</td></tr>}
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
        <strong>Atribuição:</strong> a Meta atribui por janela de 7 dias; a venda da clínica costuma fechar ~17 dias após o contato, então o ROAS de curto prazo subconta. O custo por lead/agendamento e o investimento são exatos (dados da conta de anúncios). O investimento pode divergir levemente de planilhas manuais que somam contas/canais diferentes.
        <br /><strong>Engajamento:</strong> os números de engajamento/views vêm do tráfego pago (ações geradas pelos anúncios). Seguidores, alcance e engajamento <em>orgânico</em> do Instagram não estão disponíveis com o token atual — exigem as permissões <code>instagram_basic</code> e <code>instagram_manage_insights</code> e a conta do IG vinculada ao Business. Com elas, dá para somar uma seção de evolução de seguidores/alcance do IG.
      </p>
    </>
  )
}
