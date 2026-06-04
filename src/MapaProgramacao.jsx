import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, LayerGroup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { listarOS, listarLocalizacoes, atualizarOS, subscribeOS, subscribeLoc, reprogramarVencidas } from './supabase'
import { STATUS, EQUIPES_DEFAULT, DB, fmt } from './db'

// Corrigir ícones padrão do Leaflet no Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CORES_EQUIPE = {
  eq1: '#22d3ee', eq2: '#a78bfa', eq3: '#34d399',
  eq4: '#fb923c', eq5: '#f87171', eq6: '#60a5fa',
}

const CORES_STATUS = {
  despachada:   '#6366f1',
  a_caminho:    '#f59e0b',
  no_local:     '#3b82f6',
  executando:   '#8b5cf6',
  concluida:    '#10b981',
  impedida:     '#ef4444',
  reprogramada: '#f97316',
}

function criarIconeOS(status, equipeId, selecionada) {
  const cor = CORES_STATUS[status] || '#94a3b8'
  const tamanho = selecionada ? 36 : 28
  const borda = selecionada ? 3 : 2
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${tamanho}px;height:${tamanho}px;
      border-radius:50%;
      background:${cor};
      border:${borda}px solid #fff;
      box-shadow:0 2px 8px ${cor}88;
      display:flex;align-items:center;justify-content:center;
      font-size:${tamanho * 0.45}px;
      transition:all .2s;
    ">📍</div>`,
    iconAnchor: [tamanho / 2, tamanho / 2],
  })
}

function criarIconeEquipe(cor) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${cor};border:3px solid #fff;
      box-shadow:0 2px 10px ${cor}88;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;animation:gps 2s infinite;
    ">🧑‍🔧</div>`,
    iconAnchor: [18, 18],
  })
}

function FitBounds({ pontos }) {
  const map = useMap()
  useEffect(() => {
    if (!pontos.length) return
    if (pontos.length === 1) {
      map.setView([pontos[0][0], pontos[0][1]], 14)
    } else {
      map.fitBounds(L.latLngBounds(pontos), { padding: [40, 40] })
    }
  }, [pontos.length])
  return null
}

