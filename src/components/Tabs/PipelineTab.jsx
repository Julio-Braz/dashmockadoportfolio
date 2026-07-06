import { useState, useMemo, useRef } from 'react'
import { MessageSquare, Download, Search, Stethoscope, CalendarCheck, MapPin } from 'lucide-react'
import { exportToCSV } from '../../utils/csvExport'

const STAGES = ['Contato Inicial', 'Coleta de Dados', 'Em Qualificação', 'Agendado', 'Compareceu (Ganho)', 'Não Compareceu (Reagendar)', 'Perdido']
const STAGE_COLORS = {
  'Contato Inicial': '#94A3B8',
  'Coleta de Dados': '#60A5FA',
  'Em Qualificação': '#67E8F9',
  'Agendado': '#34D399',
  'Compareceu (Ganho)': '#22d3ee',
  'Não Compareceu (Reagendar)': '#fbbf24',
  'Perdido': '#b692fe'
}

function deriveStage(lead) {
  if (lead.stage_pipeline === 'Agendado') {
    const comp = String(lead.status_comparecimento ?? '').toUpperCase()
    if (comp === 'CONFIRMADO_PACIENTE' || comp === 'FINALIZADO') return 'Compareceu (Ganho)'
    if (comp === 'CANCELADO_PACIENTE' || comp === 'FALTOU' || comp === 'CANCELADO' || comp === 'CANELADO') return 'Não Compareceu (Reagendar)'
  }
  return lead.stage_pipeline
}

export default function PipelineTab({ leads, allLeads, filters }) {
  const [search, setSearch] = useState('')
  const boardRef = useRef(null)
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0 })

  // Pipeline uses all leads but respects non-pipeline filters
  const kanbanLeads = useMemo(() => {
    const s = search.toLowerCase()
    return leads.filter(l => {
      if (!s) return true
      const nome = String(l.Nome_completo ?? '').toLowerCase()
      const tel = String(l.telefone ?? '')
      return nome.includes(s) || tel.includes(s)
    })
  }, [leads, search])

  const columns = useMemo(() => {
    return STAGES.map(stage => ({
      stage,
      color: STAGE_COLORS[stage],
      leads: kanbanLeads.filter(l => deriveStage(l) === stage),
    }))
  }, [kanbanLeads])

  const totalFiltered = kanbanLeads.length

  // Progress bar
  const progressData = columns.map(c => ({ name: c.stage, value: c.leads.length, color: c.color }))

  return (
    <>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="search-wrap">
          <Search size={16} />
          <input type="text" autoComplete="off" className="search-input" placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-export" onClick={() => exportToCSV(kanbanLeads)}>
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Progress bar */}
      <div className="glass-card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="card-title">Distribuição do Pipeline</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{totalFiltered} leads</span>
        </div>
        <div className="progress-bar">
          {progressData.map(p => {
            const pct = totalFiltered > 0 ? (p.value / totalFiltered) * 100 : 0
            if (pct === 0) return null
            return (
              <div key={p.name} className="progress-segment" style={{ width: `${pct}%`, background: p.color }}>
                {pct > 12 ? `${p.name} (${p.value})` : p.value}
              </div>
            )
          })}
        </div>
      </div>

      {/* Kanban Board */}
      <div
        className="kanban-board"
        ref={boardRef}
        onMouseDown={e => {
          dragState.current = { active: true, startX: e.pageX - boardRef.current.offsetLeft, scrollLeft: boardRef.current.parentElement.scrollLeft }
          boardRef.current.classList.add('is-dragging')
        }}
        onMouseMove={e => {
          if (!dragState.current.active) return
          e.preventDefault()
          const x = e.pageX - boardRef.current.offsetLeft
          const walk = (x - dragState.current.startX) * 1.5
          boardRef.current.parentElement.scrollLeft = dragState.current.scrollLeft - walk
        }}
        onMouseUp={() => { dragState.current.active = false; boardRef.current.classList.remove('is-dragging') }}
        onMouseLeave={() => { dragState.current.active = false; boardRef.current?.classList.remove('is-dragging') }}
      >
        {columns.map(col => (
          <div key={col.stage} className="kanban-column">
            <div className="kanban-col-header">
              <span className="kanban-col-title" style={{ color: col.color }}>{col.stage}</span>
              <span className="kanban-col-count">{col.leads.length}</span>
            </div>
            <div className="kanban-cards">
              {col.leads.map(lead => (
                <div key={lead.id} className={`lead-card ${lead.fez_tratamento_antes === true ? 'hot' : lead.fez_tratamento_antes === false ? 'cold' : ''}`}>
                  <div className="lead-card-name">{lead.Nome_completo || lead.telefone || 'Lead sem nome'}</div>

                  {lead.profissional && (
                    <div className="lead-card-detail">
                      <Stethoscope /> {lead.profissional}
                    </div>
                  )}

                  {lead.agendado_para && (
                    <div className="lead-card-detail">
                      <CalendarCheck />
                      {String(lead.agendado_para).split('-').reverse().join('/')}
                      {lead.horario_agendamento ? ` às ${String(lead.horario_agendamento).slice(0, 5)}` : ''}
                    </div>
                  )}

                  {lead.bairro && (
                    <div className="lead-card-detail">
                      <MapPin /> {lead.bairro}
                    </div>
                  )}

                  {lead.tag_interesse_queixa && (
                    <span className="lead-card-badge">{lead.tag_interesse_queixa}</span>
                  )}

                  {col.stage === 'Compareceu (Ganho)' && (
                    <div style={{ marginTop: 8, padding: 6, background: 'rgba(52,211,153,0.1)', borderLeft: '2px solid #34D399', borderRadius: 4, fontSize: '0.72rem', color: '#34D399', fontWeight: 600 }}>
                      {lead.valor_fechado != null
                        ? `Venda: R$ ${Number(lead.valor_fechado).toLocaleString('pt-BR')}`
                        : 'Venda: valor não informado'}
                    </div>
                  )}

                  {lead.lost_reason_category && lead.stage_pipeline === 'Perdido' && (
                    <div style={{ marginTop: 8, padding: 6, background: 'rgba(182,146,254,0.1)', borderLeft: '2px solid #b692fe', borderRadius: 4, fontSize: '0.7rem', color: '#b692fe' }}>
                      <strong style={{ display: 'block', marginBottom: 2 }}>Motivo da Perda:</strong>
                      {lead.lost_reason_category}
                    </div>
                  )}

                  <div className="lead-card-actions">
                    {lead.chatguru_chat && (
                      <a href={lead.chatguru_chat} target="_blank" rel="noopener noreferrer" className="lead-card-btn" title="Abrir conversa no CRM (demo)">
                        <MessageSquare />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {col.leads.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: 20 }}>Nenhum lead</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
