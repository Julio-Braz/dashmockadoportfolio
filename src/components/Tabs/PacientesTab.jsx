import { useState, useMemo, useEffect, useRef } from 'react'
import { getMockVendas, getMockContatos, getMockProdutosRows, getMockChatLinks } from '../../utils/mockData'
import {
  Users, Activity, UserPlus, Wallet, LifeBuoy, TrendingUp, Repeat, TrendingDown,
  AlertTriangle, Download, Search, Loader2, Bell, Coins, BarChart3, MessageCircle
} from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Sector, BarChart, CartesianGrid, ReferenceLine
} from 'recharts'
import {
  classificarPacientes, kpisPacientes, distribuicaoPorNivel, statusDaBase,
  matrizNivelStatus, receitaPorMes, movimentacaoDaBase, NIVEIS, STATUS_PACIENTE,
  gastoPorRecorrencia, receitaPorIdade, receitaPorBairro, adocaoPremium, premiumDeNome,
  receitaRecuperavel, getAlertas
} from '../../utils/calculations'
import { exportRowsToCSV } from '../../utils/csvExport'

// ---- cores frias (espelho JS — Recharts não lê var() em fill="url()") ----
const LVL = { Unique: '#a78bfa', Private: '#818cf8', Prime: '#38bdf8', Select: '#22d3ee', Start: '#cbd5e1' }
const LVL_DARK = { Unique: '#7c3aed', Private: '#4f46e5', Prime: '#0284c7', Select: '#0891b2', Start: '#64748b' }
const GLOW = { Unique: 'rgba(167,139,250,0.40)', Private: 'rgba(129,140,248,0.38)', Prime: 'rgba(56,189,248,0.38)', Select: 'rgba(34,211,238,0.36)', Start: 'rgba(148,163,184,0.22)' }
const ST = { Ativo: '#34d399', Adormecido: '#60a5fa', Perdido: '#94a3b8' }
const ST_DARK = { Ativo: '#059669', Adormecido: '#2563eb', Perdido: '#475569' }
const TIER = { Unique: 5, Private: 4, Prime: 3, Select: 2, Start: 1 }

// ---- helpers ----
function hexToRgba(hex, a) {
  const h = String(hex).replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
function rgbTriplet(hex) {
  const h = String(hex).replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useCountUp(target, ms = 1100) {
  const [v, setV] = useState(reduceMotion() ? target : 0)
  useEffect(() => {
    if (reduceMotion()) { setV(target); return }
    let raf, t0
    const ease = x => 1 - Math.pow(2, -10 * x)
    const tick = t => { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / ms); setV(target * ease(p)); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

const fmtBRL = (v) => (v > 0 ? `R$ ${Math.round(v).toLocaleString('pt-BR')}` : '—')
const fmtBRLcurto = (v) => {
  if (!v) return '—'
  if (v >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (v >= 1e3) return `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`
}
const fmtData = (s) => (s ? String(s).split('-').reverse().join('/') : '—')

// ---- tooltip de vidro p/ gráficos ----
function GlassTooltip({ active, payload, label, money }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{ background: 'rgba(5,5,8,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
      {label != null && <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: '#fff' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginTop: 2 }}>
          <span style={{ width: 3, height: 12, borderRadius: 2, background: p.color || (p.payload && p.payload.cor) || '#fff' }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
          <strong style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', color: '#fff' }}>{money ? fmtBRLcurto(Math.abs(p.value)) : Math.abs(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// ---- número grande com count-up ----
function CountUp({ value, format }) {
  const v = useCountUp(value)
  const n = Math.round(v)
  return <>{format ? format(n) : n.toLocaleString('pt-BR')}</>
}

// ---- marca de tier (nível) — substitui ícone genérico nos 5 níveis ----
function TierMark({ rank, color }) {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 'var(--radius-sm)', flexShrink: 0,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, padding: '0 8px 12px',
      background: `linear-gradient(135deg, ${hexToRgba(color, 0.14)}, ${hexToRgba(color, 0.03)})`,
      border: `1px solid ${hexToRgba(color, 0.16)}`,
    }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{
          width: 4, height: 6 + i * 5, borderRadius: 2,
          background: i <= rank ? color : 'rgba(255,255,255,0.10)',
          boxShadow: i <= rank ? `0 0 6px ${hexToRgba(color, 0.45)}` : 'none',
          transition: 'background .3s',
        }} />
      ))}
    </div>
  )
}

// ---- KPI card (ícone sutil ou marca de tier + count-up + tilt 3D suave + pulso frio) ----
function KPICard({ icon: Icon, mark, label, value, numeric, sub, color, delay, tooltip, action, actionRgb }) {
  const animated = useCountUp(numeric != null ? numeric : 0)
  const display = numeric != null ? Math.round(animated).toLocaleString('pt-BR') : value
  const elRef = useRef(null)
  const rafRef = useRef(0)
  const onMove = (e) => {
    if (rafRef.current || reduceMotion()) return
    const el = elRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${(px - 0.5) * 10}deg`)
      el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`)
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
      rafRef.current = 0
    })
  }
  const onLeave = () => {
    const el = elRef.current; if (!el) return
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg')
  }
  return (
    <div className="pac-tilt-wrap">
      <div ref={elRef} onMouseMove={onMove} onMouseLeave={onLeave}
        className={`kpi-card pac-tilt pac-rise stagger-${delay}${action ? ' is-action' : ''}`}
        style={action && actionRgb ? { '--glow-action-rgb': actionRgb } : undefined}>
        {mark || (
          <div className="kpi-icon-gem" style={{
            background: `linear-gradient(135deg, ${hexToRgba(color, 0.16)}, ${hexToRgba(color, 0.04)})`,
            border: `1px solid ${hexToRgba(color, 0.18)}`,
          }}>
            <Icon style={{ color }} />
          </div>
        )}
        <div className="kpi-info">
          <div className="kpi-label">{label}</div>
          <div className="kpi-value kpi-value-shine">{display}</div>
          {sub && <div className="kpi-sub">{sub}</div>}
          {tooltip && <div className="kpi-desc">{tooltip}</div>}
        </div>
      </div>
    </div>
  )
}

