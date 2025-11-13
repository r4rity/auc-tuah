import React, { useState, useMemo, useEffect } from 'react'

export default function WeaponsSheetApp() {
  const [raw, setRaw] = useState('')
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [minQuality, setMinQuality] = useState('')
  const [minAccuracy, setMinAccuracy] = useState('')
  const [minDamage, setMinDamage] = useState('')
  const [minDefense, setMinDefense] = useState('')
  const [bonus1Filter, setBonus1Filter] = useState('Any')
  const [bonus2Filter, setBonus2Filter] = useState('Any')
  const [bonus1MinValue, setBonus1MinValue] = useState('')
  const [bonus2MinValue, setBonus2MinValue] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' })
  const [colorFilter, setColorFilter] = useState({ Yellow: true, Orange: true, Red: true })

  function parseCSV(csv) {
    const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(l => l)
    if (!lines.length) return []
    const delim = lines[0].includes('\t') ? '\t' : ','
    const headers = lines[0].split(delim).map(h => h.trim())

    return lines.slice(1).map(line => {
      const cols = line.split(delim)
      const obj = {}
      headers.forEach((h, i) => {
        let v = (cols[i] || '').trim()
        if (v === 'N/A') v = ''
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
        obj[h] = v
      })
      obj.Quality = Number(obj.Quality || 0)
      obj.Accuracy = Number(obj.Accuracy || 0)
      obj.Damage = Number(obj.Damage || 0)
      obj.Defense = Number(obj.Defense || 0)
      obj.ItemPrice = Number(obj.ItemPrice || 0)
      obj.Bonus1Value = Number(obj.Bonus1Value || 0)
      obj.Bonus2Value = Number(obj.Bonus2Value || 0)
      return obj
    })
  }

  function handlePasteOrUpload() { setRows(parseCSV(raw)) }
  function reset() {
    setRaw(''); setRows([]); setQuery(''); setMinQuality(''); setMinAccuracy(''); setMinDamage(''); setMinDefense('');
    setBonus1Filter('Any'); setBonus2Filter('Any'); setBonus1MinValue(''); setBonus2MinValue('');
    setColorFilter({ Yellow: true, Orange: true, Red: true });
    setSortConfig({ key: '', direction: 'asc' })
  }

  useEffect(() => {
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSWH5gVlpnYxhoWAG-1nJbxbHlGSsJ1NwlHjsYsCRf6Lu8WXal172tVV4ypk-LaTO_ANn3-4xvGsZu1/pub?gid=0&single=true&output=csv';

    const fetchData = () => {
      fetch(sheetURL)
        .then(res => res.text())
        .then(data => setRows(parseCSV(data)))
        .catch(err => console.error('Error fetching sheet:', err));
    }

    fetchData()
    const interval = setInterval(fetchData, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const bonusOptions = useMemo(() => {
    const setB = new Set()
    rows.forEach(r => { if(r.Bonus1Name) setB.add(r.Bonus1Name); if(r.Bonus2Name) setB.add(r.Bonus2Name) })
    return ['Any', ...Array.from(setB).sort()]
  }, [rows])

  const colorOrder = { Yellow: 1, Orange: 2, Red: 3 }

  const filtered = useMemo(() => {
    let data = rows
      .filter(r => query ? r.ItemName.toLowerCase().includes(query.toLowerCase()) : true)
      .filter(r => minQuality ? r.Quality >= Number(minQuality) : true)
      .filter(r => minAccuracy ? r.Accuracy >= Number(minAccuracy) : true)
      .filter(r => minDamage ? r.Damage >= Number(minDamage) : true)
      .filter(r => minDefense ? r.Defense >= Number(minDefense) : true)
      .filter(r => (bonus1Filter === 'Any' || r.Bonus1Name === bonus1Filter) && (bonus2Filter === 'Any' || r.Bonus2Name === bonus2Filter))
      .filter(r => bonus1MinValue ? r.Bonus1Value >= Number(bonus1MinValue) : true)
      .filter(r => bonus2MinValue ? r.Bonus2Value >= Number(bonus2MinValue) : true)
      .filter(r => colorFilter[r.Color])

    if(sortConfig.key) {
      data = [...data].sort((a, b) => {
        let aVal = a[sortConfig.key] ?? 0
        let bVal = b[sortConfig.key] ?? 0
        if(sortConfig.key === 'Color') {
          aVal = colorOrder[a.Color] ?? 0
          bVal = colorOrder[b.Color] ?? 0
        }
        if(aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if(aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return data
  }, [rows, query, minQuality, minAccuracy, minDamage, minDefense, bonus1Filter, bonus2Filter, bonus1MinValue, bonus2MinValue, sortConfig, colorFilter])

  function formatPrice(p) {
    if(p >= 1e9) return (p/1e9).toFixed(4).replace(/\.0+$/, '') + 'b'
    if(p >= 1e6) return (p/1e6).toFixed(4).replace(/\.0+$/, '') + 'm'
    if(p >= 1e3) return (p/1e3).toFixed(4).replace(/\.0+$/, '') + 'k'
    return p
  }

  function handleSort(key) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const sortableColumns = ['ItemPrice','Quality','Accuracy','Damage','Defense','Bonus1Value','Bonus2Value','Color']

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Weapons Sheet — UI & Filter</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder={`Paste CSV here. Header line required.`} className="col-span-1 md:col-span-2 h-40 p-3 border-2 rounded resize-none" />
        <div className="space-y-3">
          <button className="w-full p-3 rounded-lg border-2 bg-white hover:bg-gray-100" onClick={handlePasteOrUpload}>Load data</button>
          <button className="w-full p-3 rounded-lg border-2 bg-white hover:bg-gray-100" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input className="p-2 border-2 rounded" placeholder="Search ItemName" value={query} onChange={e=>setQuery(e.target.value)} />
        <input className="p-2 border-2 rounded w-36" placeholder="Min Quality" value={minQuality} onChange={e=>setMinQuality(e.target.value)} />
        <input className="p-2 border-2 rounded w-36" placeholder="Min Accuracy" value={minAccuracy} onChange={e=>setMinAccuracy(e.target.value)} />
        <input className="p-2 border-2 rounded w-36" placeholder="Min Damage" value={minDamage} onChange={e=>setMinDamage(e.target.value)} />
        <input className="p-2 border-2 rounded w-36" placeholder="Min Defense" value={minDefense} onChange={e=>setMinDefense(e.target.value)} />

        <select className="p-2 border-2 rounded" value={bonus1Filter} onChange={e=>setBonus1Filter(e.target.value)}>{bonusOptions.map(b=><option key={b} value={b}>{b}</option>)}</select>
        <input className="p-2 border-2 rounded w-24" placeholder="Bonus1 Min Value" value={bonus1MinValue} onChange={e=>setBonus1MinValue(e.target.value)} />
        <select className="p-2 border-2 rounded" value={bonus2Filter} onChange={e=>setBonus2Filter(e.target.value)}>{bonusOptions.map(b=><option key={b} value={b}>{b}</option>)}</select>
        <input className="p-2 border-2 rounded w-24" placeholder="Bonus2 Min Value" value={bonus2MinValue} onChange={e=>setBonus2MinValue(e.target.value)} />

        <div className="flex gap-2 items-center">
          {['Yellow','Orange','Red'].map(c => (
            <label key={c} className="flex items-center gap-1">
              <input type="checkbox" checked={colorFilter[c]} onChange={e=>setColorFilter(prev=>({...prev,[c]:e.target.checked}))} />
              {c}
            </label>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border-2 rounded">
        <table className="min-w-full divide-y divide-gray-200 table-auto text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b-2">
              {['ItemName','ItemPrice','Quality','Accuracy','Damage','Defense','Bonus1Name','Bonus1Value','Bonus2Name','Bonus2Value','Color','AuctionEnds'].map(col => (
                <th key={col} className="px-3 py-2 text-left font-medium cursor-pointer" onClick={() => sortableColumns.includes(col) && handleSort(col)}>
                  {col} {sortConfig.key === col ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {filtered.map((r,i)=>(
              <tr key={i} className="border-b-2 hover:bg-gray-50">
                <td className="px-3 py-2">{r.ItemName}</td>
                <td className="px-3 py-2">{formatPrice(r.ItemPrice)}</td>
                <td className="px-3 py-2">{r.Quality}</td>
                <td className="px-3 py-2">{r.Accuracy}</td>
                <td className="px-3 py-2">{r.Damage}</td>
                <td className="px-3 py-2">{r.Defense}</td>
                <td className="px-3 py-2">{r.Bonus1Name}</td>
                <td className="px-3 py-2">{r.Bonus1Value}</td>
                <td className="px-3 py-2">{r.Bonus2Name}</td>
                <td className="px-3 py-2">{r.Bonus2Value}</td>
                <td className="px-3 py-2">{r.Color}</td>
                <td className="px-3 py-2">{r.AuctionEnds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs text-gray-600">Notes: paste the CSV exported from your sheet or rely on auto-fetch. Filters and sorting remain functional. Auto-fetch occurs every 10 minutes.</div>
    </div>
  )
}