'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Gift = { id:string; title:string; brand:string; price:number; category:string; priority:string; is_available:boolean; product_url:string; image_url:string; description:string; delivery_address:string; delivery_date:string; delivery_notes:string; reservations:{reserver_name:string;reserver_email:string;message:string;reserved_at:string}[] }
type FormState = { title:string; brand:string; price:string|number; category:string; priority:string; product_url:string; image_url:string; description:string; delivery_address:string; delivery_date:string; delivery_notes:string }

const emptyForm: FormState = { title:'', brand:'', price:'', category:'Tech', priority:'nice_to_have', product_url:'', image_url:'', description:'', delivery_address:'', delivery_date:'', delivery_notes:'' }

function Field({ label, k, type='text', opts, form, setForm }: { label:string; k:keyof FormState; type?:string; opts?:string[]; form:FormState; setForm:(f:FormState)=>void }) {
  const val = String(form[k] ?? '')
  const cls = "text-sm border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-300"
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      {opts
        ? <select className={cls} value={val} onChange={e => setForm({...form, [k]: e.target.value})}>
            {opts.map(o => <option key={o} value={o.toLowerCase().replace(/ /g,'_')}>{o}</option>)}
          </select>
        : type==='textarea'
          ? <textarea className={cls+' h-16 resize-none'} value={val} onChange={e => setForm({...form, [k]: e.target.value})} />
          : <input type={type} className={cls} value={val} onChange={e => setForm({...form, [k]: e.target.value})} />
      }
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [gifts, setGifts] = useState<Gift[]>([])
  const [tab, setTab] = useState<'gifts'|'reservations'>('gifts')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<string|null>(null)
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [scraping, setScraping] = useState(false)

  async function login() {
    const res = await fetch('/api/admin-auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password:pw}) })
    if (res.ok) { setAuthed(true); fetchGifts() }
    else alert('Wrong password')
  }

  async function fetchGifts() {
    const { data } = await supabase.from('gifts').select('*, reservations(reserver_name,reserver_email,message,reserved_at)').order('created_at')
    setGifts(data || [])
  }

  async function scrape() {
    if (!scrapeUrl) return
    setScraping(true)
    const res = await fetch('/api/scrape', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url: scrapeUrl }) })
    const data = await res.json()
    setForm(f => ({ ...f, ...data, product_url: scrapeUrl }))
    setScraping(false)
  }

  async function save() {
    const payload = { ...form, price: parseFloat(String(form.price)) || 0 }
    if (editing) await supabase.from('gifts').update(payload).eq('id', editing)
    else await supabase.from('gifts').insert(payload)
    setForm(emptyForm)
    setEditing(null)
    fetchGifts()
  }

  async function deleteGift(id: string) {
    if (!confirm('Delete this gift?')) return
    await supabase.from('gifts').delete().eq('id', id)
    fetchGifts()
  }

  async function unreserve(giftId: string) {
    await supabase.from('reservations').delete().eq('gift_id', giftId)
    fetchGifts()
  }

  function startEdit(g: Gift) {
    setForm({ title:g.title, brand:g.brand||'', price:g.price||'', category:g.category||'Tech', priority:g.priority||'nice_to_have', product_url:g.product_url||'', image_url:g.image_url||'', description:g.description||'', delivery_address:g.delivery_address||'', delivery_date:g.delivery_date||'', delivery_notes:g.delivery_notes||'' })
    setEditing(g.id)
  }

  const f = (label:string, k:keyof FormState, type?:string, opts?:string[]) => (
    <Field label={label} k={k} type={type} opts={opts} form={form} setForm={setForm} />
  )

  if (!authed) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-sm">
        <div className="text-2xl mb-2 text-center">🔐</div>
        <h1 className="text-lg font-medium text-center mb-6">Admin login</h1>
        <input type="password" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==='Enter' && login()} />
        <button onClick={login} className="w-full py-2 bg-purple-600 text-white rounded-xl text-sm font-medium">Sign in</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="font-medium text-lg">🎁 Admin dashboard</h1>
        <Link href="/" className="text-sm text-purple-600 hover:underline">View public page →</Link>
      </div>

      <div className="flex gap-2 px-6 pt-4">
        {(['gifts','reservations'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm rounded-lg capitalize ${tab===t ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{t}</button>
        ))}
      </div>

      <div className="p-6">
        {tab==='gifts' && <>
          {/* URL Scraper */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <label className="text-xs text-gray-400 block mb-2">Paste a product URL to auto-fill gift details</label>
            <div className="flex gap-2">
              <input className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="https://amazon.in/dp/B0C…" value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} />
              <button onClick={scrape} disabled={scraping} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg disabled:opacity-50 whitespace-nowrap">{scraping ? 'Fetching…' : 'Fetch details'}</button>
            </div>
          </div>

          {/* Add/Edit Form */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <h2 className="font-medium text-sm mb-4">{editing ? 'Edit gift' : 'Add new gift'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {f('Title *', 'title')}
              {f('Brand', 'brand')}
              {f('Price (₹)', 'price', 'number')}
              {f('Category', 'category', undefined, ['Tech','Books','Fashion','Home','Other'])}
              {f('Priority', 'priority', undefined, ['Must have','Nice to have','Dream gift'])}
              {f('Product URL', 'product_url')}
              {f('Image URL', 'image_url')}
              {f('Delivery date', 'delivery_date', 'date')}
            </div>
            <div className="grid grid-cols-1 gap-3 mb-4">
              {f('Description', 'description', 'textarea')}
              {f('Delivery address', 'delivery_address')}
              {f('Notes for gifter', 'delivery_notes', 'textarea')}
            </div>
            <div className="flex gap-2 justify-end">
              {editing && (
                <button onClick={() => { setEditing(null); setForm(emptyForm) }} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-500">Cancel</button>
              )}
              <button onClick={save} className="px-5 py-2 bg-purple-600 text-white text-sm rounded-lg font-medium">{editing ? 'Save changes' : 'Add gift'}</button>
            </div>
          </div>

          {/* Gift Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="text-left p-3">Gift</th>
                  <th className="text-left p-3">Price</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gifts.map(g => (
                  <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{g.title}</div>
                      <div className="text-xs text-gray-400">{g.brand} · {g.category}</div>
                    </td>
                    <td className="p-3">₹{g.price?.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      {g.reservations?.length > 0
                        ? <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">Reserved by {g.reservations[0].reserver_name}</span>
                        : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Available</span>
                      }
                    </td>
                    <td className="p-3 flex gap-1 flex-wrap">
                      <button onClick={() => startEdit(g)} className="text-xs border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">Edit</button>
                      {g.reservations?.length > 0 && <button onClick={() => unreserve(g.id)} className="text-xs border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">Unreserve</button>}
                      <button onClick={() => deleteGift(g.id)} className="text-xs border border-red-200 text-red-400 rounded px-2 py-1 hover:bg-red-50">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {tab==='reservations' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="text-left p-3">Person</th>
                  <th className="text-left p-3">Gift</th>
                  <th className="text-left p-3">Message</th>
                  <th className="text-left p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {gifts.filter(g => g.reservations?.length > 0).map(g =>
                  g.reservations.map(r => (
                    <tr key={g.id+r.reserved_at} className="border-b border-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{r.reserver_name}</div>
                        <div className="text-xs text-gray-400">{r.reserver_email || 'No email'}</div>
                      </td>
                      <td className="p-3">{g.title}</td>
                      <td className="p-3 text-gray-500 text-xs">{r.message || '—'}</td>
                      <td className="p-3 text-xs text-gray-400">{new Date(r.reserved_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}