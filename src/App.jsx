import { useState, useMemo, useEffect } from 'react'
import { LayoutDashboard, Megaphone, SlidersHorizontal, FilterX, Bot, Users, UserCircle, HeartPulse, Sparkles } from 'lucide-react'
import { filterLeads, getUniqueProfissionais, getUniqueOrigens, getUniqueUtmSources } from './utils/calculations'
import {
  getMockLeads, getMockMetaInsights, getMockMetaAdMap,
  getMockGoogleInsights, getMockGoogleKeywords, getMockGoogleSearchTerms,
} from './utils/mockData'
import logoDarkImg from './assets/clinic_flow.png'
import OverviewTab from './components/Tabs/OverviewTab'
import AIPerformanceTab from './components/Tabs/AIPerformanceTab'
import MarketingTab from './components/Tabs/MarketingTab'
import PipelineTab from './components/Tabs/PipelineTab'
import LeadProfileTab from './components/Tabs/LeadProfileTab'
import DadosMetaTab from './components/Tabs/DadosMetaTab'
import DadosGoogleTab from './components/Tabs/DadosGoogleTab'
import PacientesTab from './components/Tabs/PacientesTab'



const STAGES = ['Contato Inicial', 'Coleta de Dados', 'Em Qualificação', 'Agendado', 'Perdido']

// Ícones oficiais das plataformas, monocromáticos no tom do design system.
// "G" do Google (path oficial) — currentColor herda a cor do style.
function GoogleIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  )
}
// Logo da Meta (infinito oficial)
function MetaIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z" />
    </svg>
  )
}

