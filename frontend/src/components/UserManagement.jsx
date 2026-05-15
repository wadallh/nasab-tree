import { useState, useEffect } from 'react'
import { Users, Shield, UserPlus, X, Check, Activity, Lock, RefreshCw } from 'lucide-react'
import axios from 'axios'

export default function UserManagement({ user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSessions, setShowSessions] = useState(false)

  const token = localStorage.getItem('token')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data.users || [])
    } catch (err) {
      console.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') fetchUsers()
  }, [user])

  const promoteUser = async (id) => {
    if (!confirm('هل تريد ترقية هذا المستخدم إلى مشرف؟')) return
    try {
      await axios.patch(`/api/users/${id}/promote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchUsers()
    } catch (err) {
      alert('فشل الترقية')
    }
  }

  const demoteUser = async (id) => {
    if (!confirm('هل تريد إزالة صلاحية المشرف؟')) return
    try {
      await axios.patch(`/api/users/${id}/demote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchUsers()
    } catch (err) {
      alert('فشل التعديل')
    }
  }

  const toggleUserStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus
    if (!confirm(newStatus ? 'تفعيل الحساب؟' : 'تعطيل الحساب؟')) return
    try {
      await axios.patch(`/api/users/${id}/toggle-status`, 
        { is_active: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchUsers()
    } catch (err) {
      alert('فشل التعديل')
    }
  }

  // ✅ إعادة تعيين كلمة المرور
  const resetPassword = async (userId, userName) => {
    if (!confirm(`⚠️ هل تريد إعادة تعيين كلمة مرور "${userName}" إلى 000000؟\n\nسيُطلب من المستخدم تغييرها فور تسجيل الدخول التالي.`)) return
    
    try {
      const adminId = JSON.parse(localStorage.getItem('user'))?.id || user?.id
      const res = await axios.post(`/api/auth/reset-password/${userId}`, 
        { admin_id: adminId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert(`✅ ${res.data.message}\n\n📋 كلمة المرور الافتراضية الجديدة: 000000`)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.error || 'فشل إعادة تعيين كلمة المرور')
    }
  }

  const getRoleBadge = (role) => {
    const badges = {
      admin: { color: '#ef4444', text: '👑 مدير', bg: '#fee2e2' },
      supervisor: { color: '#8b5cf6', text: '🛡️ مشرف', bg: '#ede9fe' },
      member: { color: '#10b981', text: '👤 عضو', bg: '#d1fae5' }
    }
    const badge = badges[role] || badges.member
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        background: badge.bg,
        color: badge.color,
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        display: 'inline-block'
      }}>
        {badge.text}
      </span>
    )
  }

  if (user?.role !== 'admin') return null

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '1rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      direction: 'rtl',
      marginTop: '1.5rem',
      borderTop: '1px solid #e2e8f0',
      paddingTop: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} /> إدارة المستخدمين ({users.length})
        </h3>
        <button
          onClick={() => setShowSessions(!showSessions)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem'
          }}
        >
          <Activity size={16} /> سجل الجلسات
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <RefreshCw size={18} className="animate-spin" /> جاري التحميل...
        </div>
      ) : (
        <div style={{ maxHeight: '400px', overflowX: 'auto', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: '600px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
              <tr>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>الاسم</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>رقم الجوال</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>البريد الإلكتروني</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>الصلاحية</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>الحالة</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} 
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} 
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '0.75rem', color: '#0f172a', fontWeight: '600' }}>{u.full_name}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>{u.phone}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{u.email || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{getRoleBadge(u.role)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ color: u.is_active ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      {u.is_active ? 'نشط ✅' : 'معطل ⛔'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {u.role === 'member' && (
                        <button onClick={() => promoteUser(u.id)} title="ترقية لمشرف"
                          style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                          <Shield size={14} /> ترقية
                        </button>
                      )}
                      {u.role === 'supervisor' && (
                        <button onClick={() => demoteUser(u.id)} title="إزالة الإشراف"
                          style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                          <UserPlus size={14} /> إلغاء
                        </button>
                      )}
                      <button onClick={() => toggleUserStatus(u.id, u.is_active)} 
                        title={u.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        style={{ 
                          background: u.is_active ? '#ef4444' : '#10b981', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.35rem 0.6rem', 
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem'
                        }}>
                        {u.is_active ? <X size={14} /> : <Check size={14} />} {u.is_active ? 'تعطيل' : 'تفعيل'}
                      </button>
                      
                      {/* ✅ زر إعادة تعيين كلمة المرور */}
                      <button onClick={() => resetPassword(u.id, u.full_name)} title="إعادة تعيين كلمة المرور إلى 000000"
                        style={{ 
                          background: '#f97316', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.35rem 0.6rem', 
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem'
                        }}>
                        <Lock size={14} /> إعادة تعيين
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSessions && <SessionLogs onClose={() => setShowSessions(false)} />}
    </div>
  )
}

// ✅ مكون سجل الجلسات
function SessionLogs({ onClose }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const token = localStorage.getItem('token')

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true)
      try {
        const res = await axios.get('/api/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSessions(res.data.sessions || [])
      } catch (err) {
        console.error('Failed to fetch sessions')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      direction: 'rtl'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📊 سجل الجلسات</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={20} className="animate-spin" style={{ marginLeft: '0.5rem' }} /> جاري تحميل السجل...
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>المستخدم</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>البريد الإلكتروني</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>الإجراء</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>IP</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600' }}>{s.user_name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{s.user_email || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: s.action === 'login' ? '#d1fae5' : '#fee2e2',
                        color: s.action === 'login' ? '#065f46' : '#991b1b',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {s.action === 'login' ? '🔐 دخول' : '🚪 خروج'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>{s.ip_address || '-'}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(s.created_at).toLocaleString('ar-SA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}