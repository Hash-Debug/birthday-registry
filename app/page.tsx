'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Gift = {
  id: string; title: string; description: string; image_url: string
  product_url: string; price: number; brand: string; category: string
  priority: string; is_available: boolean; reservations: { reserver_name: string }[]
}

const priorityLabel: Record<string,string> = {
  must_have: 'Must Have', nice_to_have: 'Nice to Have', dream_gift: 'Dream Gift'
}
const priorityColor: Record<string,string> = {
  must_have: 'bg-pink-100 text-pink-800',
  nice_to_have: 'bg-blue-100 text-blue-800',
  dream_gift: 'bg-purple-100 text-purple-800'
}

export default function Home() {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [filtered, setFiltered] = useState<Gift[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('')
  const [modal, setModal] = useState<Gift | null>(null)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [settings, setSettings] = useState({ registry_title: 'My Birthday Wishlist', birthday_date: '', welcome_message: '' })

  useEffect(() => { fetchGifts(); fetchSettings() }, [])

  useEffect(() => {
    let list = [...gifts]
    if (search) list = list.filter(g => g.title.toLowerCase().includes(search.toLowerCase()) || g.brand?.toLowerCase().includes(search.toLowerCase()))
    if (category) list = list.filter(g => g.category === category)
    if (sort === 'price-asc') list.sort((a,b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a,b) => b.price - a.price)
    if (sort === 'priority') list.sort((a,b) => ['must_have','nice_to_have','dream_gift'].indexOf(a.priority) - ['must_have','nice_to_have','dream_gift'].indexOf(b.priority))
    setFiltered(list)
  }, [gifts, search, category, sort])

  async function fetchGifts() {
    const { data } = await supabase.from('gifts').select('*, reservations(reserver_name)').order('created_at')
    setGifts(data || [])
  }

  async function fetchSettings() {
    const { data } = await supabase.from('registry_settings').select('*').single()
    if (data) setSettings(data)
  }

  const daysUntil = settings.birthday_date
    ? Math.max(0, Math.ceil((new Date(settings.birthday_date).getTime() - Date.now()) / 86400000))
    : null

  async function reserve() {
    if (!modal || !form.name.trim()) return
    setLoading(true)
    await supabase.from('reservations').insert({ gift_id: modal.id, reserver_name: form.name, reserver_email: form.email, message: form.message })
    await fetch('/api/notify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ giftTitle: modal.title, reserverName: form.name }) })
    setModal(null); setForm({ name:'', email:'', message:'' }); setLoading(false)
    setToast('🎉 Gift reserved! Thank you!'); setTimeout(() => setToast(''), 4000)
    fetchGifts()
  }

  const total = gifts.length
  const reserved = gifts.filter(g => g.reservations?.length > 0).length

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-pink-100 via-purple-50 to-indigo-100 border-b border-pink-200 py-10 px-4 text-center">
        <div className="text-5xl mb-3">🎂</div>
        <h1 className="text-3xl font-medium text-purple-800 mb-2">{settings.registry_title}</h1>
        {settings.welcome_message && <p className="text-gray-500 mb-4 max-w-md mx-auto">{settings.welcome_message}</p>}
        {daysUntil !== null && (
          <div className="inline-flex items-center gap-2 bg-white rounded-xl px-5 py-2 border border-purple-200 text-purple-700 font-medium">
            🎉 {daysUntil} days to go!
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-b border-gray-100 bg-white">
        {[['Total gifts', total, 'text-gray-800'], ['Reserved', reserved, 'text-green-600'], ['Available', total - reserved, 'text-purple-600']].map(([l,n,c]) => (
          <div key={l as string} className="py-4 text-center border-r last:border-r-0 border-gray-100">
            <div className={`text-2xl font-medium ${c}`}>{n}</div>
            <div className="text-xs text-gray-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-4 bg-white border-b border-gray-100">
        <input className="flex-1 min-w-[140px] text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="🔍  Search gifts…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {['Tech','Books','Fashion','Home','Other'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="">Sort by</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {/* Gift grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {filtered.map(g => {
          const isReserved = g.reservations?.length > 0
          return (
            <div key={g.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${isReserved ? 'border-gray-200 opacity-70' : 'border-gray-100 hover:border-purple-200 hover:shadow-md'}`}>
              {g.image_url
                ? <img src={g.image_url} alt={g.title} className="w-full h-40 object-cover" />
                : <div className="w-full h-40 bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-content-center text-5xl items-center justify-center">🎁</div>
              }
              <div className="p-4">
                {g.brand && <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{g.brand}</div>}
                <div className="font-medium text-sm mb-2 leading-snug">{g.title}</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor[g.priority] || 'bg-gray-100 text-gray-600'}`}>{priorityLabel[g.priority] || g.priority}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{g.category}</span>
                </div>
                <div className="text-lg font-medium text-purple-700 mb-3">₹{g.price?.toLocaleString('en-IN') || '—'}</div>
                {g.product_url && <a href={g.product_url} target="_blank" rel="noopener" className="text-xs text-purple-500 hover:underline block mb-3">View product →</a>}
                {isReserved
                  ? <div className="w-full text-center text-sm py-2 rounded-xl bg-gray-50 text-gray-400 border border-gray-100">✓ Reserved by {g.reservations[0].reserver_name}</div>
                  : <button onClick={() => setModal(g)} className="w-full text-sm py-2 rounded-xl border border-purple-400 text-purple-600 hover:bg-purple-600 hover:text-white transition-all font-medium">Reserve this gift</button>
                }
              </div>
            </div>
          )
        })}
      </div>

      {/* Reserve modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-medium text-base mb-1">Reserve: {modal.title}</h3>
            <p className="text-sm text-gray-400 mb-4">Let the birthday person know you're on it!</p>
            <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Your name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Email (optional)" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <textarea className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Leave a message (optional)" value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 text-sm rounded-xl border border-gray-200 text-gray-500">Cancel</button>
              <button onClick={reserve} disabled={loading || !form.name.trim()} className="flex-1 py-2 text-sm rounded-xl bg-purple-600 text-white font-medium disabled:opacity-50">{loading ? 'Reserving…' : 'Reserve gift 🎁'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </main>
  )
}