const defaultFilters = {
  dateFrom: '', dateTo: '',         // Data de cadastro
  scheduleDateFrom: '', scheduleDateTo: '',  // Data de agendamento
  stages: [], profissional: 'Todos',
  comparecimento: 'Todos', origem: 'Todos', utmSource: 'Todos',
  utmCampaign: 'Todos', perfilLead: 'Todos',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters] = useState(defaultFilters)
  const [leadsRaw, setLeadsRaw] = useState([])
  const [metaInsights, setMetaInsights] = useState([])
  const [metaAdMap, setMetaAdMap] = useState([])
  const [googleInsights, setGoogleInsights] = useState([])
  const [googleKeywords, setGoogleKeywords] = useState([])
  const [googleSearchTerms, setGoogleSearchTerms] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Dados 100% mockados, gerados no cliente — o pequeno atraso mantém a
    // experiência da tela de carregamento premium do dashboard real.
    const t = setTimeout(() => {
      setLeadsRaw(getMockLeads())
      setMetaInsights(getMockMetaInsights())
      setMetaAdMap(getMockMetaAdMap())
      setGoogleInsights(getMockGoogleInsights())
      setGoogleKeywords(getMockGoogleKeywords())
      setGoogleSearchTerms(getMockGoogleSearchTerms())
      setIsLoading(false)
    }, 700)
    return () => clearTimeout(t)
  }, [])

  const profissionais = useMemo(() => getUniqueProfissionais(leadsRaw), [leadsRaw])
  const origens = useMemo(() => getUniqueOrigens(leadsRaw), [leadsRaw])
  const utmSources = useMemo(() => getUniqueUtmSources(leadsRaw), [leadsRaw])

  const filteredLeads = useMemo(() => filterLeads(leadsRaw, filters), [leadsRaw, filters])

  const toggleStage = (s) => {
    setFilters(prev => {
      const has = prev.stages.includes(s)
      return { ...prev, stages: has ? prev.stages.filter(x => x !== s) : [...prev.stages, s] }
    })
  }

  const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const clearFilters = () => setFilters(defaultFilters)
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(defaultFilters)

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab leads={filteredLeads} />
      case 'ai': return <AIPerformanceTab leads={filteredLeads} />
      case 'marketing': return <MarketingTab leads={filteredLeads} />
      case 'pipeline': return <PipelineTab leads={filteredLeads} allLeads={leadsRaw} filters={filters} />
      case 'profile': return <LeadProfileTab leads={filteredLeads} />
      case 'meta': return <DadosMetaTab leads={filteredLeads} allLeads={leadsRaw} metaInsights={metaInsights} metaAdMap={metaAdMap} filters={filters} />
      case 'google': return <DadosGoogleTab leads={filteredLeads} allLeads={leadsRaw} googleInsights={googleInsights} googleKeywords={googleKeywords} googleSearchTerms={googleSearchTerms} />
      case 'pacientes': return <PacientesTab />
      default: return null
    }
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw',
        background: '#000000',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle glow orbs */}
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
          top: '10%', right: '10%', filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)',
          bottom: '10%', left: '10%', filter: 'blur(80px)',
        }} />

        {/* Logo watermark */}
        <img src={logoDarkImg} alt="" style={{
          position: 'absolute', width: '55%', opacity: 0.04,
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', filter: 'grayscale(100%)',
        }} />

        {/* Center content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
          {/* Animated ring */}
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.08)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: 'rgba(186,230,253,0.8)',
              borderRightColor: 'rgba(186,230,253,0.3)',
              animation: 'spin 1.2s linear infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 8, borderRadius: '50%',
              border: '1px solid rgba(129,140,248,0.3)',
              animation: 'spin 2s linear infinite reverse',
            }} />
          </div>

          {/* Pulsing dots */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === 0 ? 'rgba(186,230,253,0.9)' : i === 1 ? 'rgba(186,230,253,0.5)' : 'rgba(186,230,253,0.2)',
                animation: `pulse 1.4s ${i * 0.2}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.4); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="app-layout">

      {/* Background Watermark */}
      <div className="bg-watermark">
        <img src={logoDarkImg} alt="" />
      </div>
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Sidebar */}
      <aside className="app-sidebar">
        <nav className="sidebar-nav">
          <div className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard size={20} />
            <span className="sidebar-item-text">Visão Geral</span>
          </div>
          <div className={`sidebar-item ${activeTab === 'pipeline' ? 'active' : ''}`} onClick={() => setActiveTab('pipeline')}>
            <Users size={20} />
            <span className="sidebar-item-text">Pipeline de Vendas</span>
            {filteredLeads.length > 0 && <span className="sidebar-badge">{filteredLeads.length}</span>}
          </div>
          <div className={`sidebar-item ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
            <Bot size={20} />
            <span className="sidebar-item-text">Performance IA</span>
          </div>
          <div className={`sidebar-item ${activeTab === 'marketing' ? 'active' : ''}`} onClick={() => setActiveTab('marketing')}>
            <Megaphone size={20} />
            <span className="sidebar-item-text">Marketing & UTMs</span>
          </div>
          <div className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <UserCircle size={20} />
            <span className="sidebar-item-text">Perfil do Lead</span>
          </div>

          <div className={`sidebar-item ${activeTab === 'meta' ? 'active' : ''}`} onClick={() => setActiveTab('meta')}>
            <MetaIcon size={20} color="var(--neon-mint)" />
            <span className="sidebar-item-text" style={{ color: 'var(--neon-mint)' }}>Dados Meta</span>
          </div>

          <div className={`sidebar-item ${activeTab === 'google' ? 'active' : ''}`} onClick={() => setActiveTab('google')}>
            <GoogleIcon size={20} color="var(--neon-mint)" />
            <span className="sidebar-item-text" style={{ color: 'var(--neon-mint)' }}>Dados Google</span>
          </div>

          <div className={`sidebar-item ${activeTab === 'pacientes' ? 'active' : ''}`} onClick={() => setActiveTab('pacientes')}>
            <HeartPulse size={20} color="var(--neon-mint)" />
            <span className="sidebar-item-text" style={{ color: 'var(--neon-mint)' }}>Pacientes</span>
          </div>

          <div className="sidebar-item" style={{ marginTop: 'auto', cursor: 'default', color: 'var(--neon-cyan)' }} title="Ambiente de demonstração — todos os dados são fictícios, gerados por algoritmo">
            <Sparkles size={20} />
            <span className="sidebar-item-text">Demo · dados fictícios</span>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">

        {/* Topbar Filters (oculta nas abas Dados Meta/Google, que têm filtro de mês próprio) */}
        <div className="topbar" style={{ display: activeTab === 'meta' || activeTab === 'google' || activeTab === 'pacientes' ? 'none' : undefined }}>
          <div className="topbar-left">
            <SlidersHorizontal size={18} style={{ color: 'var(--text-muted)' }} />
            <h2 className="topbar-title">Filtros de Dados</h2>
          </div>

          <div className="filter-scroll">
            {/* --- Data de Cadastro --- */}
            <div className="filter-group">
              <span className="filter-label" style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cadastro</span>
              <input type="date" className="filter-input" value={filters.dateFrom}
                onChange={e => updateFilter('dateFrom', e.target.value)} />
              <span className="filter-label">até</span>
              <input type="date" className="filter-input" value={filters.dateTo}
                onChange={e => updateFilter('dateTo', e.target.value)} />
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            {/* --- Data de Agendamento --- */}
            <div className="filter-group">
              <span className="filter-label" style={{ color: 'var(--neon-cyan)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Agendamento</span>
              <input type="date" className="filter-input" style={{ borderColor: 'rgba(56,189,248,0.3)' }} value={filters.scheduleDateFrom}
                onChange={e => updateFilter('scheduleDateFrom', e.target.value)} />
              <span className="filter-label">até</span>
              <input type="date" className="filter-input" style={{ borderColor: 'rgba(56,189,248,0.3)' }} value={filters.scheduleDateTo}
                onChange={e => updateFilter('scheduleDateTo', e.target.value)} />
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            <div className="filter-group" style={{ gap: '4px' }}>
              {STAGES.map(s => (
                <button key={s} className={`filter-chip ${filters.stages.includes(s) ? 'active' : ''}`}
                  onClick={() => toggleStage(s)}>{s}</button>
              ))}
            </div>

            <select className="filter-select" value={filters.profissional}
              onChange={e => updateFilter('profissional', e.target.value)}>
              <option value="Todos">Profissional</option>
              {profissionais.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select className="filter-select" value={filters.comparecimento}
              onChange={e => updateFilter('comparecimento', e.target.value)}>
              <option value="Todos">Comparecimento</option>
              <option value="Compareceu">Compareceu</option>
              <option value="Não Compareceu">Não Compareceu</option>
              <option value="Pendente">Pendente</option>
            </select>

            <select className="filter-select" value={filters.origem}
              onChange={e => updateFilter('origem', e.target.value)}>
              <option value="Todos">Canal</option>
              {origens.map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            <select className="filter-select" value={filters.utmSource}
              onChange={e => updateFilter('utmSource', e.target.value)}>
              <option value="Todos">Fonte UTM</option>
              {utmSources.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <select className="filter-select" value={filters.perfilLead}
              onChange={e => updateFilter('perfilLead', e.target.value)}>
              <option value="Todos">Perfil do Lead</option>
              <option value="LEAD PRIORITÁRIO">Prioritário</option>
              <option value="LEAD POTENCIAL">Potencial</option>
              <option value="LEAD PERFIL FORA / BAIXO FIT">Perfil Fora / Baixo Fit</option>
              <option value="LEAD FANTASMA">Fantasma</option>
              <option value="NÃO CLASSIFICADO">Não Classificado</option>
            </select>

            {hasActiveFilters && (
              <button className="btn-clear-filters" onClick={clearFilters}>
                <FilterX size={14} /> Limpar
              </button>
            )}
          </div>

          <div className="filter-counter">
            <strong>{filteredLeads.length}</strong> leads
          </div>
        </div>

        {/* Tab View */}
        <div className={`tab-content-wrapper${activeTab === 'pipeline' ? ' pipeline-view' : ''}`}>
          <div className="tab-content" key={activeTab}>
            {renderTab()}
          </div>
        </div>
      </main>

    </div>
  )
}