export default function MapaProgramacao({ voltarParaOS }) {
  const [os, setOs]             = useState([])
  const [locs, setLocs]         = useState([])
  const [carregando, setCarreg]  = useState(true)
  const [selecionada, setSel]    = useState(null)
  const [filtroEquipe, setFEq]   = useState('')
  const [filtroStatus, setFSt]   = useState('')
  const [filtroMun, setFMun]     = useState('')
  const [agrupamento, setAgrup]  = useState('status') // 'status' | 'equipe' | 'municipio'
  const [reprogMsg, setReprogMsg] = useState('')
  const equipes = DB.get('equipes', EQUIPES_DEFAULT)

  async function carregar() {
    setCarreg(true)
    try {
      const [osData, locsData] = await Promise.all([listarOS(), listarLocalizacoes()])
      setOs(osData || [])
      setLocs(locsData || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarreg(false)
    }
  }

  useEffect(() => {
    carregar()
    const unsubOS  = subscribeOS(() => carregar())
    const unsubLoc = subscribeLoc(() => listarLocalizacoes().then(d => setLocs(d || [])))
    return () => { unsubOS(); unsubLoc() }
  }, [])

  const osFiltradas = os.filter(o =>
    o.lat && o.lng &&
    (!filtroEquipe || o.equipe_id === filtroEquipe) &&
    (!filtroStatus || o.status === filtroStatus) &&
    (!filtroMun || (o.municipio || '').toLowerCase().includes(filtroMun.toLowerCase()))
  )

  const municipios = [...new Set(os.filter(o => o.municipio).map(o => o.municipio))].sort()
  const contStatus = Object.keys(STATUS).reduce((a, k) => { a[k] = os.filter(o => o.status === k).length; return a }, {})

  const pontosFit = osFiltradas.map(o => [o.lat, o.lng])

  async function despacharParaEquipe(osId, equipeId) {
    await atualizarOS(osId, { equipe_id: equipeId, status: 'despachada' })
    await carregar()
    setSel(null)
  }

  async function handleReprogramar() {
    const reprog = await reprogramarVencidas()
    setReprogMsg(`${reprog?.length || 0} OS reprogramadas para amanhã`)
    setTimeout(() => setReprogMsg(''), 4000)
    await carregar()
  }

  // Agrupar OS para o painel lateral
  const grupos = {}
  osFiltradas.forEach(o => {
    let chave = ''
    if (agrupamento === 'equipe')    chave = equipes.find(e => e.id === o.equipe_id)?.nome || 'Sem equipe'
    if (agrupamento === 'status')    chave = STATUS[o.status]?.label || o.status
    if (agrupamento === 'municipio') chave = o.municipio || 'Sem município'
    if (!grupos[chave]) grupos[chave] = []
    grupos[chave].push(o)
  })

  return (
    <div style={{ height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes gps{0%,100%{opacity:1}50%{opacity:.4}}
        .leaflet-container{font-family:'DM Sans',sans-serif}
        .leaflet-popup-content-wrapper{border-radius:12px;box-shadow:0 4px 20px #00000022}
        .leaflet-popup-content{margin:14px 16px;min-width:220px}
      `}</style>

      {/* Barra de filtros */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={voltarParaOS} style={{ padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
          ← OS
        </button>

        <select value={filtroEquipe} onChange={e => setFEq(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12 }}>
          <option value=''>Todas as equipes</option>
          {equipes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>

        <select value={filtroStatus} onChange={e => setFSt(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12 }}>
          <option value=''>Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select value={filtroMun} onChange={e => setFMun(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12 }}>
          <option value=''>Todos os municípios</option>
          {municipios.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Agrupar por:</span>
          {['status', 'equipe', 'municipio'].map(a => (
            <button key={a} onClick={() => setAgrup(a)} style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11,
              cursor: 'pointer', background: agrupamento === a ? '#0f172a' : '#fff',
              color: agrupamento === a ? '#fff' : '#64748b',
            }}>
              {a === 'status' ? 'Status' : a === 'equipe' ? 'Equipe' : 'Município'}
            </button>
          ))}
        </div>

        <button onClick={handleReprogramar} style={{ padding: '6px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 7, color: '#f97316', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          🔄 Reprogramar vencidas
        </button>

        <button onClick={carregar} style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: '#64748b' }}>
          ↻
        </button>

        <span style={{ fontSize: 11, color: '#94a3b8' }}>{osFiltradas.length} OS no mapa</span>
      </div>

      {reprogMsg && (
        <div style={{ background: '#f0fdf4', borderBottom: '1px solid #86efac', padding: '8px 20px', fontSize: 12, color: '#166534', fontWeight: 500 }}>
          ✅ {reprogMsg}
        </div>
      )}

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 300px', overflow: 'hidden' }}>
        {/* Mapa */}
        <div style={{ position: 'relative' }}>
          {carregando && (
            <div style={{ position: 'absolute', inset: 0, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontSize: 14, color: '#64748b' }}>
              Carregando OS do banco...
            </div>
          )}
          <MapContainer
            center={[-8.0476, -34.8770]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            {pontosFit.length > 0 && <FitBounds pontos={pontosFit} />}

            {/* Pins das OS */}
            {osFiltradas.map(o => (
              <Marker
                key={o.id}
                position={[o.lat, o.lng]}
                icon={criarIconeOS(o.status, o.equipe_id, selecionada?.id === o.id)}
                eventHandlers={{ click: () => setSel(o) }}
              >
                <Popup>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", minWidth: 220 }}>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>{o.numero}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4, lineHeight: 1.3 }}>{o.logradouro || '—'}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{[o.bairro, o.municipio].filter(Boolean).join(' · ')}</div>

                    {o.id_poste && <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>🪧 {o.id_poste}</div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: STATUS[o.status]?.bg || '#f1f5f9', color: STATUS[o.status]?.cor || '#64748b', fontWeight: 600 }}>
                        {STATUS[o.status]?.label || o.status}
                      </span>
                      {o.prazo && <span style={{ fontSize: 11, color: '#94a3b8' }}>📅 {fmt(o.prazo)}</span>}
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>Despachar para:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                        {equipes.map(e => (
                          <button key={e.id} onClick={() => despacharParaEquipe(o.id, e.id)}
                            style={{
                              padding: '6px 8px', borderRadius: 7, border: `1.5px solid ${o.equipe_id === e.id ? CORES_EQUIPE[e.id] || '#22d3ee' : '#e2e8f0'}`,
                              background: o.equipe_id === e.id ? (CORES_EQUIPE[e.id] || '#22d3ee') + '22' : '#fff',
                              color: o.equipe_id === e.id ? (CORES_EQUIPE[e.id] || '#22d3ee') : '#475569',
                              fontSize: 11, fontWeight: o.equipe_id === e.id ? 700 : 400, cursor: 'pointer',
                            }}>
                            {e.nome.replace('Equipe ', '')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Pins das equipes online */}
            {locs.map((loc, i) => {
              if (!loc.lat || !loc.lng) return null
              const eq = equipes.find(e => e.id === loc.equipe_id)
              const cor = CORES_EQUIPE[loc.equipe_id] || '#22d3ee'
              return (
                <Marker key={loc.equipe_id} position={[loc.lat, loc.lng]} icon={criarIconeEquipe(cor)}>
                  <Popup>
                    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{eq?.nome || 'Equipe'}</div>
                      <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>● Online agora</div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {/* Legenda */}
          <div style={{ position: 'absolute', bottom: 20, left: 10, zIndex: 1000, background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 2px 10px #00000022', fontSize: 11 }}>
            <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Legenda</div>
            {Object.entries(CORES_STATUS).map(([k, cor]) => contStatus[k] > 0 && (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                <span style={{ color: '#475569' }}>{STATUS[k]?.label}</span>
                <span style={{ color: '#94a3b8', marginLeft: 'auto', paddingLeft: 8 }}>{contStatus[k]}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 6, paddingTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22d3ee', flexShrink: 0 }} />
              <span style={{ color: '#475569' }}>Equipe online</span>
            </div>
          </div>
        </div>

        {/* Painel lateral — lista agrupada */}
        <div style={{ background: '#fff', borderLeft: '1px solid #e2e8f0', overflow: 'auto', padding: '0 0 20px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 600, color: '#64748b', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
            {osFiltradas.length} OS · agrupado por {agrupamento === 'status' ? 'status' : agrupamento === 'equipe' ? 'equipe' : 'município'}
          </div>

          {Object.entries(grupos).map(([grupo, lista]) => (
            <div key={grupo}>
              <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {grupo} <span style={{ color: '#cbd5e1', fontWeight: 400 }}>({lista.length})</span>
              </div>
              {lista.map(o => {
                const st = STATUS[o.status] || STATUS.despachada
                const eq = equipes.find(e => e.id === o.equipe_id)
                const vencida = o.prazo && new Date(o.prazo) < new Date() && !['concluida', 'reprogramada', 'impedida'].includes(o.status)
                return (
                  <div key={o.id} onClick={() => setSel(o)}
                    style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', background: selecionada?.id === o.id ? '#f0fdf4' : vencida ? '#fffbeb' : '#fff', transition: 'background .1s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>{o.numero}</span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: st.bg, color: st.cor, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.logradouro || '—'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {eq?.nome || 'Sem equipe'}{o.prazo ? ` · ${fmt(o.prazo)}` : ''}{vencida ? ' ⚠️' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {osFiltradas.length === 0 && !carregando && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📍</div>
              <div style={{ fontSize: 13 }}>Nenhuma OS com coordenadas encontrada.</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Importe OS com lat/lng preenchidos.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
