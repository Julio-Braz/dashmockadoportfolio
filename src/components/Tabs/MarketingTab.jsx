import { useMemo } from 'react'
import { Banknote, MonitorPlay, Activity, Trophy } from 'lucide-react'
import { getOrigemPerformance, getRoiPorCanal, isLeadPago } from '../../utils/calculations'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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

export default function MarketingTab({ leads }) {
  const receita = useMemo(() => {
    const vals = leads.filter(l => l.valor_fechado != null).map(l => l.valor_fechado)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : 0
  }, [leads])

  const leadsAds = useMemo(() => leads.filter(isLeadPago).length, [leads])

  const convOrg = useMemo(() => {
    const semUtm = leads.filter(l => !isLeadPago(l))
    const pago = leads.filter(isLeadPago)
    const rSem = semUtm.length > 0 ? ((semUtm.filter(l => l.status_agendado).length / semUtm.length) * 100).toFixed(0) : '0'
    const rPago = pago.length > 0 ? ((pago.filter(l => l.status_agendado).length / pago.length) * 100).toFixed(0) : '0'
    return `${rSem}% / ${rPago}%`
  }, [leads])

  const origemData = useMemo(() => getOrigemPerformance(leads), [leads])

  // ROI consolidado por canal (tag_origem > utm_source > Orgânico/Direto)
  const roiCanais = useMemo(() => getRoiPorCanal(leads), [leads])
  const maxReceita = useMemo(() => Math.max(...roiCanais.map(r => r.receita), 1), [roiCanais])

  // Campanhas UTM identificadas (só linhas onde utm_campaign veio preenchido)
  const utmCampanhas = useMemo(() => {
    const map = {}
    leads.forEach(l => {
      if (!l.utm_campaign) return
      const key = `${l.utm_source || '—'}|${l.utm_campaign}`
      if (!map[key]) map[key] = { source: l.utm_source || '—', campaign: l.utm_campaign, leads: 0, agendados: 0, receita: 0 }
      map[key].leads++
      if (l.status_agendado) map[key].agendados++
      if (l.valor_fechado) map[key].receita += l.valor_fechado
    })
    return Object.values(map).sort((a, b) => b.receita - a.receita || b.leads - a.leads)
  }, [leads])

  // Ad previews
  const adPreviews = useMemo(() => {
    const map = {}
    leads.forEach(l => {
      const content = l.utm_content_atualizado || l.utm_content
      if (!content) return
      if (!map[content]) map[content] = { url: content, image: l.utm_image, leads: 0, agendados: 0 }
      map[content].leads++
      if (l.status_agendado) map[content].agendados++
    })
    return Object.values(map).sort((a, b) => b.leads - a.leads)
  }, [leads])

  return (
    <>
      <div className="grid-kpi" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KPICard icon={Banknote} label="Receita Total" value={receita > 0 ? `R$ ${receita.toLocaleString('pt-BR')}` : '—'} color="var(--neon-cyan)" tooltip="Soma do valor fechado de todos os leads neste período" />
        <KPICard icon={MonitorPlay} label="Leads via Ads" value={leadsAds} color="var(--neon-blue)" tooltip="Leads com alguma UTM preenchida (comprovadamente pagos)" />
        <KPICard icon={Activity} label="Conv. Sem UTM / Via Ads" value={convOrg} color="var(--text-primary)" tooltip="Taxa de agendamento: leads sem UTM vs leads de anúncios. Sem UTM não garante orgânico" />
      </div>

      <div className="glass-card full-width">
        <div className="card-header"><span className="card-title">Performance por Origem</span></div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={origemData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
            <Bar dataKey="agendou" stackId="a" fill="var(--neon-cyan)" name="Agendou" radius={[0, 0, 0, 0]} />
            <Bar dataKey="naoAgendou" stackId="a" fill="rgba(255,255,255,0.1)" name="Não Agendou" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card full-width">
        <div className="card-header">
          <span className="card-title">ROI por Canal de Origem</span>
          <Trophy size={16} className="card-icon" />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
          Funil completo por canal: Leads → Agendados → Compareceram → Receita, ordenado pelo que gera mais retorno.
          "Via Ads" = leads com alguma UTM preenchida (comprovadamente pagos); os demais não dá para garantir que são orgânicos.
        </p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Canal</th><th>Leads</th><th>Via Ads</th>
                <th>Agendados</th><th>Tx. Agend.</th>
                <th>Compareceram</th><th>Tx. Compar.</th>
                <th>Receita</th><th>Ticket Médio</th><th>R$ / Lead</th>
              </tr>
            </thead>
            <tbody>
              {roiCanais.map((r, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {r.canal}
                    {r.receita > 0 && (
                      <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', maxWidth: 120 }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${(r.receita / maxReceita) * 100}%`, background: 'linear-gradient(90deg, #34D399, #22d3ee)' }} />
                      </div>
                    )}
                  </td>
                  <td>{r.leads}</td>
                  <td>
                    {r.pagos > 0 ? (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(96,165,250,0.12)', color: '#60A5FA'
                      }}>{r.pagos} pago{r.pagos > 1 ? 's' : ''}</span>
                    ) : '—'}
                  </td>
                  <td>{r.agendados}</td>
                  <td>{r.taxaAgendamento.toFixed(0)}%</td>
                  <td style={{ color: r.ganhos > 0 ? '#22d3ee' : undefined }}>{r.ganhos}</td>
                  <td>{r.agendados > 0 ? `${r.taxaComparecimento.toFixed(0)}%` : '—'}</td>
                  <td style={{ color: r.receita > 0 ? '#34D399' : undefined, fontWeight: r.receita > 0 ? 600 : 400 }}>
                    {r.receita > 0 ? `R$ ${r.receita.toLocaleString('pt-BR')}` : '—'}
                  </td>
                  <td>{r.ticketMedio > 0 ? `R$ ${Math.round(r.ticketMedio).toLocaleString('pt-BR')}` : '—'}</td>
                  <td>{r.receitaPorLead > 0 ? `R$ ${Math.round(r.receitaPorLead).toLocaleString('pt-BR')}` : '—'}</td>
                </tr>
              ))}
              {roiCanais.length === 0 && (
                <tr><td colSpan={10} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Nenhum lead no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {utmCampanhas.length > 0 && (
        <div className="glass-card full-width">
          <div className="card-header"><span className="card-title">Campanhas UTM Identificadas</span></div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
            Somente leads com utm_campaign preenchido aparecem aqui.
          </p>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Source</th><th>Campaign</th><th>Leads</th><th>Agendados</th><th>Taxa</th><th>Receita</th></tr></thead>
              <tbody>
                {utmCampanhas.map((r, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-primary)' }}>{r.source}</td>
                    <td>{r.campaign}</td>
                    <td>{r.leads}</td><td>{r.agendados}</td>
                    <td>{r.leads > 0 ? `${((r.agendados / r.leads) * 100).toFixed(0)}%` : '0%'}</td>
                    <td>{r.receita > 0 ? `R$ ${r.receita.toLocaleString('pt-BR')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adPreviews.length > 0 && (
        <div className="glass-card full-width">
          <div className="card-header"><span className="card-title">Preview de Anúncios</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {adPreviews.map((ad, i) => (
              <a key={i} href={ad.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', padding: 14, textDecoration: 'none', transition: 'all 0.3s ease-out' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                {ad.image && <img src={ad.image} alt="Ad" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} onError={e => e.currentTarget.style.display = 'none'} />}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.url}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="lead-card-badge">{ad.leads} leads</span>
                  <span className="lead-card-badge" style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399' }}>
                    {ad.leads > 0 ? `${((ad.agendados / ad.leads) * 100).toFixed(0)}%` : '0%'} conv.
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
