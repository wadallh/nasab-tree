import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, User, Phone, Lock, AlertCircle } from 'lucide-react'

// ✅ استيراد مثيل axios الموحد (تأكد من المسار حسب هيكل مجلداتك)
// إذا كان الملف في src/pages/Register.jsx والملف في src/api/axios.js
// فالإستيراد الصحيح هو:
import api from '../api/axios'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    
    // التحقق من تطابق كلمات المرور
    if (form.password !== form.confirm) {
      return setError('كلمتا المرور غير متطابقتين')
    }
    
    // التحقق من أن رقم الجوال يحتوي على أرقام فقط (تحسين إضافي)
    if (!/^\+?[\d\s\-()]{10,}$/.test(form.phone.trim())) {
      return setError('يرجى إدخال رقم جوال صحيح')
    }
    
    setLoading(true)
    try {
      // ✅ استخدام مسار نسبي فقط (بدون تكرار /api)
      // لأن baseURL في ملف axios.js يحتوي بالفعل على /api
      // إذا كان baseURL = https://nasab-tree-1.onrender.com
      // نكتب هنا: /api/auth/register
      // إذا كان baseURL = https://nasab-tree-1.onrender.com/api
      // نكتب هنا: /auth/register
      
      // ⚠️ حسب إعداداتك الحالية، جرب هذا أولاً:
      await api.post('/api/auth/register', {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        password: form.password
      })
      
      alert('✅ تم إنشاء الحساب بنجاح! قم بتسجيل الدخول الآن.')
      navigate('/login')
      
    } catch (err) {
      // ✅ معالجة آمنة للخطأ تمنع الشاشة البيضاء 100%
      console.error('Register error:', err)
      
      // استخراج رسالة الخطأ بأمان من أي نوع من الأخطاء
      let errorMessage = 'فشل التسجيل'
      
      if (err?.response?.data) {
        // خطأ من السيرفر (مثل: 400, 401, 409, 500)
        errorMessage = err.response.data.error || err.response.data.message || errorMessage
      } else if (err?.request) {
        // الطلب خرج لكن ما وصل رد (مشكلة شبكة أو سيرفر نايم)
        errorMessage = 'لا يوجد اتصال بالسيرفر. تأكد من الإنترنت وحاول مرة أخرى'
      } else if (err?.message) {
        // خطأ في إعدادات الطلب نفسه
        errorMessage = err.message
      }
      
      // ✅ الخطوة الأهم: تأكد أن الرسالة نصية قبل العرض في JSX
      setError(typeof errorMessage === 'string' ? errorMessage : 'فشل التسجيل')
      
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-circle"><span className="logo-icon">👤</span></div>
          <h1 className="login-title">إنشاء حساب جديد</h1>
          <p className="login-subtitle">انضم إلى نظام شجرة النسب</p>
        </div>
        
        <form onSubmit={submit} className="login-form">
          {/* ✅ عرض آمن للخطأ - هذه الجملة تمنع الشاشة البيضاء */}
          {error && (
            <div className="error-message" style={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={18}/>
              <span>
                {/* ✅ حماية مزدوجة: تأكد من النوع والقيمة */}
                {typeof error === 'string' && error.trim() !== '' 
                  ? error 
                  : 'حدث خطأ غير متوقع'}
              </span>
            </div>
          )}
          
          <div className="input-group">
            <label className="input-label">
              <User size={18}/><span>الاسم الكامل</span>
            </label>
            <input 
              className="input-field" 
              value={form.full_name} 
              onChange={e => setForm({...form, full_name: e.target.value})} 
              required 
              placeholder="أدخل اسمك الكامل"
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">
              <Phone size={18}/><span>رقم الجوال</span>
            </label>
            <input 
              className="input-field" 
              type="tel" 
              value={form.phone} 
              onChange={e => setForm({...form, phone: e.target.value})} 
              required 
              placeholder="05xxxxxxxx"
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">
              <Lock size={18}/><span>كلمة المرور</span>
            </label>
            <input 
              className="input-field" 
              type="password" 
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})} 
              required 
              placeholder="أدخل كلمة مرور قوية"
              minLength={6}
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">
              <Lock size={18}/><span>تأكيد كلمة المرور</span>
            </label>
            <input 
              className="input-field" 
              type="password" 
              value={form.confirm} 
              onChange={e => setForm({...form, confirm: e.target.value})} 
              required 
              placeholder="أعد إدخال كلمة المرور"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-login" 
            disabled={loading}
            style={{
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <span className="loading-spinner">جاري التسجيل...</span>
            ) : (
              <><UserPlus size={20}/><span>تسجيل الحساب</span></>
            )}
          </button>
        </form>
        
        <div style={{textAlign:'center', marginTop:'1rem'}}>
          <Link to="/login" style={{color:'#10b981', textDecoration:'none', fontWeight:'600'}}>
            لديك حساب بالفعل؟ سجل دخول
          </Link>
        </div>
      </div>
    </div>
  )
}