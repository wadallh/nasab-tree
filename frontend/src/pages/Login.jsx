import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn, Phone, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'

export default function Login() {

  const API_URL = 'https://nasab-tree-1.onrender.com/api'

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

    setLoading(true)

    try {

      const res = await axios.post(
        `${API_URL}/auth/login`,
        {
          phone: form.phone.trim(),
          password: form.password
        }
      )

      // حفظ التوكن وبيانات المستخدم
      localStorage.setItem('token', res.data.token)

      localStorage.setItem(
        'user',
        JSON.stringify(res.data.user)
      )

      // التحقق من تغيير كلمة المرور
      if (res.data.user.must_change_password) {

        navigate('/change-password', {
          state: { isFirstTime: true }
        })

      } else {

        navigate('/tree')

      }

    } catch (err) {

      console.log('LOGIN ERROR:', err)

      setError(
        err.response?.data?.error ||
        err.message ||
        'فشل تسجيل الدخول'
      )

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

          <h1 className="login-title">
            شجرة النسب
          </h1>

          <p className="login-subtitle">
            سجل دخولك للمتابعة
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

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
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value
                })
              }
              required
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
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value
                  })
                }
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />
                }
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

        <div
          style={{
            textAlign: 'center',
            marginTop: '1rem'
          }}
        >

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