// ---- donut premium reutilizável (gráfico à esquerda, legenda à direita) ----
function DonutPremium({ data, colorsLight, colorsDark, idPrefix, centerValue, centerLabel }) {
  const [active, setActive] = useState(-1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: '56%', height: 270, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((d, i) => (
                <radialGradient key={i} id={`${idPrefix}${i}`} cx="50%" cy="50%" r="75%">
                  <stop offset="0%" stopColor={colorsLight[d.key]} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={colorsDark[d.key]} stopOpacity={1} />
                </radialGradient>
              ))}
            </defs>
            <Pie data={data} cx="50%" cy="50%" innerRadius={64} outerRadius={102} dataKey="value" stroke="none" isAnimationActive={false}>
              {data.map((d, i) => <Cell key={i} fill={colorsLight[d.key]} fillOpacity={0.14} />)}
            </Pie>
            <Pie data={data} cx="50%" cy="50%" innerRadius={62} outerRadius={96} paddingAngle={2} cornerRadius={4}
              dataKey="value" nameKey="name" stroke="rgba(0,0,0,0.35)" strokeWidth={1}
              animationBegin={200} animationDuration={1100}
              activeIndex={active} activeShape={(p) => <Sector {...p} outerRadius={p.outerRadius + 7} />}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(-1)}>
              {data.map((d, i) => <Cell key={i} fill={`url(#${idPrefix}${i})`} />)}
            </Pie>
            <Tooltip content={<GlassTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '2rem', fontWeight: 300, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{centerValue}</div>
          <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', marginTop: 4 }}>{centerLabel}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {data.map((d, i) => (
          <div key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', opacity: active === -1 || active === i ? 1 : 0.4, transition: 'opacity .2s' }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: colorsLight[d.key], flexShrink: 0, boxShadow: `0 0 8px ${colorsLight[d.key]}` }} />
            <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
            <strong style={{ marginLeft: 'auto', color: '#fff', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {d.value}{d.extra ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {d.extra}</span> : null}
            </strong>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- linha da matriz Nível × Status ----
function MatrixRow({ linha, li, max }) {
  const cor = LVL[linha.nivel] || '#cbd5e1'
  const rgb = rgbTriplet(cor)
  const cell = (val, col) => {
    const isTop = val === max && val > 0
    return (
      <div className={`matrix-cell${isTop ? ' is-top' : ''}`}
        style={{
          background: val > 0 ? hexToRgba(cor, 0.08 + 0.55 * (val / max)) : 'rgba(255,255,255,0.02)',
          color: val > 0 ? '#fff' : 'var(--text-muted)',
          '--cell-rgb': rgb, animationDelay: `${(li * 3 + col) * 40}ms`,
        }}>{val}</div>
    )
  }
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', color: cor, fontWeight: 600 }}>{linha.nivel}</div>
      {cell(linha.Ativo, 0)}{cell(linha.Adormecido, 1)}{cell(linha.Perdido, 2)}
    </>
  )
}

const VISOES = [
  { nome: 'Resgate', niveis: ['Unique', 'Private', 'Prime'], status: ['Adormecido', 'Perdido'] },
  { nome: 'Subir de Faixa', niveis: ['Select'], status: ['Ativo'] },
  { nome: 'Converter', niveis: ['Start'], status: ['Ativo'] },
  { nome: 'Unique', niveis: ['Unique'], status: [] },
  { nome: 'Adormecidos', niveis: [], status: ['Adormecido'] },
]

// colunas da tabela com descrição (tooltip de cabeçalho)
const COLS = [
  { key: 'nome', label: 'Nome', desc: 'Nome do paciente (cadastro do ERP — dados fictícios)' },
  { key: 'nivel', label: 'Nível', desc: 'Faixa pelo VP (valor de pico em 12 meses): Unique ≥100k · Private ≥60k · Prime ≥30k · Select ≥15k · Start <15k' },
  { key: 'status', label: 'Status', desc: 'Pela recência da última compra: Ativo ≤15m · Adormecido 15–24m · Perdido >24m' },
  { key: 'nCompras', label: 'Nº', desc: 'Número de compras (vendas pagas) do paciente' },
  { key: 'gastoTotal', label: 'Gasto total', desc: 'Soma de tudo que o paciente já gastou (histórico completo)' },
  { key: 'vp', label: 'Valor (pico 12m)', desc: 'VP — maior soma em qualquer janela de 12 meses. É o que define o Nível.' },
  { key: 'gasto12m', label: 'Últimos 12m', desc: 'Soma gasta nos últimos 12 meses (a partir de hoje). Diferente do VP, que é o pico histórico de qualquer janela de 12 meses.' },
  { key: 'recenciaMeses', label: 'Recência', desc: 'Meses desde a última compra paga' },
  { key: 'proximaAcao', label: 'Próxima ação', desc: 'Ação sugerida (Resgatar / Subir / Converter / Manter…) derivada de Nível + Status' },
  { key: 'ultimaCompra', label: 'Última compra', desc: 'Data da última venda paga' },
]

const COLS_CSV = [
  { key: 'nome', label: 'Nome' }, { key: 'nivel', label: 'Nível' }, { key: 'status', label: 'Status' },
  { key: 'nCompras', label: 'Nº compras' }, { key: 'gastoTotal', label: 'Gasto total' },
  { key: 'vp', label: 'Valor pico 12m' }, { key: 'gasto12m', label: 'Últimos 12m gastos' }, { key: 'recenciaMeses', label: 'Recência (meses)' },
  { key: 'proximaAcao', label: 'Próxima ação' }, { key: 'primeiraCompra', label: '1ª compra' },
  { key: 'ultimaCompra', label: 'Última compra' }, { key: 'telefone', label: 'Telefone' },
]

const corStatus = (s) => ST[s] || 'var(--text-muted)'
const PAGE_SIZE = 100

// --- telefones: chave canônica p/ casar paciente (ERP) ↔ lead (CRM) ---
// BR: normaliza DDI 55 + 9º dígito do celular → 55 + DDD + últimos 8.
// Estrangeiros (poucos, mas existem): mantém os dígitos completos com o DDI do país.
const soDigitos = (s) => String(s || '').replace(/\D/g, '')
function canonFone(raw) {
  const d = soDigitos(raw)
  if (!d || d.length < 10) return null
  if (d.startsWith('55') && d.length >= 12) return '55' + d.slice(2, 4) + d.slice(-8)
  return d
}

export default function PacientesTab() {
  const [vendas, setVendas] = useState([])
  const [contatos, setContatos] = useState([])
  const [produtosRows, setProdutosRows] = useState([])
  const [chatLinks, setChatLinks] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const erro = null

  const [busca, setBusca] = useState('')
  const [fNiveis, setFNiveis] = useState([])
  const [fStatus, setFStatus] = useState([])
  const [sort, setSort] = useState({ key: 'vp', dir: 'desc' })
  const [page, setPage] = useState(0)

  useEffect(() => {
    // Base 100% mockada (ERP fictício) — o pequeno atraso simula o fetch real
    const t = setTimeout(() => {
      setVendas(getMockVendas())
      setContatos(getMockContatos())
      setProdutosRows(getMockProdutosRows())
      const map = new Map()
      for (const [fone, url] of getMockChatLinks()) {
        const k = canonFone(fone)
        if (k) map.set(k, url)
      }
      setChatLinks(map)
      setLoading(false)
    }, 400)
    return () => clearTimeout(t)
  }, [])

  // resolve o link de contato de um paciente: CRM (se existir) senão WhatsApp direto
  const linkDoChat = (telefone) => {
    const k = canonFone(telefone)
    if (k && chatLinks.has(k)) return { url: chatLinks.get(k), guru: true }
    // número já armazenado com DDI (55 no BR, ou o do país) — não prefixa, p/ não quebrar estrangeiros
    const d = soDigitos(telefone)
    if (d.length >= 10) return { url: `https://wa.me/${d}`, guru: false }
    return null
  }

  const classificados = useMemo(() => classificarPacientes(vendas, contatos), [vendas, contatos])
  const kpis = useMemo(() => kpisPacientes(classificados, vendas), [classificados, vendas])
  const distNivel = useMemo(() => distribuicaoPorNivel(classificados), [classificados])
  const status = useMemo(() => statusDaBase(classificados), [classificados])
  const matriz = useMemo(() => matrizNivelStatus(classificados), [classificados])
  const receitaMes = useMemo(() => receitaPorMes(vendas, 24), [vendas])
  const movimentacao = useMemo(() =>
    movimentacaoDaBase(vendas, new Date(), 18).map(m => ({
      mes: m.mes.slice(2), Novos: m.novos, Reativaram: m.reativaram,
      Adormeceram: -m.adormeceram, Perderam: -m.perderam, Saldo: m.saldoLiquido,
    })), [vendas])

  const maxCelula = useMemo(() => Math.max(1, ...matriz.flatMap(l => [l.Ativo, l.Adormecido, l.Perdido])), [matriz])
  const maxRec = useMemo(() => Math.max(...receitaMes.map(r => r.receita), 1), [receitaMes])
  const donutNivel = useMemo(() => distNivel.map(d => ({ key: d.nivel, name: d.nivel, value: d.count, extra: `${d.pctReceita.toFixed(0)}% Receita` })), [distNivel])
  const donutStatus = useMemo(() => status.map(s => ({ key: s.status, name: s.status, value: s.count })), [status])
  const ativosPct = kpis.total > 0 ? Math.round((kpis.ativos / kpis.total) * 100) : 0

  // Análise de valor (§5.3) + Inteligência (§6.2/6.3)
  const gastoRecorrencia = useMemo(() => gastoPorRecorrencia(classificados), [classificados])
  const recIdade = useMemo(() => receitaPorIdade(classificados), [classificados])
  const recBairro = useMemo(() => receitaPorBairro(classificados, 10), [classificados])
  const premiumCountById = useMemo(() => {
    const porPac = new Map()
    for (const r of produtosRows) {
      const arr = Array.isArray(r.produtos) ? r.produtos : []
      for (const prod of arr) {
        const nome = premiumDeNome(prod && prod.descricao)
        if (nome) { if (!porPac.has(r.cod_contato)) porPac.set(r.cod_contato, new Set()); porPac.get(r.cod_contato).add(nome) }
      }
    }
    const count = new Map()
    for (const [id, set] of porPac) count.set(id, set.size)
    return count
  }, [produtosRows])
  const coberturaPct = vendas.length ? Math.round((produtosRows.length / vendas.length) * 100) : 0
  const adocaoPrem = useMemo(() => adocaoPremium(classificados, premiumCountById), [classificados, premiumCountById])
  const recup = useMemo(() => receitaRecuperavel(classificados), [classificados])
  const alertas = useMemo(() => getAlertas(classificados), [classificados])

  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
  const aplicarVisao = (vis) => { setFNiveis(vis.niveis); setFStatus(vis.status); setBusca('') }
  const limpar = () => { setFNiveis([]); setFStatus([]); setBusca('') }
  const ordenarPor = (key) => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  const filtrados = useMemo(() => {
    const s = busca.trim().toLowerCase()
    let rows = classificados.filter(p => {
      if (fNiveis.length && !fNiveis.includes(p.nivel)) return false
      if (fStatus.length && !fStatus.includes(p.status)) return false
      if (s && !String(p.nome).toLowerCase().includes(s) && !String(p.telefone).includes(s)) return false
      return true
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    rows = [...rows].sort((a, b) => {
      const va = a[sort.key], vb = b[sort.key]
      if (typeof va === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
    return rows
  }, [classificados, busca, fNiveis, fStatus, sort])

  useEffect(() => { setPage(0) }, [busca, fNiveis, fStatus, sort])
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const pagAtual = Math.min(page, totalPaginas - 1)
  const pageRows = filtrados.slice(pagAtual * PAGE_SIZE, pagAtual * PAGE_SIZE + PAGE_SIZE)

  const exportar = async () => {
    const rows = filtrados.map(p => ({
      ...p, gastoTotal: Math.round(p.gastoTotal), vp: Math.round(p.vp), gasto12m: Math.round(p.gasto12m),
      recenciaMeses: p.recenciaMeses.toFixed(1),
      primeiraCompra: fmtData(p.primeiraCompra), ultimaCompra: fmtData(p.ultimaCompra),
    }))
    exportRowsToCSV(rows, COLS_CSV, `pacientes_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', padding: 40 }}><Loader2 size={18} className="spinner" /> Carregando base de pacientes…</div>
  }
  if (erro) {
    return (
      <div className="glass-card" style={{ borderColor: 'rgba(255,90,95,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ff5a5f' }}><AlertTriangle size={18} /> Erro ao carregar: {erro}</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>Não foi possível gerar a base de demonstração.</p>
      </div>
    )
  }
  if (classificados.length === 0) {
    return (
      <div className="glass-card">
        <div className="card-header"><span className="card-title">Pacientes</span></div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum paciente classificado ainda.</p>
      </div>
    )
  }

  return (
    <div className="pac-root">
      <div className="aurora-bg" />
      <div className="pac-content">

        {/* FAIXA 1 — Saúde da base */}
        <div className="grid-kpi">
          <KPICard icon={Users} label="Total de Pacientes" numeric={kpis.total} color="#38bdf8" delay={1} tooltip="Todos que já compraram ao menos uma vez (venda paga)" />
          <KPICard icon={Activity} label="Pacientes Ativos" numeric={kpis.ativos} sub={`${ativosPct}% da base`} color="#34d399" delay={2} tooltip="Compraram nos últimos 15 meses — o coração saudável da carteira" />
          <KPICard icon={UserPlus} label="Novos no Mês" numeric={kpis.novosNoMes} color="#818cf8" delay={3} tooltip="Pacientes cuja 1ª compra foi neste mês" />
          <KPICard icon={Wallet} label="Receita 12 Meses" value={fmtBRLcurto(kpis.receita12m)} color="#7dd3fc" delay={4} tooltip="Tudo que a carteira gastou nos últimos 365 dias" />
        </div>

        {/* FAIXA 2 — Ação (prioridade máxima: onde agir agora) */}
        <div className="grid-kpi">
          <KPICard icon={LifeBuoy} label="Resgate de Alto Valor" numeric={kpis.resgateAltoValor} color="#818cf8" delay={1} action actionRgb="129,140,248" tooltip="Unique/Private/Prime que esfriaram (Adormecido/Perdido) — prioridade máxima" />
          <KPICard icon={TrendingUp} label="A Subir de Faixa" numeric={kpis.aSubir} color="#22d3ee" delay={2} tooltip="Select ativos, a um passo de virar Prime" />
          <KPICard icon={Repeat} label="A Converter (2ª compra)" numeric={kpis.aConverter} color="#38bdf8" delay={3} tooltip="Start ativos que compraram uma vez e não voltaram — o maior buraco" />
          <KPICard icon={TrendingDown} label="Receita em Risco" value={fmtBRLcurto(kpis.receitaEmRisco)} color="#94a3b8" delay={4} action actionRgb="148,163,184" tooltip="Gasto histórico de Adormecidos + Perdidos — dinheiro esfriando" />
        </div>

        {/* FAIXA 3 — Composição por nível (marca de tier) */}
        <div className="grid-kpi">
          {NIVEIS.map((n, i) => {
            const d = distNivel.find(x => x.nivel === n.nome) || { count: 0, pctBase: 0, pctReceita: 0 }
            return (
              <KPICard key={n.nome} mark={<TierMark rank={TIER[n.nome]} color={LVL[n.nome]} />} label={n.nome} numeric={d.count}
                sub={`${d.pctBase.toFixed(1)}% base · ${d.pctReceita.toFixed(0)}% receita`}
                color={LVL[n.nome]} delay={Math.min(6, i + 1)}
                tooltip={n.nome === 'Unique' ? 'VP ≥ R$ 100 mil na melhor janela de 12 meses — o topo do topo'
                  : n.nome === 'Start' ? 'VP < R$ 15 mil — a maior reserva de crescimento' : `VP ≥ R$ ${n.min.toLocaleString('pt-BR')} no pico de 12 meses`} />
            )
          })}
        </div>

        {/* Movimentação da base por mês */}
        <div className="glass-card full-width">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="card-title">Movimentação da Base por Mês</span>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              {[['Novos', '#34d399'], ['Reativaram', '#22d3ee'], ['Adormeceram', '#60a5fa'], ['Perderam', '#94a3b8'], ['Saldo', '#fff']].map(([n, c]) => (
                <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{n}</span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={movimentacao} stackOffset="sign">
              <defs>
                <linearGradient id="gNovos" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.9} /><stop offset="100%" stopColor="#34d399" stopOpacity={0.15} /></linearGradient>
                <linearGradient id="gReativ" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0.15} /></linearGradient>
                <linearGradient id="gAdorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.15} /><stop offset="100%" stopColor="#60a5fa" stopOpacity={0.9} /></linearGradient>
                <linearGradient id="gPerd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94a3b8" stopOpacity={0.15} /><stop offset="100%" stopColor="#94a3b8" stopOpacity={0.9} /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
              <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(186,230,253,0.05)' }} />
              <Bar dataKey="Novos" stackId="a" fill="url(#gNovos)" radius={[6, 6, 0, 0]} maxBarSize={24} animationDuration={1000} />
              <Bar dataKey="Reativaram" stackId="a" fill="url(#gReativ)" maxBarSize={24} animationDuration={1000} />
              <Bar dataKey="Adormeceram" stackId="a" fill="url(#gAdorm)" maxBarSize={24} animationDuration={1000} />
              <Bar dataKey="Perderam" stackId="a" fill="url(#gPerd)" radius={[0, 0, 6, 6]} maxBarSize={24} animationDuration={1000} />
              <Line type="monotone" dataKey="Saldo" stroke="#fff" strokeWidth={2.5} dot={false} animationDuration={1400} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid-2col">
          <div className="glass-card">
            <div className="card-header"><span className="card-title">Distribuição por Nível</span></div>
            <DonutPremium data={donutNivel} colorsLight={LVL} colorsDark={LVL_DARK} idPrefix="gn" centerValue={<CountUp value={kpis.total} />} centerLabel="Pacientes" />
          </div>
          <div className="glass-card">
            <div className="card-header"><span className="card-title">Status da Base (Retenção)</span></div>
            <DonutPremium data={donutStatus} colorsLight={ST} colorsDark={ST_DARK} idPrefix="gs" centerValue={`${ativosPct}%`} centerLabel="Ativos" />
          </div>
        </div>

        <div className="grid-2col">
          <div className="glass-card">
            <div className="card-header"><span className="card-title">Matriz Nível × Status</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '92px repeat(3, 1fr)', gap: 6, fontSize: '0.72rem' }}>
              <div></div>
              {['Ativo', 'Adormecido', 'Perdido'].map(s => (
                <div key={s} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: ST[s], fontWeight: 600, padding: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ST[s] }} />{s}
                </div>
              ))}
              {matriz.map((l, li) => <MatrixRow key={l.nivel} linha={l} li={li} max={maxCelula} />)}
            </div>
          </div>
          <div className="glass-card">
            <div className="card-header"><span className="card-title">Receita por Mês</span></div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={receitaMes}>
                <defs>
                  <linearGradient id="barRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7dd3fc" /><stop offset="100%" stopColor="#0284c7" /></linearGradient>
                  <linearGradient id="barRevMute" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.4} /><stop offset="100%" stopColor="#0284c7" stopOpacity={0.4} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={v => v.slice(2)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip money />} cursor={{ fill: 'rgba(186,230,253,0.06)' }} />
                <Bar dataKey="receita" radius={[6, 6, 0, 0]} maxBarSize={22} animationDuration={1000}>
                  {receitaMes.map((r, i) => <Cell key={i} fill={r.receita === maxRec ? 'url(#barRev)' : 'url(#barRevMute)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ANÁLISE DE VALOR (§5.3) */}
        <div className="glass-card full-width">
          <div className="card-header"><span className="card-title">Análise de Valor — por que um paciente vale mais</span><BarChart3 size={16} className="card-icon" /></div>
          <div className="grid-2col">
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Gasto médio por nº de compras — <strong style={{ color: 'var(--text-secondary)' }}>valor é frequência</strong></div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={gastoRecorrencia}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip content={<GlassTooltip money />} cursor={{ fill: 'rgba(186,230,253,0.06)' }} />
                  <Bar dataKey="gastoMedio" name="Gasto médio" fill="#38bdf8" radius={[6, 6, 0, 0]} maxBarSize={54} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Gasto médio por nº de aparelhos premium{coberturaPct < 90 ? ` · amostra ${coberturaPct}% (completa ao sincronizar)` : ''}</div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={adocaoPrem}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip content={<GlassTooltip money />} cursor={{ fill: 'rgba(186,230,253,0.06)' }} />
                  <Bar dataKey="gastoMedio" name="Gasto médio" fill="#a78bfa" radius={[6, 6, 0, 0]} maxBarSize={54} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid-2col" style={{ marginTop: 14 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Receita por faixa etária</div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={recIdade}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${(v / 1e6).toFixed(1)}mi`} axisLine={false} tickLine={false} />
                  <Tooltip content={<GlassTooltip money />} cursor={{ fill: 'rgba(186,230,253,0.06)' }} />
                  <Bar dataKey="receita" name="Receita" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={40} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Top 10 bairros por receita</div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={recBairro} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="bairro" width={104} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<GlassTooltip money />} cursor={{ fill: 'rgba(186,230,253,0.06)' }} />
                  <Bar dataKey="receita" name="Receita" fill="#818cf8" radius={[0, 5, 5, 0]} maxBarSize={16} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* INTELIGÊNCIA (§6.1/6.2) */}
        <div className="grid-kpi">
          <KPICard icon={Wallet} label="Valor da Carteira" value={fmtBRLcurto(kpis.carteira)} color="#38bdf8" delay={1} tooltip="Gasto histórico de toda a base — o tamanho do ativo de relacionamento" />
          <KPICard icon={AlertTriangle} label="Receita em Risco" value={fmtBRLcurto(kpis.receitaEmRisco)} sub={`${fmtBRLcurto(kpis.receitaEmRiscoAltoValor)} de alto valor`} color="#94a3b8" delay={2} tooltip="Gasto histórico de Adormecidos + Perdidos — dinheiro que já provou existir e está esfriando" />
          <KPICard icon={Coins} label="Receita Recuperável" value={fmtBRLcurto(recup.recuperavel)} sub={`${fmtBRLcurto(recup.recuperavelAltoValor)} de alto valor`} color="#22d3ee" delay={3} tooltip="Estimativa anual recuperável aplicando a curva de reativação (95% retornam em ≤14m) aos dormentes" />
        </div>

        {/* ALERTAS INTELIGENTES (§6.3) */}
        <div className="glass-card full-width">
          <div className="card-header">
            <span className="card-title">Alertas Inteligentes</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-secondary)' }}><Bell size={13} /> {alertas.length}</span>
          </div>
          {alertas.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhum evento detectado no momento.</p>
          ) : (
            <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {alertas.slice(0, 80).map(a => (
                <div key={`${a.codContato}-${a.tipo}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', fontSize: '0.76rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: a.urgencia >= 3 ? 'rgba(129,140,248,0.16)' : 'rgba(56,189,248,0.12)', color: a.urgencia >= 3 ? '#a5b4fc' : '#7dd3fc' }}>{a.tipo}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{a.paciente}</span>
                  <span style={{ background: hexToRgba(LVL[a.nivel] || '#cbd5e1', 0.14), color: LVL[a.nivel] || '#cbd5e1', fontSize: '0.6rem', fontWeight: 600, padding: '2px 7px', borderRadius: 8 }}>{a.nivel}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{a.detalhe}</span>
                  {(() => {
                    const lk = linkDoChat(a.telefone)
                    if (!lk) return <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.acao}</span>
                    const cor = lk.guru ? '#34d399' : '#25d366'
                    return (
                      <a href={lk.url} target="_blank" rel="noopener noreferrer"
                        title={lk.guru ? 'Abrir conversa no CRM (demo)' : 'Abrir no WhatsApp (número fictício)'}
                        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, color: cor, fontWeight: 700, whiteSpace: 'nowrap', textDecoration: 'none', padding: '4px 10px', borderRadius: 8, border: `1px solid ${hexToRgba(cor, 0.32)}`, background: hexToRgba(cor, 0.09) }}>
                        <MessageCircle size={13} /> {a.acao} →
                      </a>
                    )
                  })()}
                </div>
              ))}
              {alertas.length > 80 && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '6px 4px' }}>+{alertas.length - 80} alertas. Use as visões salvas para operar a lista completa.</p>}
            </div>
          )}
        </div>

        {/* TABELA */}
        <div className="glass-card full-width">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <span className="card-title">Pacientes ({filtrados.length})</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div className="search-wrap"><Search size={16} /><input type="text" autoComplete="off" className="search-input" placeholder="Buscar nome ou telefone…" value={busca} onChange={e => setBusca(e.target.value)} /></div>
              <button className="btn-export" onClick={exportar}><Download size={16} /> Exportar CSV</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visões:</span>
            {VISOES.map(v => <button key={v.nome} className="filter-chip" onClick={() => aplicarVisao(v)}>{v.nome}</button>)}
            {(fNiveis.length > 0 || fStatus.length > 0 || busca) && <button className="btn-clear-filters" onClick={limpar}>Limpar</button>}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {NIVEIS.map(n => (
              <button key={n.nome} className="filter-chip" onClick={() => toggle(fNiveis, setFNiveis, n.nome)}
                style={fNiveis.includes(n.nome) ? { borderColor: LVL[n.nome], color: LVL[n.nome], background: hexToRgba(LVL[n.nome], 0.1), boxShadow: `0 0 12px ${hexToRgba(LVL[n.nome], 0.25)}` } : undefined}>{n.nome}</button>
            ))}
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            {STATUS_PACIENTE.map(s => (
              <button key={s.nome} className="filter-chip" onClick={() => toggle(fStatus, setFStatus, s.nome)}
                style={fStatus.includes(s.nome) ? { borderColor: ST[s.nome], color: ST[s.nome], background: hexToRgba(ST[s.nome], 0.1), boxShadow: `0 0 12px ${hexToRgba(ST[s.nome], 0.25)}` } : undefined}>{s.nome}</button>
            ))}
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {COLS.map(c => (
                    <th key={c.key} className="col-th" style={{ cursor: 'pointer' }} onClick={() => ordenarPor(c.key)}>
                      {c.label}{sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                      <span className="col-tip"><strong>{c.label}</strong> — {c.desc}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(p => (
                  <tr key={p.codContato} className="pac-row" style={{ '--row-color': p.nivelCor }}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.nome}</td>
                    <td><span className="lead-card-badge" style={{ background: hexToRgba(p.nivelCor, 0.14), color: p.nivelCor }}>{p.nivel}</span></td>
                    <td><span className="lead-card-badge" style={{ background: hexToRgba(corStatus(p.status), 0.14), color: corStatus(p.status) }}>{p.status}</span></td>
                    <td>{p.nCompras}</td>
                    <td>{fmtBRL(p.gastoTotal)}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{fmtBRL(p.vp)}</td>
                    <td>{fmtBRL(p.gasto12m)}</td>
                    <td>{p.recenciaMeses.toFixed(0)}m</td>
                    <td>{p.proximaAcao}</td>
                    <td>{fmtData(p.ultimaCompra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPaginas > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '14px 4px 4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {pagAtual * PAGE_SIZE + 1}–{Math.min((pagAtual + 1) * PAGE_SIZE, filtrados.length)} de {filtrados.length.toLocaleString('pt-BR')} pacientes
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button className="btn-export" disabled={pagAtual === 0} onClick={() => setPage(0)} style={{ opacity: pagAtual === 0 ? 0.4 : 1 }}>«</button>
                  <button className="btn-export" disabled={pagAtual === 0} onClick={() => setPage(p => Math.max(0, p - 1))} style={{ opacity: pagAtual === 0 ? 0.4 : 1 }}>‹ Anterior</button>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>Página {pagAtual + 1} de {totalPaginas}</span>
                  <button className="btn-export" disabled={pagAtual >= totalPaginas - 1} onClick={() => setPage(p => Math.min(totalPaginas - 1, p + 1))} style={{ opacity: pagAtual >= totalPaginas - 1 ? 0.4 : 1 }}>Próxima ›</button>
                  <button className="btn-export" disabled={pagAtual >= totalPaginas - 1} onClick={() => setPage(totalPaginas - 1)} style={{ opacity: pagAtual >= totalPaginas - 1 ? 0.4 : 1 }}>»</button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
