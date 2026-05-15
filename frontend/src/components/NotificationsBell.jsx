import { useState, useEffect } from 'react'
import { Bell, X, Check, Trash2, ExternalLink } from 'lucide-react'
import axios from 'axios'

export default function NotificationsBell({ user }) {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const token = localStorage.getItem('token')

  // جلب الإشعارات
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(res.data.notifications || [])
    } catch (err) {
      console.error('Failed to fetch notifications')
    }
  }

  // تحديث دوري كل 30 ثانية
  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  // وضع علامة مقروء
  const markAsRead = async (id) => {
    await axios.patch(`/api/notifications/${id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchNotifications()
  }

  // حذف إشعار
  const deleteNotification = async (id) => {
    await axios.delete(`/api/notifications/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchNotifications()
  }

  // قراءة الكل
  const markAllAsRead = async () => {
    await axios.patch('/api/notifications/read-all', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchNotifications()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const typeColors = {
    info: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    request: '#8b5cf6'
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* زر الجرس */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications() }}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          padding: '0.5rem',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          position: 'relative'
        }}
        title="الإشعارات"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* قائمة الإشعارات */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          width: '320px',
          maxHeight: '400px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden',
          direction: 'rtl'
        }}>
          {/* الهيدر */}
          <div style={{
            padding: '1rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h4 style={{ margin: 0, color: '#334155' }}>🔔 الإشعارات</h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                وضع الكل كمقروء
              </button>
            )}
          </div>

          {/* القائمة */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                لا توجد إشعارات جديدة 🎉
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid #f1f5f9',
                    background: !notif.is_read ? '#eff6ff' : 'white',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    markAsRead(notif.id)
                    if (notif.link) window.location.href = notif.link
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: typeColors[notif.type] || '#64748b',
                      marginTop: '6px',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
                        {notif.title}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {notif.message}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                        {new Date(notif.created_at).toLocaleString('ar-SA')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id) }}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}
                          title="مقروء"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}