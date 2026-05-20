import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, AlertCircle, Check, Eye, EyeOff } from 'lucide-react'

// ✅ استيراد مثيل axios الموحد من المجلد المركزي
import api from '../api/axios'

export default function ChangePassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  
  const isFirstTime = location.state?.isFirstTime || false
  // ✅ تم حذف جلب التوكن يدوياً (الـ interceptor يتكفل به تلقائياً)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (form.new !== form.confirm) {
      return setError('كلمتا المرور الجديدتين غير متطابقتين')
    }
    if (form.new.length < 6) {
      return setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
    }
    
    setLoading(true)
    try {
      // ✅ تم التعديل:
      // 1. استخدام api بدلاً من axios
      // 2. مسار نسبي فقط '/auth/...' (بدون تكرار /api)
      // 3. حذف headers لأن التوكن يُضاف تلقائياً عبر interceptor
      await api.post('/auth/change-password', {
        current_password: isFirstTime ? form.current || '000000' : form.current,
        new_password: form.new
      })
      
      setSuccess('✅ تم تغيير كلمة المرور بنجاح!')
      setTimeout(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تغيير كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-circle"><span className="logo-icon">🔐</span></div>
          <h1 className="login-title">تغيير كلمة المرور</h1>
          <p className="login-subtitle">
            {isFirstTime 
              ? 'يرجى تغيير كلمة المرور الافتراضية للمتابعة' 
              : 'أدخل كلمة المرور الجديدة'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="success-message" style={{ background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={18} />
              <span>{success}</span>
            </div>
          )}
          
          {!isFirstTime && (
            <div className="input-group">
              <label className="input-label">
                <Lock size={18} />
                <span>كلمة المرور الحالية</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  className="input-field" 
                  type={showPasswords.current ? 'text' : 'password'}
                  value={form.current} 
                  onChange={e => setForm({...form, current: e.target.value})} 
                  required={!isFirstTime}
                />
                <button 
                  type="button"
                  onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
          
          {isFirstTime && (
            <div style={{ background: '#fffbeb', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', color: '#92400e' }}>
              💡 كلمة المرور الافتراضية هي: <strong>000000</strong>
            </div>
          )}
          
          <div className="input-group">
            <label className="input-label">
              <Lock size={18} />
              <span>كلمة المرور الجديدة *</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                className="input-field" 
                type={showPasswords.new ? 'text' : 'password'}
                value={form.new} 
                onChange={e => setForm({...form, new: e.target.value})} 
                required 
                minLength={6}
              />
              <button 
                type="button"
                onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="input-group">
            <label className="input-label">
              <Lock size={18} />
              <span>تأكيد كلمة المرور الجديدة *</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                className="input-field" 
                type={showPasswords.confirm ? 'text' : 'password'}
                value={form.confirm} 
                onChange={e => setForm({...form, confirm: e.target.value})} 
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <button type="submit" className="btn-login" disabled={loading} style={{ background: '#8b5cf6' }}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <Check size={20} />
                <span>{isFirstTime ? 'حفظ والمتابعة' : 'تغيير كلمة المرور'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}