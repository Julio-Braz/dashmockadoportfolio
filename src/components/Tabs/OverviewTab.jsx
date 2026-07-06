import { useMemo } from 'react'
import { UserPlus, CalendarCheck, Zap, Timer, Banknote, Snowflake, ArrowRightLeft, Flame, Star, Ghost, HelpCircle, Info, Trophy } from 'lucide-react'
import { calcKPIs, getEvolutionData, getAtribuicao, getFunnelData, countByField, getLostReasons, getLeadClassificationData, getLeadClassification, isGanho } from '../../utils/calculations'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts'

const COLORS_DONUT = ['var(--neon-cyan)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']
const COLORS_FUNNEL = ['rgba(255,255,255,0.1)', 'var(--neon-blue)', 'var(--neon-cyan)', 'var(--neon-mint)']

function KPICard({ icon: Icon, label, value, sub, color, delay, tooltip }) {
  return (
    <div className={`kpi-card stagger-${delay}`}>
      <div className="kpi-icon-wrap" style={{ background: `linear-gradient(135deg, ${color}20, ${color}05)` }}>
        <Icon style={{ color }} />
      </div>
      <div className="kpi-info">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" style={{ color }}>{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
        {tooltip && <div className="kpi-desc">{tooltip}</div>}
      </div>
    </div>
  )
}

