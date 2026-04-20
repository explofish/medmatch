'use client'

import { useState, useEffect } from 'react'

interface Signup {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  updatedAt: string
}

interface Stats {
  total: number
  byRole: { role: string; count: number }[]
  last7Days: number
  dailyStats: Record<string, number>
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [signups, setSignups] = useState<Signup[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const login = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/signups?limit=100', {
        headers: { 'Authorization': `Bearer ${password}` }
      })
      
      if (res.status === 401) {
        setError('Invalid password')
        setLoading(false)
        return
      }
      
      if (!res.ok) throw new Error('Failed to fetch')
      
      const data = await res.json()
      setSignups(data.signups)
      setStats(data.stats)
      setIsAuthenticated(true)
      // Store in sessionStorage for refresh
      sessionStorage.setItem('adminToken', password)
    } catch (err) {
      setError('Failed to load data')
    }
    setLoading(false)
  }

  // Auto-login if token exists
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken')
    if (token) {
      setPassword(token)
      // Will trigger login on next render cycle
      setTimeout(() => {
        fetch('/api/admin/signups?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Auth failed')
        })
        .then(data => {
          setSignups(data.signups)
          setStats(data.stats)
          setIsAuthenticated(true)
        })
        .catch(() => {
          sessionStorage.removeItem('adminToken')
        })
      }, 0)
    }
  }, [])

  const exportCSV = () => {
    const headers = ['ID', 'Email', 'Name', 'Role', 'Created At', 'Updated At']
    const rows = signups.map(s => [
      s.id,
      s.email,
      s.name || '',
      s.role,
      new Date(s.createdAt).toLocaleString('de-DE'),
      new Date(s.updatedAt).toLocaleString('de-DE')
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signups-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredSignups = signups.filter(s => 
    s.email.toLowerCase().includes(filter.toLowerCase()) ||
    (s.name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
    s.role.toLowerCase().includes(filter.toLowerCase())
  )

  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#333' }}>
            Admin Dashboard
          </h1>
          <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '14px' }}>
            MedMatch Candidate Signups
          </p>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && login()}
            placeholder="Enter admin password"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              marginBottom: '16px',
              boxSizing: 'border-box'
            }}
          />
          
          {error && (
            <p style={{ color: '#e74c3c', fontSize: '14px', margin: '0 0 16px 0' }}>
              {error}
            </p>
          )}
          
          <button
            onClick={login}
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              background: loading || !password ? '#ccc' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <header style={{ 
        background: 'white', 
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>
            MedMatch Admin
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Candidate Signups Dashboard
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={exportCSV}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('adminToken')
              setIsAuthenticated(false)
              setSignups([])
              setStats(null)
            }}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Stats Cards */}
        {stats && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                Total Signups
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>
                {stats.total.toLocaleString()}
              </p>
            </div>
            
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                Last 7 Days
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                {stats.last7Days.toLocaleString()}
              </p>
            </div>
            
            {stats.byRole.map(r => (
              <div key={r.role} style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  {r.role === 'GRADUATE' ? 'Graduates' : r.role === 'EMPLOYER' ? 'Employers' : 'Admins'}
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>
                  {r.count.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filter */}
        <div style={{ 
          background: 'white', 
          padding: '16px 20px', 
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '16px'
        }}>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by email, name, or role..."
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '10px 14px',
              fontSize: '14px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px'
            }}
          />
          <span style={{ marginLeft: '12px', fontSize: '14px', color: '#64748b' }}>
            Showing {filteredSignups.length} of {signups.length} signups
          </span>
        </div>

        {/* Signups Table */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Email
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Name
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Role
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Signup Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSignups.map((signup) => (
                <tr key={signup.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b' }}>
                    {signup.email}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#475569' }}>
                    {signup.name || '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: signup.role === 'GRADUATE' ? '#dbeafe' : signup.role === 'EMPLOYER' ? '#dcfce7' : '#fef3c7',
                      color: signup.role === 'GRADUATE' ? '#1e40af' : signup.role === 'EMPLOYER' ? '#166534' : '#92400e'
                    }}>
                      {signup.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#475569' }}>
                    {new Date(signup.createdAt).toLocaleString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSignups.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No signups found matching your filter.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
