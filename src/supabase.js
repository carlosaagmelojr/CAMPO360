import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!URL || !KEY) {
  console.warn('⚠️  Variáveis do Supabase não configuradas. Veja .env.example')
}

export const supabase = createClient(URL || '', KEY || '')

// ── Ordens de serviço ────────────────────────────────────────────

export async function listarOS(filtros = {}) {
  let q = supabase
    .from('ordens_servico')
    .select('*')
    .order('criado_em', { ascending: false })

  if (filtros.status)   q = q.eq('status', filtros.status)
  if (filtros.equipeId) q = q.eq('equipe_id', filtros.equipeId)
  if (filtros.busca)    q = q.or(`numero.ilike.%${filtros.busca}%,logradouro.ilike.%${filtros.busca}%,municipio.ilike.%${filtros.busca}%`)

  const { data, error } = await q
  if (error) throw error
  return data
}

export async function buscarOS(id) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function criarOS(os) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .insert(os)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function criarOSLote(lista) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .insert(lista)
    .select()
  if (error) throw error
  return data
}

export async function atualizarOS(id, campos) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletarOS(id) {
  const { error } = await supabase
    .from('ordens_servico')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function reprogramarVencidas() {
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const nd = amanha.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('ordens_servico')
    .update({ status: 'reprogramada', prazo_reprogramado: nd, atualizado_em: new Date().toISOString() })
    .lt('prazo', new Date().toISOString().split('T')[0])
    .not('status', 'in', '("concluida","reprogramada","impedida","cancelada")')
    .select()
  if (error) throw error
  return data
}

// ── Localização das equipes ──────────────────────────────────────

export async function salvarLocalizacao(equipeId, lat, lng) {
  const { error } = await supabase
    .from('localizacoes_equipe')
    .upsert({ equipe_id: equipeId, lat, lng, registrado_em: new Date().toISOString() },
      { onConflict: 'equipe_id' })
  if (error) console.warn('GPS:', error.message)
}

export async function listarLocalizacoes() {
  const { data, error } = await supabase
    .from('localizacoes_equipe')
    .select('*')
  if (error) throw error
  return data
}

// ── Realtime subscription ────────────────────────────────────────

export function subscribeOS(callback) {
  const channel = supabase
    .channel('ordens_servico_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'ordens_servico' },
      payload => callback(payload)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export function subscribeLoc(callback) {
  const channel = supabase
    .channel('localizacoes_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'localizacoes_equipe' },
      payload => callback(payload)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ── Equipes ──────────────────────────────────────────────────────

export async function listarEquipes() {
  const { data, error } = await supabase
    .from('equipes')
    .select('*')
    .order('nome')
  if (error) throw error
  return data
}
