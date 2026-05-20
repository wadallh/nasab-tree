import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, User, Phone, Lock, AlertCircle } from 'lucide-react'

// ✅ مسار الاستيراد الصحيح
import api from '../services/api'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('كلمتا المرور غير متطابقتين')
    
    setLoading(true)
    try {
      await api.post('/api/auth/register', {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        password: form.password
      })
      alert('✅ تم إنشاء الحساب بنجاح! قم بتسجيل الدخول الآن.')
      navigate('/login')
    } catch (err) {
      console.error('Register error:', err)
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'فشل التسجيل'
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
          {error && (
            <div className="error-message">
              <AlertCircle size={18}/>
              <span>{typeof error === 'string' ? error : 'حدث خطأ غير متوقع'}</span>
            </div>
          )}
          <div className="input-group">
            <label className="input-label"><User size={18}/><span>الاسم الكامل</span></label>
            <input className="input-field" value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})} required />
          </div>
          <div className="input-group">
            <label className="input-label"><Phone size={18}/><span>رقم الجوال</span></label>
            <input className="input-field" type="tel" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} required />
          </div>
          <div className="input-group">
            <label className="input-label"><Lock size={18}/><span>كلمة المرور</span></label>
            <input className="input-field" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required />
          </div>
          <div className="input-group">
            <label className="input-label"><Lock size={18}/><span>تأكيد كلمة المرور</span></label>
            <input className="input-field" type="password" value={form.confirm} onChange={e=>setForm({...form, confirm:e.target.value})} required />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? <span className="loading-spinner"></span> : <><UserPlus size={20}/><span>تسجيل الحساب</span></>}
          </button>
        </form>
        <div style={{textAlign:'center',marginTop:'1rem'}}>
          <Link to="/login" style={{color:'#10b981',textDecoration:'none',fontWeight:'600'}}>لديك حساب بالفعل؟ سجل دخول</Link>
        </div>
      </div>
    </div>
  )
}