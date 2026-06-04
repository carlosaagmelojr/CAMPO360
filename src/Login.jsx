import { useState, useEffect } from 'react'
import { listarEquipes } from './supabase'

export default function Login({ onEntrar }) {
  const [modo, setModo]     = useState('adm')
  const [equipe, setEquipe] = useState('')
  const [equipes, setEquipes] = useState([])
  const [carregando, setCarr] = useState(true)

  useEffect(() => {
    listarEquipes().then(data => {
      setEquipes(data || [])
      if (data?.length) setEquipe(data[0].id)
    }).catch(() => {}).finally(() => setCarr(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#1e293b', borderRadius: 20, padding: '40px 32px', border: '1px solid #334155' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#f8fafc', letterSpacing: -1 }}>
            Campo<span style={{ color: '#22d3ee' }}>360</span>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Gestão de ordens de serviço em campo</div>
        </div>

        <div style={{ display: 'flex', background: '#0f172a', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {['adm', 'equipe'].map(m => (
            <button key={m} onClick={() => setModo(m)} style={{
              flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, transition: 'all .2s',
              background: modo === m ? '#22d3ee' : 'transparent',
              color: modo === m ? '#0f172a' : '#64748b',
            }}>
              {m === 'adm' ? 'Administrador' : 'Equipe de campo'}
            </button>
          ))}
        </div>

        {modo === 'equipe' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Selecione sua equipe</label>
            <select value={equipe} onChange={e => setEquipe(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 14 }}>
              {carregando && <option>Carregando...</option>}
              {equipes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
        )}

        <button
          onClick={() => onEntrar(modo, modo === 'equipe' ? equipe : null)}
          disabled={modo === 'equipe' && !equipe}
          style={{ width: '100%', padding: '13px 0', background: '#22d3ee', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8, opacity: (modo === 'equipe' && !equipe) ? .5 : 1 }}>
          Entrar
        </button>

        <div style={{ marginTop: 16, padding: '10px 12px', background: '#0f172a', borderRadius: 8, fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
          💡 <strong style={{ color: '#64748b' }}>ADM:</strong> importa Excel, despacha OS, acompanha mapa<br />
          💡 <strong style={{ color: '#64748b' }}>Equipe:</strong> recebe OS e atualiza status no celular
        </div>
      </div>
    </div>
  )
}
