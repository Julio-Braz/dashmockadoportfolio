import { useMemo } from 'react'
import { Bot, Activity, MessagesSquare } from 'lucide-react'
import { getMsgFaixas, getTempoFaixas, getScatterData, countByField, getGoldenHour, getGoldenDay, getCommercialHours } from '../../utils/calculations'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid, ZAxis, PieChart, Pie, Cell, Legend } from 'recharts'

function KPICard({ icon: Icon, label, value, color, tooltip }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon-wrap" style={{ background: `linear-gradient(135deg, ${color}20, ${color}05)` }}>
        <Icon style={{ color }} size={22} strokeWidth={1.5} />
      </div>
      <div className="kpi-info">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" style={{ color }}>{value}</div>
        {tooltip && <div className="kpi-desc">{tooltip}</div>}
      </div>
    </div>
  )
}

export default function AIPerformanceTab({ leads }) {
  const validLeads = useMemo(() => leads.filter(l => l.lost_reason_category !== 'Não é lead'), [leads])

  const iaAgendou = useMemo(() => validLeads.filter(l => l.status_agendado === true && l.quem_fez_o_agendamento === 'IA').length, [validLeads])
  const totalAgendou = useMemo(() => validLeads.filter(l => l.status_agendado === true).length, [validLeads])
  const taxaResolucao = totalAgendou > 0 ? ((iaAgendou / totalAgendou) * 100).toFixed(0) : '0'

  const avgMsgConv = useMemo(() => {
    const arr = validLeads.filter(l => l.status_agendado === true && l.quantidade_mensagens_enviadas)
    return arr.length > 0 ? (arr.reduce((a, b) => a + b.quantidade_mensagens_enviadas, 0) / arr.length).toFixed(1) : '0'
  }, [validLeads])

  const avgMsgNao = useMemo(() => {
    const arr = validLeads.filter(l => l.status_agendado !== true && l.quantidade_mensagens_enviadas)
    return arr.length > 0 ? (arr.reduce((a, b) => a + b.quantidade_mensagens_enviadas, 0) / arr.length).toFixed(1) : '0'
  }, [validLeads])

  const msgFaixas = useMemo(() => getMsgFaixas(validLeads), [validLeads])
  const tempoFaixas = useMemo(() => getTempoFaixas(validLeads), [validLeads])
  const scatterData = useMemo(() => getScatterData(validLeads), [validLeads])
  const handoffs = useMemo(() => countByField(validLeads.filter(l => l.handoff_category), 'handoff_category'), [validLeads])
  const goldenHourData = useMemo(() => getGoldenHour(validLeads), [validLeads])
  const goldenDayData = useMemo(() => getGoldenDay(validLeads), [validLeads])
  const commercialData = useMemo(() => getCommercialHours(validLeads), [validLeads])

  return (
    <>
      <div className="grid-kpi" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KPICard icon={Bot} label="Agendamentos IA" value={iaAgendou} color="var(--neon-cyan)" tooltip="Número de agendamentos realizados exclusivamente pela IA" />
        <KPICard icon={Activity} label="Taxa Resolução" value={`${taxaResolucao}%`} color="var(--neon-blue)" tooltip="Porcentagem dos agendamentos totais que foram feitos pela IA" />
        <KPICard icon={MessagesSquare} label="Msgs (Converteu)" value={avgMsgConv} color="var(--text-primary)" tooltip="Média de mensagens trocadas com leads que acabaram agendando" />
        <KPICard icon={MessagesSquare} label="Msgs (Não Conv.)" value={avgMsgNao} color="var(--text-secondary)" tooltip="Média de mensagens trocadas com leads que NÃO agendaram" />
      </div>

      <div className="grid-2col">
        <div className="glass-card">
          <div className="card-header"><span className="card-title">Esforço de Conversão por Faixa de Mensagens</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={msgFaixas}>
              <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
              <Bar dataKey="agendou" fill="var(--neon-cyan)" radius={[6, 6, 0, 0]} name="Agendou" />
              <Bar dataKey="naoAgendou" fill="rgba(255,255,255,0.1)" radius={[6, 6, 0, 0]} name="Não Agendou" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <div className="card-header"><span className="card-title">Distribuição de Tempo para Agendar</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tempoFaixas}>
              <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }} />
              <Bar dataKey="count" fill="#00d4ff" radius={[6, 6, 0, 0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2col">
        <div className="glass-card">
          <div className="card-header"><span className="card-title">Motivos de Handoff (Completo)</span></div>
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
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhum handoff registrado</p>}
        </div>

        <div className="glass-card">
          <div className="card-header"><span className="card-title">Mensagens × Tempo (Scatter)</span></div>
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mensagens" name="Mensagens" tick={{ fontSize: 11 }} />
                <YAxis dataKey="tempo" name="Tempo (h)" tick={{ fontSize: 11 }} />
                <ZAxis range={[60, 60]} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
                  formatter={(v, n) => [n === 'Mensagens' ? v : `${v}h`, n]} />
                <Scatter data={scatterData} fill="#4d9fff" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Dados insuficientes</p>}
        </div>
      </div>

      <div className="grid-2col">
        <div className="glass-card">
          <div className="card-header"><span className="card-title">Golden Hour (Horários de Agendamento)</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={goldenHourData}>
              <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }} />
              <Bar dataKey="agendamentos" fill="var(--neon-blue)" radius={[4, 4, 0, 0]} name="Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <div className="card-header"><span className="card-title">Golden Day (Dias de Agendamento)</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={goldenDayData}>
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }} />
              <Bar dataKey="agendamentos" fill="var(--neon-cyan)" radius={[4, 4, 0, 0]} name="Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card">
        <div className="card-header">
          <span className="card-title">Agendamentos Realizados: Horário Comercial vs Fora do Horário</span>
        </div>
        <div style={{ padding: '0 1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          *Feriados (municipais/estaduais/federais) e fins de semana contabilizados como fora do horário comercial
        </div>
        {commercialData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={commercialData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value" label>
                {commercialData.map((_, i) => <Cell key={i} fill={['var(--neon-blue)', 'var(--neon-cyan)'][i % 2]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>Dados insuficientes</p>}
      </div>
    </>
  )
}
