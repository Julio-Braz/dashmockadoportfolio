import { useMemo } from 'react'
import { getIdadeFaixas, getWordCloudData, countByField } from '../../utils/calculations'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Treemap } from 'recharts'

const PROF_COLORS = ['var(--neon-blue)', 'var(--neon-cyan)', 'var(--neon-purple)', '#ffffff', 'var(--text-secondary)', 'var(--neon-rose)']

function AndroidIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#3DDC84">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zm-2.5-10C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84 1.3-1.3a.496.496 0 0 0-.71-.71l-1.48 1.48A5.97 5.97 0 0 0 12 1c-1.1 0-2.15.23-3.09.63L7.43.15a.496.496 0 0 0-.71.71l1.3 1.3C6.01 3.07 5 4.9 5 7h14c0-2.1-1.01-3.93-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
    </svg>
  )
}

function AppleIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#C0C0C0">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function WebIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}

const DEVICE_GROUPS = [
  { key: 'android', label: 'Android', color: '#3DDC84', icon: AndroidIcon, match: v => /android/i.test(v) },
  { key: 'apple',   label: 'iOS / Apple', color: '#C0C0C0', icon: AppleIcon, match: v => /ios|iphone|ipad|apple|mac/i.test(v) },
  { key: 'web',     label: 'Web',  color: '#60A5FA', icon: WebIcon,    match: v => /web|browser|desktop|chrome|safari|firefox/i.test(v) },
]

function getDeviceData(leads) {
  const counts = { android: 0, apple: 0, web: 0, outro: 0 }
  leads.forEach(l => {
    const v = String(l.Dispositivo || l.dispositivo || '').trim()
    if (!v) return
    const group = DEVICE_GROUPS.find(g => g.match(v))
    if (group) counts[group.key]++
    else counts.outro++
  })
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { counts, total }
}

export default function LeadProfileTab({ leads }) {
  const idadeFaixas = useMemo(() => getIdadeFaixas(leads), [leads])
  const wordData = useMemo(() => getWordCloudData(leads), [leads])
  const bairros = useMemo(() => countByField(leads.filter(l => l.bairro), 'bairro').slice(0, 10), [leads])
  const profissionais = useMemo(() => countByField(leads, 'profissional'), [leads])
  const deviceData = useMemo(() => getDeviceData(leads), [leads])

  const maxWordVal = wordData.length > 0 ? wordData[0].value : 1

  return (
    <>
      <div className="grid-2col">
        {/* G20 - Age Histogram */}
        <div className="glass-card stagger-1">
          <div className="card-header"><span className="card-title">Faixa Etária</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={idadeFaixas}>
              <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
              <Bar dataKey="agendou" stackId="a" fill="var(--neon-cyan)" name="Agendou" radius={[0, 0, 0, 0]} />
              <Bar dataKey="naoAgendou" stackId="a" fill="rgba(255,255,255,0.1)" name="Não Agendou" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* G21 - Word Cloud (CSS-based) */}
        <div className="glass-card stagger-2">
          <div className="card-header"><span className="card-title">Interesses e Queixas</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', alignItems: 'center', justifyContent: 'center', padding: '16px 0', minHeight: 220 }}>
            {wordData.length > 0 ? wordData.map((w, i) => {
              const size = 0.7 + (w.value / maxWordVal) * 1.3
              const opacity = 0.5 + (w.value / maxWordVal) * 0.5
              const colors = ['var(--neon-cyan)', 'var(--neon-blue)', '#ffffff', 'var(--text-secondary)', 'var(--neon-purple)']
              return (
                <span key={i} title={`${w.text}: ${w.value}x`} style={{
                  fontSize: `${size}rem`, fontWeight: size > 1.2 ? 600 : 400,
                  color: colors[i % colors.length], opacity, cursor: 'default',
                  transition: 'transform 0.2s ease', lineHeight: 1.2,
                }}
                  onMouseOver={e => e.target.style.transform = 'scale(1.15)'}
                  onMouseOut={e => e.target.style.transform = 'scale(1)'}>
                  {w.text}
                </span>
              )
            }) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem dados de interesses</p>}
          </div>
        </div>
      </div>

      {/* Dispositivos */}
      <div className="glass-card stagger-3">
          <div className="card-header"><span className="card-title">Dispositivo do Cliente</span></div>
          {deviceData.total === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8 }}>
              Sem dados de dispositivo — verifique se a coluna <code>dispositivo</code> existe e está preenchida na tabela.
            </p>
          )}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 0 4px' }}>
            {DEVICE_GROUPS.map(g => {
              const count = deviceData.counts[g.key]
              const pct = deviceData.total > 0 ? (count / deviceData.total) * 100 : 0
              const Icon = g.icon
              return (
                <div key={g.key} style={{ flex: '1 1 140px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${g.color}30`, borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={30} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{g.label}</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: g.color, lineHeight: 1 }}>
                    {pct.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{count} leads</div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: g.color, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              )
            })}
            {deviceData.counts.outro > 0 && (
              <div style={{ flex: '1 1 140px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Outro</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-muted)', lineHeight: 1 }}>
                  {((deviceData.counts.outro / deviceData.total) * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{deviceData.counts.outro} leads</div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${(deviceData.counts.outro / deviceData.total) * 100}%`, background: 'var(--text-muted)' }} />
                </div>
              </div>
            )}
          </div>
        </div>

      <div className="grid-2col">
        {/* G22 - Top Bairros */}
        <div className="glass-card stagger-3">
          <div className="card-header"><span className="card-title">Top 10 Bairros</span></div>
          {bairros.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bairros} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                <Bar dataKey="value" fill="var(--neon-cyan)" radius={[0, 6, 6, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sem dados de bairro</p>}
        </div>

        {/* G23 - By Professional */}
        <div className="glass-card stagger-4">
          <div className="card-header"><span className="card-title">Distribuição por Profissional</span></div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={profissionais} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {profissionais.map((_, i) => <Cell key={i} fill={PROF_COLORS[i % PROF_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}
