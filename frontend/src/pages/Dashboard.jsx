import { useNavigate } from 'react-router-dom'
import { TreePine, LogOut, BarChart3, UserPlus, Users, Settings } from 'lucide-react'

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor'

  // بيانات القوائم لتسهيل التعديل لاحقاً
  const menuItems = [
    {
      title: 'عرض الشجرة',
      desc: 'استعرض الأنساب بشكل تفاعلي هرمي',
      icon: <TreePine size={28} />,
      color: '#10b981',
      bg: '#ecfdf5',
      link: '/tree'
    },
    {
      title: 'لوحة التحكم',
      desc: 'مراجعة الطلبات والإحصائيات والصلاحيات',
      icon: <BarChart3 size={28} />,
      color: '#3b82f6',
      bg: '#eff6ff',
      link: '/admin',
      adminOnly: true
    },
    {
      title: 'طلب إضافة',
      desc: 'إرسال طلب لإضافة فرد جديد للمراجعة',
      icon: <UserPlus size={28} />,
      color: '#f59e0b',
      bg: '#fffbeb',
      link: '/tree?action=add'
    }
  ]

  return (
    <div className="dashboard-wrapper">
      <header className="dash-header">
        <div className="header-info">
          <h1>مرحباً، {user?.full_name || 'مدير النظام'} 👋</h1>
          <p>نظام إدارة شجرة النسب العائلية</p>
        </div>
        <button onClick={onLogout} className="btn-logout">
          <LogOut size={18} />
          <span>خروج</span>
        </button>
      </header>

      <main className="dash-main">
        <div className="welcome-banner">
          <h2>🌳 اختر من الخيارات التالية للبدء</h2>
        </div>

        <div className="features-grid">
          {menuItems.map((item, idx) => {
            if (item.adminOnly && !isAdmin) return null
            return (
              <div
                key={idx}
                className="feature-card"
                style={{ backgroundColor: item.bg, borderColor: item.color + '40' }}
                onClick={() => navigate(item.link)}
              >
                <div className="icon-box" style={{ color: item.color, backgroundColor: item.color + '15' }}>
                  {item.icon}
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className="card-arrow">←</span>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}