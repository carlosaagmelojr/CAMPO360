const PFX = 'c360_'

export const DB = {
  get: (k, def) => {
    try {
      const v = localStorage.getItem(PFX + k)
      return v ? JSON.parse(v) : def
    } catch { return def }
  },
  set: (k, v) => {
    try { localStorage.setItem(PFX + k, JSON.stringify(v)) } catch {}
  },
}

export const gerarNumOS = () => {
  const n = (DB.get('counter', 1000) + 1)
  DB.set('counter', n)
  return `OS-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`
}

export const agora = () => new Date().toISOString()

export const fmt = d => {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt) ? d : dt.toLocaleDateString('pt-BR')
}

export const STATUS = {
  pendente:     { label: 'Pendente',     cor: '#94a3b8', bg: '#f1f5f9' },
  despachada:   { label: 'Despachada',   cor: '#6366f1', bg: '#eef2ff' },
  a_caminho:    { label: 'A caminho',    cor: '#f59e0b', bg: '#fffbeb' },
  no_local:     { label: 'No local',     cor: '#3b82f6', bg: '#eff6ff' },
  executando:   { label: 'Executando',   cor: '#8b5cf6', bg: '#f5f3ff' },
  concluida:    { label: 'Concluída',    cor: '#10b981', bg: '#ecfdf5' },
  impedida:     { label: 'Impedida',     cor: '#ef4444', bg: '#fef2f2' },
  reprogramada: { label: 'Reprogramada', cor: '#f97316', bg: '#fff7ed' },
}

export const EQUIPES_DEFAULT = [
  { id: 'eq1', nome: 'Equipe Alpha' },
  { id: 'eq2', nome: 'Equipe Beta'  },
  { id: 'eq3', nome: 'Equipe Gama'  },
  { id: 'eq4', nome: 'Equipe Delta' },
]

export const inputSt = {
  width: '100%', padding: '8px 10px',
  border: '1px solid #e2e8f0', borderRadius: 7,
  fontSize: 13, outline: 'none', background: '#fff',
}
