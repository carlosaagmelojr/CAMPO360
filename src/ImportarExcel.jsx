import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { criarOSLote, listarEquipes } from './supabase'
import { gerarNumOS, inputSt } from './db'

const CAMPOS = [
  { key: 'logradouro', label: 'Logradouro / Endereço' },
  { key: 'bairro',     label: 'Bairro' },
  { key: 'municipio',  label: 'Município' },
  { key: 'id_poste',   label: 'ID do Poste' },
  { key: 'referencia', label: 'Referência' },
  { key: 'lat',        label: 'Latitude' },
  { key: 'lng',        label: 'Longitude' },
  { key: 'observacoes',label: 'Observações' },
  { key: 'prazo',      label: 'Prazo (da planilha)' },
]

export default function ImportarExcel() {
  const [cols, setCols]         = useState([])
  const [linhas, setLinhas]     = useState([])
  const [mapa, setMapa]         = useState({})
  const [equipeId, setEquipeId] = useState('')
  const [equipes, setEquipes]   = useState([])
  const [prazo, setPrazo]       = useState('')
  const [preview, setPreview]   = useState([])
  const [resultado, setResult]  = useState(null)
  const [importando, setImp]    = useState(false)
  const [nomeArq, setNomeArq]   = useState('')

  useEffect(() => {
    listarEquipes().then(data => {
      setEquipes(data || [])
      if (data?.length) setEquipeId(data[0].id)
    }).catch(console.error)
  }, [])

  function lerArquivo(e) {
    const file = e.target.files[0]; if (!file) return
    setNomeArq(file.name); setResult(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!json.length) return
      const c = Object.keys(json[0])
      setCols(c); setLinhas(json)
      const auto = {}
      CAMPOS.forEach(({ key }) => {
        const kl = key.toLowerCase()
        const match = c.find(col => {
          const cl = col.toLowerCase()
          return cl.includes(kl) || kl.includes(cl.slice(0, 5)) ||
            (kl === 'logradouro' && (cl.includes('endere') || cl.includes('rua') || cl.includes('logr'))) ||
            (kl === 'municipio'  && (cl.includes('cidade') || cl.includes('munic'))) ||
            (kl === 'id_poste'   && (cl.includes('poste') || cl.includes('id'))) ||
            (kl === 'lat'        && (cl.includes('lat') || cl === 'y')) ||
            (kl === 'lng'        && (cl.includes('lng') || cl.includes('lon') || cl === 'x'))
        })
        if (match) auto[key] = match
      })
      setMapa(auto)
    }
    reader.readAsBinaryString(file)
  }

  useEffect(() => {
    if (!linhas.length) return
    setPreview(linhas.slice(0, 4).map(l => {
      const o = {}
      CAMPOS.forEach(({ key }) => { if (mapa[key]) o[key] = l[mapa[key]] })
      return o
    }))
  }, [mapa, linhas])

  async function importar() {
    if (!equipeId) { alert('Selecione uma equipe.'); return }
    setImp(true)
    try {
      const novas = linhas.map(l => {
        const o = { numero: gerarNumOS(), status: 'despachada', equipe_id: equipeId }
        CAMPOS.forEach(({ key }) => {
          const val = mapa[key] ? l[mapa[key]] : undefined
          if (val !== undefined && val !== '') {
            if (key === 'lat' || key === 'lng') {
              const num = parseFloat(String(val).replace(',', '.'))
              if (!isNaN(num)) o[key] = num
            } else if (key === 'prazo') {
              o[key] = val || null
            } else {
              o[key] = String(val)
            }
          }
        })
        if (!o.prazo && prazo) o.prazo = prazo
        return o
      })
      await criarOSLote(novas)
      const comCoord = novas.filter(o => o.lat && o.lng).length
      setResult({ count: novas.length, comCoord, equipe: equipes.find(e => e.id === equipeId)?.nome })
    } catch (e) {
      alert('Erro ao importar: ' + e.message)
    } finally {
      setImp(false)
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Importar do Excel</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        Selecione a planilha, mapeie as colunas e importe as OS no banco de dados.
      </div>

      <label style={{ display: 'block', border: '2px dashed #cbd5e1', borderRadius: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, background: '#f8fafc' }}>
        <input type='file' accept='.xlsx,.xls,.csv' onChange={lerArquivo} style={{ display: 'none' }} />
        <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#475569' }}>
          {nomeArq ? `✓  ${nomeArq}` : 'Clique para selecionar Excel ou CSV'}
        </div>
        {linhas.length > 0 && <div style={{ fontSize: 12, color: '#22d3ee', marginTop: 4 }}>{linhas.length} linhas · {cols.length} colunas</div>}
      </label>

      {cols.length > 0 && <>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 14 }}>Configurações</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Despachar para equipe</label>
              <select value={equipeId} onChange={e => setEquipeId(e.target.value)} style={inputSt}>
                {equipes.length === 0 && <option value=''>Carregando equipes...</option>}
                {equipes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Prazo padrão</label>
              <input type='date' value={prazo} onChange={e => setPrazo(e.target.value)} style={inputSt} />
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Mapeamento de colunas</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>Colunas em verde foram detectadas automaticamente.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {CAMPOS.map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, color: (key === 'lat' || key === 'lng') ? '#3b82f6' : '#475569', width: 155, flexShrink: 0, fontWeight: (key === 'lat' || key === 'lng') ? 600 : 400 }}>{label}</div>
                <select value={mapa[key] || ''} onChange={e => setMapa(m => ({ ...m, [key]: e.target.value }))}
                  style={{ flex: 1, padding: '6px 8px', border: `1px solid ${mapa[key] ? '#86efac' : '#e2e8f0'}`, borderRadius: 6, fontSize: 12, background: mapa[key] ? '#f0fdf4' : '#fff' }}>
                  <option value=''>— ignorar —</option>
                  {cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {preview.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16, overflowX: 'auto' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>Prévia</div>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                {CAMPOS.filter(f => mapa[f.key]).map(f => (
                  <th key={f.key} style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 500, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{f.label}</th>
                ))}
              </tr></thead>
              <tbody>{preview.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {CAMPOS.filter(f => mapa[f.key]).map(f => (
                    <td key={f.key} style={{ padding: '6px 10px', color: '#334155', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[f.key] || '—'}</td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        <button onClick={importar} disabled={importando || !equipeId} style={{ padding: '12px 28px', background: (importando || !equipeId) ? '#94a3b8' : '#0f172a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: (importando || !equipeId) ? 'default' : 'pointer' }}>
          {importando ? 'Importando...' : `Importar ${linhas.length} OS →`}
        </button>

        {resultado && (
          <div style={{ marginTop: 14, padding: '14px 18px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac', color: '#166534', fontSize: 13 }}>
            ✅ <strong>{resultado.count} OS</strong> importadas para <strong>{resultado.equipe}</strong>.
            {resultado.comCoord > 0 && <> <strong>{resultado.comCoord}</strong> com GPS — acesse <strong>Ordens de Serviço → Ver no mapa</strong>.</>}
          </div>
        )}
      </>}
    </div>
  )
}