export default function OverviewTab({ leads }) {
  const validLeads = useMemo(() => leads.filter(l => l.lost_reason_category !== 'Não é lead'), [leads])

  const kpis = useMemo(() => calcKPIs(validLeads), [validLeads])
  const evolution = useMemo(() => getEvolutionData(validLeads), [validLeads])
  const atribuicao = useMemo(() => getAtribuicao(validLeads), [validLeads])
  const funnel = useMemo(() => getFunnelData(validLeads), [validLeads])
  const handoffs = useMemo(() => countByField(validLeads.filter(l => l.handoff_category), 'handoff_category').slice(0, 5), [validLeads])
  const leadClass = useMemo(() => getLeadClassificationData(validLeads), [validLeads])
  
  const lostReasons = useMemo(() => getLostReasons(leads), [leads])

  const PERFIL_ORDER = ['Prioritário', 'Potencial', 'Baixo Fit', 'Fantasma', 'Não Classificado']
  const PERFIL_COLORS = { 'Prioritário': '#38bdf8', 'Potencial': '#818cf8', 'Baixo Fit': '#d6557a', 'Fantasma': '#a78bfa', 'Não Classificado': '#6B7280' }

  const agendPorPerfil = useMemo(() => {
    const map = {}
    PERFIL_ORDER.forEach(p => { map[p] = { perfil: p, total: 0, agendados: 0 } })
    validLeads.forEach(l => {
      const cls = getLeadClassification(l)
      if (!map[cls]) return
      map[cls].total++
      if (l.status_agendado === true) map[cls].agendados++
    })
    return PERFIL_ORDER.map(p => ({
      ...map[p],
      taxa: map[p].total > 0 ? +((map[p].agendados / map[p].total) * 100).toFixed(1) : 0,
    })).filter(d => d.total > 0)
  }, [validLeads])

  const comparPorPerfil = useMemo(() => {
    const map = {}
    PERFIL_ORDER.forEach(p => { map[p] = { perfil: p, agendados: 0, compareceu: 0 } })
    validLeads.filter(l => l.status_agendado === true).forEach(l => {
      const cls = getLeadClassification(l)
      if (!map[cls]) return
      map[cls].agendados++
      if (isGanho(l)) map[cls].compareceu++
    })
    return PERFIL_ORDER.map(p => ({
      ...map[p],
      taxa: map[p].agendados > 0 ? +((map[p].compareceu / map[p].agendados) * 100).toFixed(1) : 0,
    })).filter(d => d.agendados > 0)
  }, [validLeads])
  
  const recentScheduled = useMemo(() =>
    validLeads.filter(l => l.status_agendado === true)
      .sort((a, b) => (b.quando_agendou || '').localeCompare(a.quando_agendou || ''))
      .slice(0, 10),
    [validLeads]
  )

  const totalFunnel = funnel.reduce((a, b) => a + b.value, 0)

  return (
    <>
      <div className="grid-kpi">
        <KPICard icon={Banknote} label="Receita Total" value={kpis.receitaTotal > 0 ? `R$ ${kpis.receitaTotal.toLocaleString('pt-BR')}` : '—'} color="#34D399" delay={1} tooltip="Soma do valor fechado de todos os leads no período" />
        <KPICard icon={Banknote} label="Ticket Médio" value={kpis.ticketMedio > 0 ? `R$ ${Math.round(kpis.ticketMedio).toLocaleString('pt-BR')}` : '—'} color="var(--neon-cyan)" delay={2} tooltip="Receita média por venda fechada (somente leads com valor preenchido)" />
        <KPICard icon={Trophy} label="Pacientes Novos" value={kpis.pacientesGanhos} sub={`${kpis.agendados > 0 ? ((kpis.pacientesGanhos / kpis.agendados) * 100).toFixed(0) : 0}% dos agendados`} color="#22d3ee" delay={3} tooltip="Pacientes que compareceram à consulta (status confirmado/finalizado)" />
        <KPICard icon={UserPlus} label="Total de Leads" value={kpis.total} color="var(--neon-cyan)" delay={3} tooltip="Número total de leads únicos no período filtrado" />
        <KPICard icon={CalendarCheck} label="Agendamentos" value={kpis.agendados} color="var(--neon-blue)" delay={4} tooltip="Leads que marcaram consulta/reunião" />
        <KPICard icon={Zap} label="Taxa Conversão" value={`${kpis.taxaConversao}%`} color="var(--text-primary)" delay={4} tooltip="Porcentagem de leads que viraram Agendamentos" />
        <KPICard icon={Timer} label="Tempo Médio (Hoje)" value={`${kpis.tempoMesmoDiaH}h ${kpis.tempoMesmoDiaM}m`} color="var(--neon-mint)" delay={5} tooltip="Tempo médio para leads que agendam nas primeiras 24h" />
        <KPICard icon={Timer} label="Tempo Médio (+1 dia)" value={`${kpis.tempoMaisUmDiaD}d ${kpis.tempoMaisUmDiaH}h`} color="#a78bfa" delay={5} tooltip="Tempo médio para leads que demoram mais de 1 dia para agendar" />
        <KPICard icon={Flame} label="Lead Prioritário" value={kpis.leadsPrioritarios} sub={`${kpis.total > 0 ? ((kpis.leadsPrioritarios / kpis.total) * 100).toFixed(0) : 0}% do total`} color="#38bdf8" delay={6} tooltip="Forte aderência ao perfil premium" />
        <KPICard icon={Star} label="Lead Potencial" value={kpis.leadsPotenciais} sub={`${kpis.total > 0 ? ((kpis.leadsPotenciais / kpis.total) * 100).toFixed(0) : 0}% do total`} color="#818cf8" delay={7} tooltip="Perfil médio ou falta de informações claras" />
        <KPICard icon={Snowflake} label="Lead Perfil Fora" value={kpis.leadsPerfilFora} sub={`${kpis.total > 0 ? ((kpis.leadsPerfilFora / kpis.total) * 100).toFixed(0) : 0}% do total`} color="#d6557a" delay={8} tooltip="Baixa aderência, focado em queixas clínicas ou preço" />
        <KPICard icon={Ghost} label="Lead Fantasma" value={kpis.leadsFantasma} sub={`${kpis.total > 0 ? ((kpis.leadsFantasma / kpis.total) * 100).toFixed(0) : 0}% do total`} color="#a78bfa" delay={8} tooltip="Leads classificados como LEAD FANTASMA — sem engajamento ou sem resposta" />
        <KPICard icon={HelpCircle} label="Não Classificado" value={kpis.leadsNaoClassificados} sub={`${kpis.total > 0 ? ((kpis.leadsNaoClassificados / kpis.total) * 100).toFixed(0) : 0}% do total`} color="var(--text-muted)" delay={8} tooltip="Leads ainda sem perfil definido — a IA leva até 48h após o cadastro para classificar" />
      </div>

      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.15)' }}>
        <Info size={16} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          A classificação do lead (Prioritário / Potencial / Perfil Fora / Fantasma) é definida pela IA <strong style={{ color: 'var(--text-primary)' }}>até 48 horas após o cadastro</strong>. Leads recentes podem aparecer como <strong style={{ color: 'var(--text-primary)' }}>Não Classificado</strong> até a análise ser concluída.
        </span>
      </div>

      {/* G2 - Evolution */}
      <div className="glass-card">
        <div className="card-header"><span className="card-title">Evolução: Leads vs Agendamentos</span></div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={evolution}>
            <defs>
              <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4d9fff" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#4d9fff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e09e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00e09e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }} />
            <Area type="monotone" dataKey="leads" stroke="#4d9fff" fill="url(#gradBlue)" strokeWidth={2} name="Leads" />
            <Area type="monotone" dataKey="agendados" stroke="#00e09e" fill="url(#gradGreen)" strokeWidth={2} name="Agendados" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2col">
        {/* G3 - Attribution Donut */}
        <div className="glass-card">
          <div className="card-header"><span className="card-title">Atribuição: IA vs Humano</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={atribuicao} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                {atribuicao.map((_, i) => <Cell key={i} fill={COLORS_DONUT[i % COLORS_DONUT.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Classificação de Leads */}
        <div className="glass-card">
          <div className="card-header"><span className="card-title">Qualificação de Leads (Lead Score)</span></div>
          {leadClass.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={leadClass} cx="35%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {leadClass.map((d, i) => <Cell key={i} fill={d.name.includes('PRIORITÁRIO') ? '#38bdf8' : d.name.includes('POTENCIAL') ? '#818cf8' : d.name.includes('FANTASMA') ? '#a78bfa' : d.name.includes('NÃO CLASSIFICADO') ? '#6B7280' : '#d6557a'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', width: '55%' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhuma classificação disponível</p>}
        </div>
      </div>

      {/* Conversão por Perfil */}
      <div className="grid-2col">
        <div className="glass-card">
          <div className="card-header"><span className="card-title">Agendamento por Perfil</span></div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 10 }}>
            % de leads de cada classificação que chegaram a agendar
          </p>
          {agendPorPerfil.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
              {agendPorPerfil.map(d => (
                <div key={d.perfil}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.perfil}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: PERFIL_COLORS[d.perfil] }}>
                      {d.taxa}% <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>({d.agendados}/{d.total})</span>
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${d.taxa}%`, background: PERFIL_COLORS[d.perfil], transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem dados suficientes</p>}
        </div>

        <div className="glass-card">
          <div className="card-header"><span className="card-title">Comparecimento por Perfil</span></div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 10 }}>
            % dos agendados de cada classificação que efetivamente compareceram
          </p>
          {comparPorPerfil.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
              {comparPorPerfil.map(d => (
                <div key={d.perfil}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.perfil}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: PERFIL_COLORS[d.perfil] }}>
                      {d.taxa}% <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>({d.compareceu}/{d.agendados})</span>
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${d.taxa}%`, background: PERFIL_COLORS[d.perfil], transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem agendamentos suficientes</p>}
        </div>
      </div>

      {/* G5 - Funnel */}
      <div className="glass-card">
        <div className="card-header"><span className="card-title">Funil do Pipeline</span></div>
        <div className="funnel-chart">
          {funnel.map((stage, i) => {
            const pct = totalFunnel > 0 ? (stage.value / totalFunnel) * 100 : 0
            const widthPct = Math.max(30, 100 - i * 18)
            const prevVal = i > 0 ? funnel[i - 1].value : null
            const dropoff = prevVal && prevVal > 0 ? (((prevVal - stage.value) / prevVal) * 100).toFixed(0) : null
            return (
              <div key={stage.name} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {dropoff && <div className="funnel-dropoff">-{dropoff}% dropoff</div>}
                <div className="funnel-stage" style={{ width: `${widthPct}%`, background: COLORS_FUNNEL[i] }}>
                  <div className="funnel-label">
                    <span>{stage.name}</span>
                    <span>{stage.value} ({pct.toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* G6 - Recent Table */}
      <div className="glass-card">
        <div className="card-header"><span className="card-title">Últimos 10 Agendamentos</span></div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th><th>Profissional</th><th>Realizado Em</th><th>Agendado Para</th><th>Interesse</th>
              </tr>
            </thead>
            <tbody>
              {recentScheduled.map(l => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--text-primary)' }}>
                    {l.chatguru_chat ? (
                      <a href={l.chatguru_chat} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)', textDecoration: 'none', fontWeight: '500' }}>
                        {l.Nome_completo || l.telefone}
                      </a>
                    ) : (
                      l.Nome_completo || l.telefone
                    )}
                  </td>
                  <td>{l.profissional}</td>
                  <td>{l.quando_agendou ? l.quando_agendou.split('-').reverse().join('/') : '—'}</td>
                  <td>{l.agendado_para ? l.agendado_para.split('-').reverse().join('/') : '—'} {l.horario_agendamento ? `às ${l.horario_agendamento.slice(0, 5)}` : ''}</td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.interesse_ou_queixas || '—'}</td>
                </tr>
              ))}
              {recentScheduled.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--text-muted)' }}>Nenhum agendamento no período</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2col">
        {/* G4 - Handoff Reasons */}
        <div className="glass-card">
          <div className="card-header"><span className="card-title">Top 5 Motivos de Handoff</span><ArrowRightLeft size={16} className="card-icon" /></div>
          {handoffs.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={handoffs} cx="35%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {handoffs.map((_, i) => <Cell key={i} fill={['var(--neon-blue)', '#b692fe', 'var(--neon-cyan)', 'var(--neon-mint)', 'var(--text-secondary)', '#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6', '#10b981'][i % 10]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', width: '55%' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhum handoff registrado no período</p>}
        </div>

        {/* Motivos de Perda */}
        <div className="glass-card">
          <div className="card-header"><span className="card-title">Motivos de Perda (Categorias)</span></div>
          {lostReasons.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={lostReasons} cx="35%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {lostReasons.map((_, i) => <Cell key={i} fill={['var(--neon-rose)', 'var(--neon-blue)', 'var(--neon-cyan)', 'var(--neon-mint)', 'var(--text-secondary)', '#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6', '#10b981'][i % 10]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', width: '55%' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhuma perda registrada com motivo no período</p>}
        </div>
      </div>
    </>
  )
}
