import { useState } from 'react'
import { DB, EQUIPES_DEFAULT } from './db'
import Login from './Login'
import TabelaOS from './TabelaOS'
import ImportarExcel from './ImportarExcel'
import MapaVivo from './MapaVivo'
import MapaProgramacao from './MapaProgramacao'
import PainelEquipe from './PainelEquipe'

function PainelADM({ onSair }) {
  const [aba, setAba] = useState('os')
  const [mapaAberto, setMapaAberto] = useState(false)

  if (mapaAberto) return <MapaProgramacao voltarParaOS={() => setMapaAberto(false)} />

  const abas = [
    { id: 'os',       label: '📋  Ordens de Serviço' },
    { id: 'importar', label: '📊  Importar Excel' },
    { id: 'mapa',     label: '🗺️  Mapa ao vivo' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: '#0f172a', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 20, height: 54, position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
          Campo<span style={{ color: '#22d3ee' }}>360</span>
        </div>
        <div style={{ display: 'flex', gap: 3, flex: 1, overflowX: 'auto' }}>
          {abas.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', transition: 'all .15s',
              background: aba === a.id ? '#22d3ee' : 'transparent',
              color: aba === a.id ? '#0f172a' : '#64748b',
            }}>{a.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10b981' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            ao vivo
          </div>
          <button onClick={onSair} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #334155', borderRadius: 7, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Sair</button>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <div style={{ padding: 24 }}>
        {aba === 'os'       && <TabelaOS onAbrirMapa={() => setMapaAberto(true)} />}
        {aba === 'importar' && <ImportarExcel />}
        {aba === 'mapa'     && <MapaVivo />}
      </div>
    </div>
  )
}

export default function App() {
  const [perfil,   setPerfil]   = useState(() => DB.get('perfil', null))
  const [equipeId, setEquipeId] = useState(() => DB.get('equipeId', null))

  function entrar(p, eq) {
    DB.set('perfil', p); DB.set('equipeId', eq || null)
    setPerfil(p); setEquipeId(eq || null)
  }
  function sair() {
    DB.set('perfil', null); DB.set('equipeId', null)
    setPerfil(null); setEquipeId(null)
  }

  if (!perfil)          return <Login onEntrar={entrar} />
  if (perfil === 'adm') return <PainelADM onSair={sair} />
  return <PainelEquipe equipeId={equipeId} onSair={sair} />
}
