'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Gift = {
  id: string; title: string; description: string; image_url: string
  product_url: string; price: number; brand: string; category: string
  priority: string; is_available: boolean; reservations: { reserver_name: string }[]
}

const priorityLabel: Record<string,string> = {
  must_have: 'Must have', nice_to_have: 'Nice to have', dream_gift: 'Dream gift'
}
const priorityClass: Record<string,{ bg:string; text:string }> = {
  must_have: { bg: '#F4C0D1', text: '#72243E' },
  nice_to_have: { bg: '#B5D4F4', text: '#0C447C' },
  dream_gift: { bg: '#CECBF6', text: '#3C3489' }
}
const categoryIcon: Record<string,string> = {
  Tech: 'ti-device-laptop', Books: 'ti-book-2', Fashion: 'ti-shirt',
  Home: 'ti-home', Other: 'ti-gift'
}

export default function Home() {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('')
  const [modal, setModal] = useState<Gift | null>(null)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [settings, setSettings] = useState({ registry_title: 'My Birthday Wishlist', birthday_date: '', welcome_message: '' })

  useEffect(() => { fetchGifts(); fetchSettings() }, [])

  const filtered = (() => {
    let list = [...gifts]
    if (search) list = list.filter(g => g.title.toLowerCase().includes(search.toLowerCase()) || g.brand?.toLowerCase().includes(search.toLowerCase()))
    if (category) list = list.filter(g => g.category === category)
    if (sort === 'price-asc') list.sort((a,b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a,b) => b.price - a.price)
    if (sort === 'priority') list.sort((a,b) => ['must_have','nice_to_have','dream_gift'].indexOf(a.priority) - ['must_have','nice_to_have','dream_gift'].indexOf(b.priority))
    return list
  })()

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
    setToast('Gift reserved! Thank you.'); setTimeout(() => setToast(''), 4000)
    fetchGifts()
  }

  const total = gifts.length
  const reserved = gifts.filter(g => g.reservations?.length > 0).length

  return (
    <main style={{ minHeight: '100vh', width: '100%', background: '#fff', margin: '0 auto', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ background: '#FBEAF0', borderRadius: 20, padding: '36px 24px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F4C0D1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <i className="ti ti-gift" style={{ fontSize: 26, color: '#72243E' }}></i>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 500, color: '#72243E', marginBottom: 6 }}>{settings.registry_title}</h1>
          {settings.welcome_message && <p style={{ fontSize: 14, color: '#993556', marginBottom: 18, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>{settings.welcome_message}</p>}
          {daysUntil !== null && (
            <div style={{ display: 'inline-flex', background: 'white', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 22px', textAlign: 'center', borderRight: '0.5px solid #eee' }}>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#993556' }}>{daysUntil}</div>
                <div style={{ fontSize: 11, color: '#999' }}>days to go</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[['Total gifts', total, '#333'], ['Reserved', reserved, '#3B6D11'], ['Still available', total - reserved, '#993556']].map(([l,n,c]) => (
            <div key={l as string} style={{ background: '#FAF9F6', borderRadius: 14, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: c as string }}>{n}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            style={{ flex: 1, minWidth: 140, fontSize: 13, borderRadius: 12, border: '1.5px solid #000', padding: '9px 14px', color: '#000', background: '#fff' }}
            placeholder="Search gifts…" value={search} onChange={e => setSearch(e.target.value)}
          />
          <select style={{ fontSize: 13, borderRadius: 12, border: '1.5px solid #000', padding: '9px 14px', color: '#000', background: '#fff' }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
             {['Tech','Books','Fashion','Home','Other'].map(c => <option key={c}>{c}</option>)}
            </select>
            <select style={{ fontSize: 13, borderRadius: 12, border: '1.5px solid #000', padding: '9px 14px', color: '#000', background: '#fff' }} value={sort} onChange={e => setSort(e.target.value)}>
              <option value="">Sort by</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
              <option value="priority">Priority</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          {filtered.map(g => {
            const isReserved = g.reservations?.length > 0
            const pc = priorityClass[g.priority] || { bg: '#eee', text: '#666' }
            return (
              <div key={g.id} style={{ background: '#fff', border: '0.5px solid #eee', borderRadius: 18, overflow: 'hidden', opacity: isReserved ? 0.6 : 1 }}>
                <div style={{ position: 'relative', height: 140, background: '#FAECE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: pc.bg, color: pc.text }}>
                    {priorityLabel[g.priority] || g.priority}
                  </span>
                  {g.image_url
                    ? <img src={g.image_url} alt={g.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <i className={`ti ${categoryIcon[g.category] || 'ti-gift'}`} style={{ fontSize: 36, color: '#D85A30' }}></i>
                  }
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  {g.brand && <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{g.brand}</div>}
                  <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 8, lineHeight: 1.35 }}>{g.title}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#993556', marginBottom: 10 }}>₹{g.price?.toLocaleString('en-IN') || '—'}</div>
                  {g.product_url && (
                    <a href={g.product_url} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#D4537E', display: 'block', marginBottom: 10 }}>
                      View product <i className="ti ti-external-link" style={{ fontSize: 11 }}></i>
                    </a>
                  )}
                  {isReserved ? (
                    <div style={{ width: '100%', fontSize: 12, padding: 9, borderRadius: 12, background: '#f7f7f7', color: '#888', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <i className="ti ti-check" style={{ color: '#639922' }}></i> Reserved by {g.reservations[0].reserver_name}
                    </div>
                  ) : (
                    <button
                      onClick={() => setModal(g)}
                      style={{ width: '100%', fontSize: 12.5, padding: 9, borderRadius: 12, border: '0.5px solid #D4537E', color: '#993556', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Reserve this gift
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Reserve: {modal.title}</h3>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Let them know you&apos;re on it!</p>
            <input
              style={{ width: '100%', fontSize: 13, border: '0.5px solid #ddd', borderRadius: 12, padding: '9px 12px', marginBottom: 10 }}
              placeholder="Your name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            />
            <input
              style={{ width: '100%', fontSize: 13, border: '0.5px solid #ddd', borderRadius: 12, padding: '9px 12px', marginBottom: 10 }}
              placeholder="Email (optional)" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
            />
            <textarea
              style={{ width: '100%', fontSize: 13, border: '0.5px solid #ddd', borderRadius: 12, padding: '9px 12px', marginBottom: 16, height: 80, resize: 'none' }}
              placeholder="Leave a message (optional)" value={form.message} onChange={e => setForm({...form, message: e.target.value})}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 10, fontSize: 13, borderRadius: 12, border: '0.5px solid #ddd', background: 'transparent', color: '#888' }}>Cancel</button>
              <button onClick={reserve} disabled={loading || !form.name.trim()} style={{ flex: 1, padding: 10, fontSize: 13, borderRadius: 12, border: 'none', background: '#D4537E', color: '#fff', fontWeight: 500, opacity: loading || !form.name.trim() ? 0.5 : 1 }}>
                {loading ? 'Reserving…' : 'Reserve gift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#3B6D11', color: '#fff', fontSize: 13, padding: '10px 20px', borderRadius: 12, zIndex: 50 }}>
          {toast}
        </div>
      )}
    </main>
  )
}