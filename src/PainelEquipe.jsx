import { useState, useEffect, useCallback } from 'react'
import { listarOS, atualizarOS, salvarLocalizacao, subscribeOS } from './supabase'
import { STATUS, EQUIPES_DEFAULT, DB, fmt } from './db'

function ModalStatus({ os, onAtualizar, onFechar }) {
  const fluxo = {
    despachada: [{ s: 'a_caminho',  label: '🚗  A caminho' }],
    a_caminho:  [{ s: 'no_local',   label: '📍  Cheguei no local' }],
    no_local:   [{ s: 'executando', label: '⚡  Iniciar execução' }],
    executando: [{ s: 'concluida',  label: '✅  Concluída' }, { s: 'impedida', label: '⚠️  Impedimento' }],
  }
  const acoes = fluxo[os.status] || []
  const st = STATUS[os.status] || STATUS.despachada
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000077', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={{ background: '#fff', borderRadius: '22px 22px 0 0', width: '100%', padding: '24px 20px 44px', maxHeight: '88vh', overflow: 'auto' }}>
        <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2, fontFamily: 'monospace', fontWeight: 600 }}>{os.numero}</div>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: st.bg, color: st.cor, fontWeight: 600 }}>{st.label}</span>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#cbd5e1', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: 18, marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 4, lineHeight: 1.3 }}>{os.logradouro || 'Sem endereço'}</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>{[os.bairro, os.municipio].filter(Boolean).join(' · ') || '—'}</div>
          {os.id_poste    && <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>🪧 <strong>Poste:</strong> {os.id_poste}</div>}
          {os.referencia  && <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>📌 <strong>Ref:</strong> {os.referencia}</div>}
          {os.prazo       && <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>📅 <strong>Prazo:</strong> {fmt(os.prazo)}</div>}
          {os.lat && os.lng && (
            <a href={`https://maps.google.com/?q=${os.lat},${os.lng}`} target='_blank' rel='noreferrer'
              style={{ display: 'inline-block', marginTop: 8, fontSize: 13, color: '#3b82f6', fontWeight: 500 }}>
              📍 Abrir no Google Maps →
            </a>
          )}
          {os.observacoes && <div style={{ fontSize: 13, color: '#64748b', marginTop: 10, padding: '10px 12px', background: '#fff', borderRadius: 8, borderLeft: '3px solid #e2e8f0', fontStyle: 'italic' }}>"{os.observacoes}"</div>}
        </div>
        {acoes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {acoes.map(a => (
              <button key={a.s} onClick={() => onAtualizar(os.id, a.s)} style={{
                padding: '16px 0', borderRadius: 14, border: 'none', fontSize: 16, fontWeight: 600, cursor: 'pointer',
                background: a.s === 'impedida' ? '#fef2f2' : '#0f172a',
                color: a.s === 'impedida' ? '#ef4444' : '#fff',
              }}>{a.label}</button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 15 }}>
            {os.status === 'concluida' ? '✅  OS concluída' : '⚠️  OS com impedimento'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PainelEquipe({ equipeId, onSair }) {
  const [os, setOs]           = useState([])
  const [selecionada, setSel] = useState(null)
  const [carregando, setCarreg] = useState(true)
  const equipes = DB.get('equipes', EQUIPES_DEFAULT)
  const equipe  = equipes.find(e => e.id === equipeId)

  const carregar = useCallback(async () => {
    try {
      const data = await listarOS({ equipeId })
      setOs(data.filter(o => o.status !== 'pendente'))
    } catch(e) { console.error(e) }
    finally { setCarreg(false) }
  }, [equipeId])

  useEffect(() => {
    carregar()
    const unsub = subscribeOS(() => carregar())
    return unsub
  }, [carregar])

  useEffect(() => {
    function gps() {
      const salvar = (lat, lng) => salvarLocalizacao(equipeId, lat, lng).catch(() => {})
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          p => salvar(p.coords.latitude, p.coords.longitude),
          () => salvar(-8.0476 + (Math.random() - .5) * .05, -34.877 + (Math.random() - .5) * .05)
        )
      } else {
        salvar(-8.0476 + (Math.random() - .5) * .05, -34.877 + (Math.random() - .5) * .05)
      }
    }
    gps()
    const t = setInterval(gps, 60000)
    return () => clearInterval(t)
  }, [equipeId])

  async function atualizar(id, status) {
    await atualizarOS(id, { status }).catch(e => alert(e.message))
    await carregar(); setSel(null)
  }

  const pendentes  = os.filter(o => o.status === 'despachada')
  const andamento  = os.filter(o => ['a_caminho', 'no_local', 'executando'].includes(o.status))
  const concluidas = os.filter(o => ['concluida', 'impedida', 'reprogramada'].includes(o.status))

  const Secao = ({ titulo, lista }) => lista.length === 0 ? null : (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>{titulo}</div>
      {lista.map(o => {
        const st = STATUS[o.status] || STATUS.despachada
        const pode = ['despachada', 'a_caminho', 'no_local', 'executando'].includes(o.status)
        return (
          <div key={o.id} onClick={() => setSel(o)}
            style={{ background: '#fff', borderRadius: 16, padding: 18, marginBottom: 10, border: '1px solid #e2e8f0', cursor: 'pointer', boxShadow: '0 1px 3px #0000000a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>{o.numero}</span>
              <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 6, background: st.bg, color: st.cor, fontWeight: 600 }}>{st.label}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 3, lineHeight: 1.3 }}>{o.logradouro || 'Sem endereço'}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{[o.bairro, o.municipio].filter(Boolean).join(' · ') || '—'}</div>
            {o.id_poste && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>🪧 {o.id_poste}</div>}
            {o.lat && o.lng && <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>📍 GPS disponível</div>}
            {pode && <div style={{ marginTop: 10, fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Toque para atualizar →</div>}
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ background: '#0f172a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>Campo<span style={{ color: '#22d3ee' }}>360</span></div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{equipe?.nome}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'gps 2s infinite' }} />
            GPS · ao vivo
          </div>
          <button onClick={onSair} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #334155', borderRadius: 7, color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>Sair</button>
        </div>
      </div>
      <style>{`@keyframes gps{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ padding: '16px 16px 50px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
          {[{ l: 'Novas', c: pendentes.length, cor: '#6366f1', bg: '#eef2ff' },
            { l: 'Em andamento', c: andamento.length, cor: '#f59e0b', bg: '#fffbeb' },
            { l: 'Concluídas', c: concluidas.length, cor: '#10b981', bg: '#ecfdf5' },
          ].map(x => (
            <div key={x.l} style={{ background: x.bg, borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: x.cor }}>{x.c}</div>
              <div style={{ fontSize: 10, color: x.cor, fontWeight: 600, marginTop: 2 }}>{x.l}</div>
            </div>
          ))}
        </div>

        {carregando && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Carregando OS...</div>}
        {!carregando && <>
          <Secao titulo='📬  Novas OS' lista={pendentes} />
          <Secao titulo='⚡  Em andamento' lista={andamento} />
          <Secao titulo='✓  Concluídas' lista={concluidas} />
          {os.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>Nenhuma OS despachada</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Aguarde o ADM despachar ordens para a sua equipe.</div>
            </div>
          )}
        </>}
      </div>
      {selecionada && <ModalStatus os={selecionada} onAtualizar={atualizar} onFechar={() => setSel(null)} />}
    </div>
  )
}
