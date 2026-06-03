'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Gift = { id:string; title:string; brand:string; price:number; category:string; priority:string; is_available:boolean; product_url:string; image_url:string; description:string; delivery_address:string; delivery_date:string; delivery_notes:string; reservations:{reserver_name:string;reserver_email:string;message:string;reserved_at:string}[] }

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [gifts, setGifts] = useState<Gift[]>([])
  const [tab, setTab] = useState<'gifts'|'reservations'>('gifts')
  const [form, setForm] = useState<any>({title:'',brand:'',price:'',category:'Tech',priority:'nice_to_have',product_url:'',image_url:'',description:'',delivery_address:'',delivery_date:'',delivery_notes:''})
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
    setForm((f:any) => ({ ...f, ...data, product_url: scrapeUrl }))
    setScraping(false)
  }

  async function save() {
    const payload = { ...form, price: parseFloat(form.price) || 0 }
    if (editing) await supabase.from('gifts').update(payload).eq('id', editing)
    else await supabase.from('gifts').insert(payload)
    setForm({title:'',brand:'',price:'',category:'Tech',priority:'nice_to_have',product_url:'',image_url:'',description:'',delivery_address:'',delivery_date:'',delivery_notes:''})
    setEditing(null); fetchGifts()
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
    setForm({ title:g.title,brand:g.brand||'',price:g.price||'',category:g.category||'Tech',priority:g.priority||'nice_to_have',product_url:g.product_url||'',image_url:g.image_url||'',description:g.description||'',delivery_address:g.delivery_address||'',delivery_date:g.delivery_date||'',delivery_notes:g.delivery_notes||'' })
    setEditing(g.id)
  }

  const F = ({ label, k, type='text', opts }: { label:string, k:string, type?:string, opts?:string[] }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      {opts
        ? <select className="text-sm border border-gray-200 rounded-lg px-3 py-2" value={form[k]} onChange={e => setForm((f:any)=>({...f,[k]:e.target.value}))}>{opts.map(o=><option key={o} value={o.toLowerCase().replace(/ /g,'_')}>{o}</option>)}</select>
        : type==='textarea'
          ? <textarea className="text-sm border border-gray-200 rounded-lg px-3 py-2 h-16 resize-none" value={form[k]} onChange={e => setForm((f:any)=>({...f,[k]:e.target.value}))} />
          : <input type={type} className="text-sm border border-gray-200 rounded-lg px-3 py-2" value={form[k]} onChange={e => setForm((f:any)=>({...f,[k]:e.target.value}))} />
      }
    </div>
  )

  if (!authed) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-sm">
        <div className="text-2xl mb-2 text-center">🔐</div>
        <h1 className="text-lg font-medium text-center mb-6">Admin login</h1>
        <input type="password" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==='Enter' && login()} />
        <button onClick={login} className="w-full py-2 bg-purple-600 text-white rounded-xl text-sm font-medium">Sign in</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="font-medium text-lg">🎁 Admin dashboard</h1>
        <a href="/" className="text-sm text-purple-600 hover:underline">View public page →</a>
      </div>
      <div className="flex gap-2 px-6 pt-4">
        {(['gifts','reservations'] as const).map(t => <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm rounded-lg capitalize ${tab===t?'bg-purple-600 text-white':'bg-white border border-gray-200 text-gray-600'}`}>{t}</button>)}
      </div>

      <div className="p-6">
        {tab==='gifts' && <>
          {/* URL Scraper */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <label className="text-xs text-gray-400 block mb-2">Paste a product URL to auto-fill gift details</label>
            <div className="flex gap-2">
              <input className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2" placeholder="https://amazon.in/dp/B0C…" value={scrapeUrl} onChange={e=>setScrapeUrl(e.target.value)} />
              <button onClick={scrape} disabled={scraping} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg disabled:opacity-50">{scraping?'Fetching…':'Fetch details'}</button>
            </div>
          </div>

          {/* Add/edit form */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <h2 className="font-medium text-sm mb-4">{editing ? 'Edit gift' : 'Add new gift'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <F label="Title *" k="title" />
              <F label="Brand" k="brand" />
              <F label="Price (₹)" k="price" type="number" />
              <F label="Category" k="category" opts={['Tech','Books','Fashion','Home','Other']} />
              <F label="Priority" k="priority" opts={['Must have','Nice to have','Dream gift']} />
              <F label="Product URL" k="product_url" />
              <F label="Image URL" k="image_url" />
              <F label="Delivery date" k="delivery_date" type="date" />
            </div>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <F label="Description" k="description" type="textarea" />
              <F label="Delivery address" k="delivery_address" />
              <F label="Notes for gifter" k="delivery_notes" type="textarea" />
            </div>
            <div className="flex gap-2 justify-end">
              {editing && <button onClick={()=>{setEditing(null);setForm({title:'',brand:'',price:'',category:'Tech',priority:'nice_to_have',product_url:'',image_url:'',description:'',delivery_address:'',delivery_date:'',delivery_notes:''})}} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-500">Cancel</button>}
              <button onClick={save} className="px-5 py-2 bg-purple-600 text-white text-sm rounded-lg font-medium">{editing?'Save changes':'Add gift'}</button>
            </div>
          </div>

          {/* Gift list */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left p-3">Gift</th><th className="text-left p-3">Price</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th>
              </tr></thead>
              <tbody>
                {gifts.map(g => (
                  <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3"><div className="font-medium">{g.title}</div><div className="text-xs text-gray-400">{g.brand} · {g.category}</div></td>
                    <td className="p-3">₹{g.price?.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      {g.reservations?.length > 0
                        ? <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">Reserved by {g.reservations[0].reserver_name}</span>
                        : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Available</span>}
                    </td>
                    <td className="p-3">
                      <button onClick={()=>startEdit(g)} className="text-xs border border-gray-200 rounded px-2 py-1 mr-1 hover:bg-gray-50">Edit</button>
                      {g.reservations?.length > 0 && <button onClick={()=>unreserve(g.id)} className="text-xs border border-gray-200 rounded px-2 py-1 mr-1 hover:bg-gray-50">Unreserve</button>}
                      <button onClick={()=>deleteGift(g.id)} className="text-xs border border-red-200 text-red-400 rounded px-2 py-1 hover:bg-red-50">Delete</button>
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
              <thead><tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left p-3">Person</th><th className="text-left p-3">Gift</th><th className="text-left p-3">Message</th><th className="text-left p-3">Date</th>
              </tr></thead>
              <tbody>
                {gifts.filter(g=>g.reservations?.length>0).map(g=>g.reservations.map(r=>(
                  <tr key={g.id} className="border-b border-gray-50">
                    <td className="p-3"><div className="font-medium">{r.reserver_name}</div><div className="text-xs text-gray-400">{r.reserver_email||'No email'}</div></td>
                    <td className="p-3">{g.title}</td>
                    <td className="p-3 text-gray-500 text-xs">{r.message||'—'}</td>
                    <td className="p-3 text-xs text-gray-400">{new Date(r.reserved_at).toLocaleDateString()}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}