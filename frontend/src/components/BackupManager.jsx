import { useState, useEffect } from 'react'
import { Download, Trash2, RefreshCw, Database, Clock, FileText, AlertCircle } from 'lucide-react'
import axios from 'axios'

export default function BackupManager({ user }) {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  const fetchBackups = async () => {
    try {
      const res = await axios.get('/api/backup/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBackups(res.data.backups || [])
    } catch (err) {
      setError('فشل جلب النسخ')
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') fetchBackups()
  }, [user])

  const createBackup = async () => {
    setCreating(true)
    setError('')
    try {
      const res = await axios.post('/api/backup/create', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('✅ ' + res.data.message)
      fetchBackups()
    } catch (err) {
      setError(err.response?.data?.error || 'فشل إنشاء النسخة')
    } finally {
      setCreating(false)
    }
  }

  const downloadBackup = (filename) => {
    window.open(`/api/backup/download/${filename}?token=${token}`, '_blank')
  }

  const deleteBackup = async (filename) => {
    if (!confirm(`هل أنت متأكد من حذف ${filename}؟`)) return
    try {
      await axios.delete(`/api/backup/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchBackups()
    } catch (err) {
      alert('فشل الحذف')
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (user?.role !== 'admin') return null

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '1rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      direction: 'rtl'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={20} /> النسخ الاحتياطي
        </h3>
        <button
          onClick={createBackup}
          disabled={creating}
          style={{
            background: creating ? '#94a3b8' : '#10b981',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: creating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '600'
          }}
        >
          {creating ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
          {creating ? 'جاري الإنشاء...' : 'إنشاء نسخة الآن'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
        <Clock size={14} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
        يتم إنشاء نسخ احتياطي تلقائي يومياً الساعة 3:00 صباحاً
      </div>

      {backups.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
          <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
          لا توجد نسخ احتياطية
        </div>
      ) : (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {backups.map(backup => (
            <div
              key={backup.name}
              style={{
                padding: '0.75rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>{backup.name}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  {formatSize(backup.size)} • {new Date(backup.created).toLocaleString('ar-SA')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => downloadBackup(backup.name)}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem'
                  }}
                >
                  <Download size={12} /> تحميل
                </button>
                <button
                  onClick={() => deleteBackup(backup.name)}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '0.375rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="حذف"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}