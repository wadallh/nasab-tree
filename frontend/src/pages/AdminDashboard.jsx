import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Activity, Heart, Skull, Shield, Clock, CheckCircle, XCircle } from 'lucide-react'
import { getPendingRequests, processRequest } from '../services/api'

export default function AdminPanel({ user, onLogout }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, alive: 0, deceased: 0, martyr: 0 })
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // جلب الإحصائيات (يمكن تعديلها حسب API الخاص بك)
      const treeRes = await fetch('/api/tree')
      const treeData = await treeRes.json()
      const persons = treeData.persons || []
      
      setStats({
        total: persons.length,
        alive: persons.filter(p => p.status === 'alive').length,
        deceased: persons.filter(p => p.status === 'deceased').length,
        martyr: persons.filter(p => p.status === 'martyr').length
      })

      // جلب الطلبات المعلقة
      const reqRes = await getPendingRequests()
      setRequests(reqRes.data?.requests || [])
    } catch (err) {
      console.error('فشل تحميل البيانات:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessRequest = async (requestId, action) => {
    try {
      const note = prompt(action === 'approve' ? 'ملاحظة الموافقة (اختياري):' : 'سبب الرفض:') || ''
      await processRequest(requestId, action, note)
      alert(action === 'approve' ? '✅ تمت الموافقة على الطلب' : '❌ تم رفض الطلب')
      loadData()
    } catch (err) {
      alert('خطأ: ' + err.message)
    }
  }

  const statCards = [
    { label: 'إجمالي الأفراد', value: stats.total, icon: Users, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'الأحياء', value: stats.alive, icon: Activity, color: '#10b981', bg: '#ecfdf5' },
    { label: 'الشهداء', value: stats.martyr, icon: Heart, color: '#ef4444', bg: '#fef2f2' },
    { label: 'المتوفين', value: stats.deceased, icon: Skull, color: '#64748b', bg: '#f8fafc' }
  ]

  return (
    <div className="admin-wrapper">
      {/* الهيدر */}
      <header className="admin-header">
        <button onClick={() => navigate('/')} className="btn-back">
          <ArrowLeft size={20} />
          <span>رجوع</span>
        </button>
        <div className="header-title">
          <h1>👑 لوحة تحكم المدير</h1>
          <p>إدارة الطلبات والإحصائيات والصلاحيات</p>
        </div>
        <button onClick={onLogout} className="btn-logout">
          خروج
        </button>
      </header>

      <main className="admin-main">
        {/* الإحصائيات */}
        <section className="stats-section">
          <h2 className="section-title">📊 إحصائيات العائلة</h2>
          <div className="stats-grid">
            {statCards.map((stat, idx) => {
              const Icon = stat.icon
              return (
                <div key={idx} className="stat-card" style={{ backgroundColor: stat.bg }}>
                  <div className="stat-icon" style={{ color: stat.color }}>
                    <Icon size={32} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">{stat.label}</span>
                    <span className="stat-value" style={{ color: stat.color }}>{stat.value}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* الطلبات المعلقة */}
        <section className="requests-section">
          <div className="section-header">
            <h2 className="section-title">
              <Clock size={24} color="#f59e0b" />
              الطلبات المعلقة ({requests.length})
            </h2>
          </div>

          {loading ? (
            <div className="loading">جاري تحميل الطلبات...</div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <Shield size={64} color="#94a3b8" />
              <h3>لا توجد طلبات معلقة حالياً</h3>
              <p>كل شيء على يرام! ✅</p>
            </div>
          ) : (
            <div className="requests-list">
              {requests.map(req => (
                <div key={req.id} className="request-card">
                  <div className="request-header">
                    <span className={`request-type ${req.request_type}`}>
                      {req.request_type === 'add' ? '➕ إضافة' : '✏️ تعديل'}
                    </span>
                    <span className="request-date">
                      {new Date(req.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  
                  <div className="request-body">
                    <p><strong>مقدم الطلب:</strong> {req.requester_name}</p>
                    <p><strong>النوع:</strong> {req.request_type === 'add' ? 'إضافة فرد جديد' : 'تعديل بيانات'}</p>
                    <div className="request-data">
                      <pre>{JSON.stringify(req.person_data, null, 2)}</pre>
                    </div>
                  </div>

                  <div className="request-actions">
                    <button 
                      onClick={() => handleProcessRequest(req.id, 'approve')}
                      className="btn-approve"
                    >
                      <CheckCircle size={18} />
                      موافقة
                    </button>
                    <button 
                      onClick={() => handleProcessRequest(req.id, 'reject')}
                      className="btn-reject"
                    >
                      <XCircle size={18} />
                      رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}