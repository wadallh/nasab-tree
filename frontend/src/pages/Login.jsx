import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn, Phone, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import api from '../api/axios'

export default function Login() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    phone: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // التحقق من الحقول
    if (!form.phone || !form.password) {
      return setError('رقم الجوال وكلمة المرور مطلوبان')
    }

    // التحقق من صحة رقم الجوال (يجب أن يكون أرقام فقط ويبدأ بـ 7)
    const phoneRegex = /^7[0-9]{8,9}$/
    if (!phoneRegex.test(form.phone.trim())) {
      return setError('رقم الجوال يجب أن يبدأ بـ 7 ويتكون من 9-10 أرقام')
    }

    setLoading(true)

    try {
      // إرسال بيانات تسجيل الدخول
      const res = await api.post('/auth/login', {
        phone: form.phone.trim(),
        password: form.password
      })

      // حفظ التوken وبيانات المستخدم
      if (res.data.token) {
        localStorage.setItem('token', res.data.token)
      }

      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user))
        
        // التحقق مما إذا كان المستخدم يجب أن يغير كلمة المرور
        // يمكن التحقق من ذلك بعدة طرق:
        // 1. إذا كان must_change_password موجود في response
        // 2. إذا كان password_hash فارغاً أو null
        // 3. إذا كان هناك flag في المستخدم
        const mustChangePassword = 
          res.data.user.must_change_password === true ||
          res.data.user.mustChangePassword === true ||
          !res.data.user.password_hash ||
          res.data.user.password_hash === null

        if (mustChangePassword) {
          navigate('/change-password', {
            state: { 
              isFirstTime: true,
              userId: res.data.user.id 
            }
          })
        } else {
          navigate('/tree')
        }
      }

    } catch (err) {
      console.error('LOGIN ERROR:', err)

      let errorMessage = 'فشل تسجيل الدخول'
      
      if (err.response) {
        // الـ server رد بخطأ
        errorMessage = err.response.data?.error || 
                      err.response.data?.message || 
                      'بيانات الدخول غير صحيحة'
      } else if (err.request) {
        // الطلب تم إرساله لكن لم يأتِ رد
        errorMessage = 'لا يوجد اتصال بالخادم، تأكد من اتصالك بالإنترنت'
      } else {
        errorMessage = err.message || 'حدث خطأ غير متوقع'
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-circle">
            <span className="logo-icon">🌳</span>
          </div>
          <h1 className="login-title">شجرة النسب</h1>
          <p className="login-subtitle">سجل دخولك للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">
              <Phone size={18} />
              <span>رقم الجوال</span>
            </label>
            <input
              className="input-field"
              type="tel"
              placeholder="77XXXXXXXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              dir="ltr"
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <Lock size={18} />
              <span>كلمة المرور</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-login"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <LogIn size={20} />
                <span>تسجيل الدخول</span>
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link
            to="/register"
            style={{
              color: '#10b981',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            ليس لديك حساب؟ أنشئ حساباً جديداً
          </Link>
        </div>
      </div>
    </div>
  )
}