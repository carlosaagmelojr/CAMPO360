import { useState, useEffect } from 'react'
import { DB, STATUS, EQUIPES_DEFAULT, fmt } from './db'

const CORES = ['#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#60a5fa', '#f472b6', '#facc15']

export default function MapaVivo() {
  const [equipes, setEquipes] = useState(() => DB.get('equipes', EQUIPES_DEFAULT))
  const [locs, setLocs]       = useState(() => DB.get('localizacoes', {}))
  const [os, setOs]           = useState(() => DB.get('os', []))
  const [tick, setTick]       = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setEquipes(DB.get('equipes', EQUIPES_DEFAULT))
      setLocs(DB.get('localizacoes', {}))
      setOs(DB.get('os', []))
      setTick(n => n + 1)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const isOnline = (eq) => {
    const loc = locs[eq.id]
    return loc && (Date.now() - new Date(loc.ts).getTime()) < 10 * 60 * 1000
  }

  const minAtras = (eq) => {
    const loc = locs[eq.id]
    if (!loc) return null
    return Math.round((Date.now() - new Date(loc.ts).getTime()) / 60000)
  }

  const emAndamento = os.filter(o => ['a_caminho', 'no_local', 'executando'].includes(o.status))
  const onlineCount = equipes.filter(isOnline).length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16, height: 'calc(100vh - 110px)', minHeight: 500 }}>

      {/* Área do mapa */}
      <div style={{ background: '#1e293b', borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
        {/* Grade decorativa */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .06 }} viewBox='0 0 800 500' preserveAspectRatio='none'>
          {Array.from({ length: 27 }, (_, i) => <line key={'v'+i} x1={i*30} y1={0} x2={i*30} y2={500} stroke='#94a3b8' strokeWidth={1} />)}
          {Array.from({ length: 17 }, (_, i) => <line key={'h'+i} x1={0} y1={i*30} x2={800} y2={i*30} stroke='#94a3b8' strokeWidth={1} />)}
        </svg>

        {/* Status bar */}
        <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0f172acc', borderRadius: 8, padding: '5px 12px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Ao vivo · {onlineCount} online · atualiza a cada 4s</span>
          </div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

        {/* Pins das equipes online */}
        {equipes.filter(isOnline).map((e, i) => {
          const osAtiva = os.find(o => o.equipeId === e.id && ['a_caminho', 'no_local', 'executando'].includes(o.status))
          const st = osAtiva ? STATUS[osAtiva.status] : null
          const x = 12 + (i % 4) * 24
          const y = 22 + Math.floor(i / 4) * 26
          return (
            <div key={e.id} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', zIndex: 5 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: CORES[i % CORES.length], border: '3px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: `0 0 0 4px ${CORES[i % CORES.length]}33`, cursor: 'pointer' }}>
                  🧑‍🔧
                </div>
                {osAtiva && (
                  <div style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: st.cor, border: '2px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                  </div>
                )}
              </div>
              <div style={{ background: '#0f172acc', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 5, marginTop: 5, whiteSpace: 'nowrap', textAlign: 'center', maxWidth: 100 }}>
                {e.nome.replace('Equipe ', '')}
                {osAtiva && <div style={{ color: st.cor, fontSize: 9 }}>{st.label}</div>}
              </div>
            </div>
          )
        })}

        {/* Estado vazio */}
        {equipes.filter(isOnline).length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
            <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Aguardando equipes online</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6, textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
              As equipes precisam estar com o sistema aberto no celular para o GPS ser compartilhado.
            </div>
          </div>
        )}
      </div>

      {/* Painel lateral */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>

        {/* Equipes */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
            Equipes em campo
          </div>
          {equipes.map((e, i) => {
            const on = isOnline(e)
            const min = minAtras(e)
            const osEq = os.filter(o => o.equipeId === e.id)
            const conc = osEq.filter(o => o.status === 'concluida').length
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: CORES[i % CORES.length] + '22', border: `1.5px solid ${CORES[i % CORES.length]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🧑‍🔧</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nome}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {conc}/{osEq.length} OS · {on ? (min === 0 ? 'agora' : `${min}min atrás`) : 'offline'}
                  </div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: on ? '#10b981' : '#cbd5e1', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>

        {/* OS em andamento */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, flex: 1, overflow: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
            OS em andamento ({emAndamento.length})
          </div>
          {emAndamento.length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', paddingTop: 20 }}>Nenhuma OS em execução</div>
          )}
          {emAndamento.map(o => {
            const st = STATUS[o.status]
            const eq = equipes.find(e => e.id === o.equipeId)
            return (
              <div key={o.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: '#0f172a' }}>{o.numero}</span>
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: st.bg, color: st.cor, fontWeight: 600 }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.logradouro || '—'}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{eq?.nome}</div>
              </div>
            )
          })}
        </div>

        {/* Resumo */}
        <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Resumo do dia</div>
          {Object.entries(STATUS).map(([k, v]) => {
            const c = os.filter(o => o.status === k).length
            if (!c) return null
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                <span style={{ color: v.cor, fontWeight: 500 }}>{v.label}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{c}</span>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Total</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{os.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
