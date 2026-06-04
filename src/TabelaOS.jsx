import { useState, useEffect } from 'react'
import { listarOS, atualizarOS, deletarOS, reprogramarVencidas, subscribeOS } from './supabase'
import { DB, STATUS, EQUIPES_DEFAULT, agora, fmt, inputSt } from './db'
import ModalEditarOS from './ModalEditarOS'

export default function TabelaOS({ onAbrirMapa }) {
  const [os, setOs]             = useState([])
  const [carregando, setCarreg] = useState(true)
  const [filtroStatus, setFSt]  = useState('')
  const [filtroEquipe, setFEq]  = useState('')
  const [busca, setBusca]       = useState('')
  const [selecionada, setSel]   = useState(null)
  const [msg, setMsg]           = useState('')
  const equipes = DB.get('equipes', EQUIPES_DEFAULT)

  async function carregar() {
    try {
      const data = await listarOS({ status: filtroStatus || undefined, equipeId: filtroEquipe || undefined, busca: busca || undefined })
      setOs(data)
    } catch(e) { console.error(e) }
    finally { setCarreg(false) }
  }

  useEffect(() => { carregar() }, [filtroStatus, filtroEquipe, busca])

  useEffect(() => {
    const unsub = subscribeOS(() => carregar())
    return unsub
  }, [filtroStatus, filtroEquipe, busca])

  const cont = Object.keys(STATUS).reduce((a, k) => { a[k] = os.filter(o => o.status === k).length; return a }, {})
  const comCoord = os.filter(o => o.lat && o.lng).length

  async function salvar(at) {
    try {
      await atualizarOS(at.id, {
        status: at.status, equipe_id: at.equipeId || at.equipe_id,
        logradouro: at.logradouro, bairro: at.bairro, municipio: at.municipio,
        id_poste: at.idPoste || at.id_poste, referencia: at.referencia,
        prazo: at.prazo || null, prazo_reprogramado: at.prazoReprogramado || null,
        observacoes: at.observacoes, lat: at.lat || null, lng: at.lng || null,
      })
      await carregar(); setSel(null)
    } catch(e) { alert('Erro ao salvar: ' + e.message) }
  }

  async function excluir(id) {
    if (!confirm('Excluir esta OS?')) return
    try { await deletarOS(id); await carregar() }
    catch(e) { alert('Erro: ' + e.message) }
  }

  async function handleReprogramar() {
    const r = await reprogramarVencidas()
    setMsg(`${r?.length || 0} OS reprogramadas para amanhã`)
    setTimeout(() => setMsg(''), 4000)
    await carregar()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
          Ordens de Serviço <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400 }}>({os.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {comCoord > 0 && (
            <button onClick={onAbrirMapa} style={{ padding: '7px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              🗺️ Ver {comCoord} OS no mapa
            </button>
          )}
          <button onClick={handleReprogramar} style={{ padding: '7px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, color: '#f97316', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🔄 Reprogramar vencidas
          </button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#166534', fontSize: 13 }}>✅ {msg}</div>}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.entries(STATUS).map(([k, v]) => cont[k] > 0 && (
          <div key={k} onClick={() => setFSt(filtroStatus === k ? '' : k)}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', userSelect: 'none', transition: 'all .15s', border: `1.5px solid ${v.cor}30`, background: filtroStatus === k ? v.cor : v.bg, color: filtroStatus === k ? '#fff' : v.cor }}>
            {v.label} · {cont[k]}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍  Buscar número, endereço..."
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
        <select value={filtroEquipe} onChange={e => setFEq(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 160 }}>
          <option value=''>Todas as equipes</option>
          {equipes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Número', 'Endereço', 'Lat / Lng', 'Equipe', 'Prazo', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Carregando...</td></tr>}
            {!carregando && os.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                Nenhuma OS encontrada. Importe do Excel para começar.
              </td></tr>
            )}
            {os.map(o => {
              const st = STATUS[o.status] || STATUS.despachada
              const eq = equipes.find(e => e.id === o.equipe_id)
              const vencida = o.prazo && new Date(o.prazo) < new Date() && !['concluida', 'reprogramada', 'impedida'].includes(o.status)
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', background: vencida ? '#fffbeb' : '' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {o.numero}{vencida && <span style={{ fontSize: 10, color: '#f97316', marginLeft: 5 }}>⚠️</span>}
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>{o.logradouro || '—'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{[o.bairro, o.municipio].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: o.lat ? '#10b981' : '#cbd5e1', whiteSpace: 'nowrap' }}>
                    {o.lat ? `${Number(o.lat).toFixed(4)}, ${Number(o.lng).toFixed(4)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{eq?.nome || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{fmt(o.prazo)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 6, background: st.bg, color: st.cor, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{st.label}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setSel({ ...o, equipeId: o.equipe_id, idPoste: o.id_poste, prazoReprogramado: o.prazo_reprogramado })}
                        style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', color: '#475569', fontSize: 11, cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => excluir(o.id)}
                        style={{ padding: '4px 10px', border: '1px solid #fecaca', borderRadius: 6, background: '#fff', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11 }}>
          {os.length} OS · {comCoord} com coordenadas GPS
        </div>
      </div>
      {selecionada && <ModalEditarOS os={selecionada} onSalvar={salvar} onFechar={() => setSel(null)} />}
    </div>
  )
}
