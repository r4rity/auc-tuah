import React, { useState, useMemo, useEffect } from 'react';
import './index.css';

export default function WeaponsSheetApp() {
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [minQuality, setMinQuality] = useState('');
  const [minAccuracy, setMinAccuracy] = useState('');
  const [minDamage, setMinDamage] = useState('');
  const [minDefense, setMinDefense] = useState('');
  const [bonus1Filter, setBonus1Filter] = useState('');
  const [bonus2Filter, setBonus2Filter] = useState('');
  const [bonus1MinValue, setBonus1MinValue] = useState('');
  const [bonus2MinValue, setBonus2MinValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [colorFilter, setColorFilter] = useState({ Yellow: true, Orange: true, Red: true });

  function parseCSV(csv) {
    const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const delim = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delim).map(h => h.trim());

    return lines.slice(1).map(line => {
      const cols = line.split(delim);
      const obj = {};
      headers.forEach((h, i) => {
        let v = (cols[i] || '').trim();
        if (v === 'N/A') v = '';
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        obj[h] = v;
      });

      obj.Quality = Number(obj.Quality || 0);
      obj.Accuracy = Number(obj.Accuracy || 0);
      obj.Damage = Number(obj.Damage || 0);
      obj.Defense = Number(obj.Defense || 0);
      obj.ItemPrice = Number(obj.ItemPrice || 0);
      obj.Bonus1Value = Number(obj.Bonus1Value || 0);
      obj.Bonus2Value = Number(obj.Bonus2Value || 0);
      return obj;
    });
  }

  function handlePasteOrUpload() {
    setRows(parseCSV(raw));
  }

  function reset() {
    setRaw('');
    setRows([]);
    setQuery('');
    setMinQuality('');
    setMinAccuracy('');
    setMinDamage('');
    setMinDefense('');
    setBonus1Filter('');
    setBonus2Filter('');
    setBonus1MinValue('');
    setBonus2MinValue('');
    setColorFilter({ Yellow: true, Orange: true, Red: true });
    setSortConfig({ key: '', direction: 'asc' });
  }

  useEffect(() => {
    const sheetURL =
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vSWH5gVlpnYxhoWAG-1nJbxbHlGSsJ1NwlHjsYsCRf6Lu8WXal172tVV4ypk-LaTO_ANn3-4xvGsZu1/pub?gid=0&single=true&output=csv';

    const fetchData = () => {
      fetch(sheetURL)
        .then(res => res.text())
        .then(data => setRows(parseCSV(data)))
        .catch(err => console.error('Error fetching sheet:', err));
    };

    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const colorOrder = { Yellow: 1, Orange: 2, Red: 3 };

  const filtered = useMemo(() => {
    let data = rows
      // ItemName multi-term partial match
      .filter(r => {
        if (!query) return true;
        const terms = query
          .split(',')
          .map(t => t.trim().toLowerCase())
          .filter(Boolean);
        return terms.some(term =>
          r.ItemName.toLowerCase().includes(term)
        );
      })
      // Numeric filters
      .filter(r => (minQuality ? r.Quality >= Number(minQuality) : true))
      .filter(r => (minAccuracy ? r.Accuracy >= Number(minAccuracy) : true))
      .filter(r => (minDamage ? r.Damage >= Number(minDamage) : true))
      .filter(r => (minDefense ? r.Defense >= Number(minDefense) : true))
      // Bonus1 multi-term partial match
      .filter(r => {
        if (bonus1Filter) {
          const terms1 = bonus1Filter
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);
          if (!terms1.some(t => r.Bonus1Name.toLowerCase().includes(t))) return false;
        }
        return true;
      })
      // Bonus2 multi-term partial match
      .filter(r => {
        if (bonus2Filter) {
          const terms2 = bonus2Filter
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);
          if (!terms2.some(t => r.Bonus2Name.toLowerCase().includes(t))) return false;
        }
        return true;
      })
      // Min bonus values
      .filter(r => (bonus1MinValue ? r.Bonus1Value >= Number(bonus1MinValue) : true))
      .filter(r => (bonus2MinValue ? r.Bonus2Value >= Number(bonus2MinValue) : true))
      // Color filter
      .filter(r => colorFilter[r.Color]);

    // Sorting
    if (sortConfig.key) {
      data = [...data].sort((a, b) => {
        let aVal = a[sortConfig.key] ?? 0;
        let bVal = b[sortConfig.key] ?? 0;

        if (sortConfig.key === 'Color') {
          aVal = colorOrder[a.Color] ?? 0;
          bVal = colorOrder[b.Color] ?? 0;
        }

        if (sortConfig.key === 'AuctionEnds') {
          const parseCustomDate = str => {
            const match = str.match(/(\d{2}):(\d{2}):(\d{2}) - (\d{2})\/(\d{2})\/(\d{2})/);
            if (!match) return 0;
            const [_, h, m, s, d, mo, y] = match;
            return new Date(`20${y}-${mo}-${d}T${h}:${m}:${s}`).getTime();
          };
          aVal = parseCustomDate(a.AuctionEnds);
          bVal = parseCustomDate(b.AuctionEnds);
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [
    rows,
    query,
    minQuality,
    minAccuracy,
    minDamage,
    minDefense,
    bonus1Filter,
    bonus2Filter,
    bonus1MinValue,
    bonus2MinValue,
    sortConfig,
    colorFilter
  ]);

  function formatPrice(p) {
    if (p >= 1e9) return (p / 1e9).toFixed(4).replace(/\.0+$/, '') + 'b';
    if (p >= 1e6) return (p / 1e6).toFixed(4).replace(/\.0+$/, '') + 'm';
    if (p >= 1e3) return (p / 1e3).toFixed(4).replace(/\.0+$/, '') + 'k';
    return p;
  }

  function handleSort(key) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }

  const sortableColumns = [
    'ItemPrice',
    'Quality',
    'Accuracy',
    'Damage',
    'Defense',
    'Bonus1Value',
    'Bonus2Value',
    'Color',
    'AuctionEnds'
  ];

  return (
    <div className="app-container dark-mode">
      <h1>Weapons Sheet — UI & Filter</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder="Paste CSV here. Header line required."
          style={{ flexGrow: 2, height: '120px', padding: '0.5rem' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={handlePasteOrUpload}>Load data</button>
          <button onClick={reset}>Reset</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input placeholder="Search ItemName" value={query} onChange={e => setQuery(e.target.value)} />
        <input placeholder="Min Quality" value={minQuality} onChange={e => setMinQuality(e.target.value)} />
        <input placeholder="Min Accuracy" value={minAccuracy} onChange={e => setMinAccuracy(e.target.value)} />
        <input placeholder="Min Damage" value={minDamage} onChange={e => setMinDamage(e.target.value)} />
        <input placeholder="Min Defense" value={minDefense} onChange={e => setMinDefense(e.target.value)} />

        <input
          placeholder="Bonus1 (comma-separated)"
          value={bonus1Filter}
          onChange={e => setBonus1Filter(e.target.value)}
        />
        <input placeholder="Bonus1 Min Value" value={bonus1MinValue} onChange={e => setBonus1MinValue(e.target.value)} />

        <input
          placeholder="Bonus2 (comma-separated)"
          value={bonus2Filter}
          onChange={e => setBonus2Filter(e.target.value)}
        />
        <input placeholder="Bonus2 Min Value" value={bonus2MinValue} onChange={e => setBonus2MinValue(e.target.value)} />

        {['Yellow', 'Orange', 'Red'].map(c => (
          <label key={c}>
            <input
              type="checkbox"
              checked={colorFilter[c]}
              onChange={e =>
                setColorFilter(prev => ({ ...prev, [c]: e.target.checked }))
              }
            />{' '}
            {c}
          </label>
        ))}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {[
                'ItemName',
                'ItemPrice',
                'Quality',
                'Accuracy',
                'Damage',
                'Defense',
                'Bonus1Name',
                'Bonus1Value',
                'Bonus2Name',
                'Bonus2Value',
                'Color',
                'AuctionEnds'
              ].map(col => (
                <th
                  key={col}
                  onClick={() => sortableColumns.includes(col) && handleSort(col)}
                >
                  {col}{' '}
                  {sortConfig.key === col
                    ? sortConfig.direction === 'asc'
                      ? '↑'
                      : '↓'
                    : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td>{r.ItemName}</td>
                <td>{formatPrice(r.ItemPrice)}</td>
                <td>{r.Quality}</td>
                <td>{r.Accuracy}</td>
                <td>{r.Damage}</td>
                <td>{r.Defense}</td>
                <td>{r.Bonus1Name}</td>
                <td>{r.Bonus1Value}</td>
                <td>{r.Bonus2Name}</td>
                <td>{r.Bonus2Value}</td>
                <td>{r.Color}</td>
                <td>{r.AuctionEnds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>
        Notes: paste the CSV exported from your sheet or rely on auto-fetch. Filters and sorting remain functional. Auto-fetch occurs every 10 minutes.
      </div>
    </div>
  );
}
