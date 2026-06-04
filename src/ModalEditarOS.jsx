import { useState } from 'react'
import { DB, STATUS, EQUIPES_DEFAULT, agora, inputSt } from './db'

export default function ModalEditarOS({ os, onSalvar, onFechar }) {
  const [form, setForm] = useState({ ...os })
  const equipes = DB.get('equipes', EQUIPES_DEFAULT)

  const campo = (key, label, tipo = 'text') => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
      {tipo === 'select-status' ? (
        <select value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputSt}>
          {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
      ) : tipo === 'select-equipe' ? (
        <select value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputSt}>
          <option value=''>Sem equipe</option>
          {equipes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      ) : tipo === 'textarea' ? (
        <textarea value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={2} style={{ ...inputSt, resize: 'vertical' }} />
      ) : (
        <input type={tipo} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputSt} />
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000066', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Editar — {os.numero}</div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: 'span 2' }}>{campo('logradouro', 'Logradouro')}</div>
          <div>{campo('bairro', 'Bairro')}</div>
          <div>{campo('municipio', 'Município')}</div>
          <div>{campo('idPoste', 'ID do Poste')}</div>
          <div>{campo('referencia', 'Referência')}</div>
          <div>{campo('prazo', 'Prazo', 'date')}</div>
          <div>{campo('equipeId', 'Equipe', 'select-equipe')}</div>
          <div style={{ gridColumn: 'span 2' }}>{campo('status', 'Status', 'select-status')}</div>
          {form.status === 'reprogramada' && (
            <div style={{ gridColumn: 'span 2' }}>{campo('prazoReprogramado', 'Nova data', 'date')}</div>
          )}
          <div style={{ gridColumn: 'span 2' }}>{campo('observacoes', 'Observações', 'textarea')}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={onFechar} style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={() => onSalvar({ ...form, atualizadoEm: agora() })} style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: '#0f172a', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Salvar alterações</button>
        </div>
      </div>
    </div>
  )
}
