import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ArrowLeft, ZoomIn, ZoomOut, Search, X, Edit3, Trash2, UserPlus, RefreshCw, FileText, Menu, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getFamilyTree, addPersonDirect, updateStatusDirect, deletePersonDirect, submitRequest, getPendingRequests, processRequest } from '../services/api'
import html2canvas from 'html2canvas'
import axios from 'axios'
import NotificationsBell from './NotificationsBell'
import BackupManager from './BackupManager' // ✅ استيراد مدير النسخ الاحتياطي
import UserManagement from './UserManagement'

const STATUS = {
  alive: { color: '#10b981', bg: '#d1fae5', text: '#064e3b', label: 'حي' },
  deceased: { color: '#64748b', bg: '#f1f5f9', text: '#475569', label: 'متوفي' },
  martyr: { color: '#ef4444', bg: '#fee2e2', text: '#7f1d1d', label: 'شهيد' }
}

const CARD_W = 180, CARD_H = 80, LEVEL_H = 140, SIBLING_GAP = 40

const wrapText = (text, maxChars = 18) => {
  if (!text) return ['']
  const words = String(text).split(' ')
  const lines = []
  let current = ''
  words.forEach(w => {
    if ((current + w).length <= maxChars) {
      current += (current ? ' ' : '') + w
    } else {
      if (current) lines.push(current)
      current = w
    }
  })
  if (current) lines.push(current)
  return lines.slice(0, 2)
}

function buildTreeLayout(node, depth = 0, leafCounter = { val: 0 }) {
  const isLeaf = !node.children?.length
  const children = node.children?.map(c => buildTreeLayout(c, depth + 1, leafCounter)) || []
  let x = isLeaf ? leafCounter.val++ * (CARD_W + SIBLING_GAP) + 50 : (children[0].x + children[children.length - 1].x) / 2
  return { node, x, y: depth * LEVEL_H + 80, children, depth }
}

function getTreeBounds(layout) {
  let maxX = 0, maxY = 0
  const t = n => { maxX = Math.max(maxX, n.x + CARD_W + 100); maxY = Math.max(maxY, n.y + CARD_H + 100); n.children.forEach(t) }
  t(layout); return { width: maxX, height: maxY }
}

function calculateStats(persons) {
  let total = 0, alive = 0, deceased = 0, martyr = 0
  persons.forEach(p => { total++; if(p.status==='alive') alive++; else if(p.status==='deceased') deceased++; else if(p.status==='martyr') martyr++ })
  return { total, alive, deceased, martyr }
}

export default function TreeViewer({ user: propUser, onLogout }) {
  const [persons, setPersons] = useState([])
  const [layout, setLayout] = useState(null)
  const [bounds, setBounds] = useState({ width: 0, height: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [zoom, setZoom] = useState(0.8)
  const [modal, setModal] = useState(null)
  const [stats, setStats] = useState({ total: 0, alive: 0, deceased: 0, martyr: 0 })
  const [pendingRequests, setPendingRequests] = useState([])
  const [showRequests, setShowRequests] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const [currentUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })
  const canvasRef = useRef(null)
  const treeWrapperRef = useRef(null)
  const navigate = useNavigate()
  const effectiveUser = currentUser || propUser
  const isAdmin = effectiveUser?.role === 'admin' || effectiveUser?.role === 'supervisor'
  const isRegularUser = effectiveUser?.role === 'member'

  const loadTree = useCallback(async () => {
    try {
      const res = await getFamilyTree()
      const data = res.data.persons || []
      setPersons(data); setStats(calculateStats(data))
      const map = {}, roots = []
      data.forEach(p => map[p.id] = { ...p, children: [] })
      data.forEach(p => p.parent_id && map[p.parent_id] ? map[p.parent_id].children.push(map[p.id]) : roots.push(map[p.id]))
      if (roots[0]) { const tree = buildTreeLayout(roots[0]); setLayout(tree); setBounds(getTreeBounds(tree)) }
    } catch (err) { console.error('فشل التحميل:', err) }
  }, [])

  useEffect(() => { loadTree(); if (isAdmin) loadPendingRequests() }, [loadTree, isAdmin])
  const loadPendingRequests = async () => { try { setPendingRequests((await getPendingRequests()).data.requests || []) } catch {} }

  const filteredLayout = useMemo(() => {
    if (!layout) return layout
    let filtered = layout
    if (statusFilter !== 'all') {
      const filterByStatus = (n) => {
        const matchStatus = n.node.status === statusFilter
        const filteredChildren = n.children.map(filterByStatus).filter(Boolean)
        return matchStatus || filteredChildren.length ? { ...n, children: filteredChildren } : null
      }
      filtered = filterByStatus(filtered)
    }
    if (search.trim()) {
      const match = n => (n.node.full_name || n.node.first_name || '').toLowerCase().includes(search.toLowerCase())
      const filter = n => match(n) ? n : n.children.map(filter).filter(Boolean).length ? { ...n, children: n.children.map(filter).filter(Boolean) } : null
      filtered = filter(filtered)
    }
    return filtered
  }, [layout, search, statusFilter])

  const handleExport = async () => {
    if (!treeWrapperRef.current) return
    try {
      const svgElement = treeWrapperRef.current.querySelector('svg')
      if (!svgElement) { alert('❌ لم يتم العثور على الشجرة'); return }
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `شجرة-النسب-${new Date().toISOString().split('T')[0]}.svg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 100)
      alert('✅ تم تحميل الشجرة بنجاح!\n📝 ملاحظة: ملف SVG يمكن فتحه في المتصفح أو برامج التصميم')
    } catch (err) {
      console.error('Export error:', err)
      alert('❌ خطأ: ' + err.message)
    }
  }

  const isDragging = useRef(false), dragStart = useRef({ x: 0, y: 0 })
  const handleMouseMove = useCallback(e => {
    if (!isDragging.current || !canvasRef.current) return
    canvasRef.current.scrollLeft += dragStart.current.x - e.clientX
    canvasRef.current.scrollTop += dragStart.current.y - e.clientY
    dragStart.current = { x: e.clientX, y: e.clientY }
  }, [])
  useEffect(() => { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', () => isDragging.current = false); return () => { window.removeEventListener('mousemove', handleMouseMove) } }, [handleMouseMove])

  const handleSave = async (data) => {
    try {
      const { type, payload } = data
      const isReq = type.startsWith('request_')
      if (isAdmin) {
        if (type === 'add') await addPersonDirect(payload)
        else if (type === 'edit') await axios.patch(`/api/tree/persons/${payload.id}`, payload, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        else if (type === 'delete') await deletePersonDirect(payload.id)
      } else if (isRegularUser && isReq) {
        await submitRequest(type.replace('request_', ''), payload)
        alert('✅ تم إرسال طلبك للمدير')
      }
      await loadTree(); if (isAdmin) await loadPendingRequests(); setModal(null)
    } catch (err) { alert('خطأ: ' + (err.response?.data?.error || err.message)) }
  }

  const handleProcessRequest = async (id, action) => {
    try {
      const note = prompt(action === 'approve' ? 'ملاحظة:' : 'سبب الرفض:') || ''
      await processRequest(id, action, note)
      alert(action === 'approve' ? '✅ تمت الموافقة' : '❌ تم الرفض')
      await loadPendingRequests(); await loadTree()
    } catch (err) { alert('خطأ') }
  }

  if (!persons.length) return <div className="loading-screen"><div className="spinner"></div>جاري التحميل...</div>

  return (
    <div className="tree-app-v4" style={{ direction: 'rtl' }}>
      <header className="top-bar-v4" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', padding: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ArrowLeft size={18}/> رجوع</button>
        <h2 style={{ margin: 0, fontSize: '1.25rem', flex: 1 }}>🌳 شجرة النسب</h2>
        <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ display: 'none', background: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }} className="mobile-only"><Menu size={20}/></button>
        
        <div className="toolbar-v4" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '8px', padding: '0.25rem 0.75rem', gap: '0.5rem' }}>
            <Search size={16} color="#64748b"/>
            <input placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', minWidth: '150px' }} />
          </div>
          
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'white', cursor: 'pointer', fontWeight: '600' }}>
            <option value="all">الكل</option>
            <option value="alive">🟢 أحياء</option>
            <option value="deceased">⚫ متوفين</option>
            <option value="martyr">🔴 شهداء</option>
          </select>
          
          {isAdmin && (
            <button onClick={()=>setShowRequests(!showRequests)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer', position: 'relative' }}>
              <FileText size={18}/>
              {pendingRequests.length>0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{pendingRequests.length}</span>}
            </button>
          )}
          
          <button onClick={handleExport} title="تحميل صورة الشجرة" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Download size={18}/> تحميل
          </button>

          <NotificationsBell user={effectiveUser} />

          <button onClick={()=>setZoom(z=>Math.min(z+0.1, 2))} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}><ZoomIn size={18}/></button>
          <button onClick={()=>setZoom(z=>Math.max(z-0.1, 0.3))} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}><ZoomOut size={18}/></button>
          <button onClick={()=>setZoom(0.8)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}><RefreshCw size={18}/></button>
          <button onClick={onLogout} style={{ background: '#ef4444', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: '600' }}>خروج</button>
        </div>
      </header>
      
      <div className="main-v4" style={{ display: 'flex', flex: 1 }}>
        <aside className="stats-panel-v4 desktop-only" style={{ width: '250px', padding: '1rem', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', display: 'block' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#334155' }}>📊 إحصائيات</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}><div style={{ color: '#64748b', fontSize: '0.875rem' }}>👥 إجمالي</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.total}</div></div>
            <div style={{ background: '#d1fae5', padding: '1rem', borderRadius: '10px' }}><div style={{ color: '#064e3b', fontSize: '0.875rem' }}>🟢 أحياء</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#064e3b' }}>{stats.alive}</div></div>
            <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '10px' }}><div style={{ color: '#475569', fontSize: '0.875rem' }}>⚫ متوفين</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#475569' }}>{stats.deceased}</div></div>
            <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '10px' }}><div style={{ color: '#7f1d1d', fontSize: '0.875rem' }}>🔴 شهداء</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7f1d1d' }}>{stats.martyr}</div></div>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e0e7ff', borderRadius: '8px', textAlign: 'center', fontWeight: '600', color: '#3730a3' }}>
            {isAdmin ? '👑 مدير/مشرف' : '👤 عضو'}
          </div>

          {/* ✅ قسم النسخ الاحتياطي - يظهر للمدير فقط */}
          {isAdmin && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <BackupManager user={effectiveUser} />
            </div>
          )}
{/* ✅ إدارة المستخدمين - للمدير فقط */}
{isAdmin && (
  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
    <UserManagement user={effectiveUser} />
  </div>
)}
        </aside>

        <div ref={canvasRef} className="tree-canvas-v4" onMouseDown={e=>{isDragging.current=true;dragStart.current={x:e.clientX,y:e.clientY}}} style={{ flex: 1, overflow: 'auto', cursor: isDragging.current ? 'grabbing' : 'grab', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', minHeight: 'calc(100vh - 100px)' }}>
          <div ref={treeWrapperRef} className="tree-wrapper-v4" style={{width: bounds.width, height: bounds.height, transform: `scale(${zoom})`, transformOrigin: '0 0', position: 'relative'}}>
            <svg width={bounds.width} height={bounds.height} style={{position: 'absolute', top: 0, left: 0, overflow: 'visible'}}>
              <RenderTree node={filteredLayout} isAdmin={isAdmin} isRegularUser={isRegularUser} onAction={(type, person) => setModal({ type, person })} onViewDetails={(person) => setSelectedPerson(person)} />
            </svg>
          </div>
        </div>
      </div>

      {modal && <ActionModal data={modal} isAdmin={isAdmin} onClose={()=>setModal(null)} onSave={handleSave}/>}
      {showRequests && isAdmin && <RequestsPanel requests={pendingRequests} onProcess={handleProcessRequest} onClose={()=>setShowRequests(false)}/>}
      {selectedPerson && <PersonDetailsModal person={selectedPerson} onClose={()=>setSelectedPerson(null)}/>}
      
      <style>{`
        @media (max-width: 768px) {
          .mobile-only { display: block !important; }
          .desktop-only { display: none !important; }
          .top-bar-v4 { flex-direction: column; align-items: stretch; }
          .toolbar-v4 { flex-direction: column; }
          .toolbar-v4 input { min-width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

function RenderTree({ node, isAdmin, isRegularUser, onAction, onViewDetails }) {
  if (!node) return null
  const cfg = STATUS[node.node.status] || STATUS.alive
  const fullName = node.node.full_name || node.node.first_name || 'غير مسمى'
  const hasBio = node.node.bio && String(node.node.bio).trim().length > 0
  const lines = wrapText(fullName, 16)

  return (
    <g>
      {node.children.map((child) => {
        const startX = node.x + CARD_W / 2
        const startY = node.y + CARD_H
        const endX = child.x + CARD_W / 2
        const endY = child.y
        const midY = startY + 40
        const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
        return (
          <g key={child.node.id}>
            <path d={d} fill="none" stroke="#cbd5e1" strokeWidth="2" />
            <RenderTree node={child} isAdmin={isAdmin} isRegularUser={isRegularUser} onAction={onAction} onViewDetails={onViewDetails} />
          </g>
        )
      })}
      <g transform={`translate(${node.x}, ${node.y})`} style={{pointerEvents: 'all', cursor: 'pointer'}}>
        <title>{fullName}</title>
        <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="12" ry="12" fill={cfg.bg} stroke={cfg.color} strokeWidth="2" filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.1))" />
        {lines.map((line, i) => (<text key={i} x={CARD_W/2} y={30 + (i * 16)} textAnchor="middle" fill={cfg.text} fontSize="12" fontWeight="bold" style={{fontFamily: 'Tajawal, sans-serif'}}>{line}</text>))}
        <text x={CARD_W/2} y={CARD_H - 10} textAnchor="middle" fill={cfg.color} fontSize="10" fontWeight="600">{cfg.label}</text>
        {hasBio && (<g transform="translate(12, 12)" onClick={e => { e.stopPropagation(); onViewDetails(node.node); }} cursor="pointer"><circle r="14" fill="#3b82f6" stroke="white" strokeWidth="2" /><text y="4" textAnchor="middle" fill="white" fontSize="14">📜</text></g>)}
        {(isAdmin || isRegularUser) && (<g transform={`translate(${CARD_W - 15}, 12)`} style={{pointerEvents: 'all'}}>{isAdmin && (<><g transform="translate(-55, 0)" onClick={e => { e.stopPropagation(); onAction('add', node.node); }}><circle r="12" fill="white" stroke="#e2e8f0" cursor="pointer" /><text y="4" textAnchor="middle" fontSize="14">➕</text></g><g transform="translate(-30, 0)" onClick={e => { e.stopPropagation(); onAction('edit', node.node); }}><circle r="12" fill="white" stroke="#e2e8f0" cursor="pointer" /><text y="4" textAnchor="middle" fontSize="12">✏️</text></g><g transform="translate(-5, 0)" onClick={e => { e.stopPropagation(); onAction('delete', node.node); }}><circle r="12" fill="white" stroke="#e2e8f0" cursor="pointer" /><text y="4" textAnchor="middle" fontSize="12">🗑️</text></g></>)}{isRegularUser && (<><g transform="translate(-20, 0)" onClick={e => { e.stopPropagation(); onAction('request_add', node.node); }}><circle r="12" fill="white" stroke="#e2e8f0" cursor="pointer" /><text y="4" textAnchor="middle" fontSize="14">➕</text></g></>)}</g>)}
      </g>
    </g>
  )
}

function PersonDetailsModal({ person, onClose }) {
  if (!person) return null
  
  const calculateAge = (birth, death) => {
    if (!birth) return 'غير محدد'
    const b = new Date(birth)
    const e = death ? new Date(death) : new Date()
    const a = e.getFullYear() - b.getFullYear()
    const m = e.getMonth() - b.getMonth()
    return (m < 0 || (m === 0 && e.getDate() < b.getDate())) ? a - 1 : a > 0 ? a : 'أقل من سنة'
  }
  
  const age = calculateAge(person.birth_date, person.death_date)
  const sc = STATUS[person.status] || STATUS.alive

  return (
    <div 
      className="modal-overlay-v4" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        direction: 'rtl'
      }}
    >
      <div 
        className="modal-box-v4" 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '85vh', // ✅ أقصى ارتفاع للنافذة
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
      >
        {/* الهيدر - ثابت */}
        <div 
          className="modal-head-v4" 
          style={{
            borderBottom: `2px solid ${sc.color}`,
            padding: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0 // ✅ عدم الانكماش
          }}
        >
          <h2 style={{ margin: 0, color: sc.color, fontSize: '1.5rem' }}>
            👤 {person.full_name || person.first_name}
          </h2>
          <button 
            onClick={onClose} 
            style={{
              background: '#f1f5f9',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b'
            }}
          >
            <X size={20}/>
          </button>
        </div>

        {/* المحتوى - قابل للتمرير */}
        <div 
          style={{
            flex: 1,
            overflowY: 'auto', // ✅ تمرير عمودي
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {/* الحالة والعمر */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.5rem 1rem',
              background: sc.bg,
              color: sc.text,
              borderRadius: '20px',
              fontWeight: '700',
              fontSize: '0.9rem'
            }}>
              {sc.label}
            </span>
            {person.birth_date && (
              <span style={{ color: '#64748b', fontWeight: '600' }}>
                🎂 العمر: {age} سنة
              </span>
            )}
          </div>

          {/* التواريخ */}
          <div style={{ 
            background: '#f8fafc', 
            padding: '1rem', 
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#334155', fontSize: '1rem' }}>
              📅 التواريخ
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>تاريخ الميلاد:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                  {person.birth_date ? new Date(person.birth_date).toLocaleDateString('ar-SA') : 'غير محدد'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>تاريخ الوفاة:</span>
                <span style={{ fontWeight: '600', color: person.death_date ? '#ef4444' : '#94a3b8' }}>
                  {person.death_date ? new Date(person.death_date).toLocaleDateString('ar-SA') : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* ✅ السيرة الذاتية - مع تمرير مخصص للنص الطويل */}
          {person.bio && (
            <div style={{ 
              background: '#fffbeb', 
              padding: '1rem', 
              borderRadius: '10px',
              border: '1px solid #fde68a'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontSize: '1rem' }}>
                📝 السيرة الذاتية
              </h4>
              <div 
                style={{
                  color: '#78350f',
                  lineHeight: '2',
                  fontSize: '0.95rem',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  maxHeight: '300px', // ✅ أقصى ارتفاع للنص
                  overflowY: 'auto', // ✅ تمرير إذا زاد النص
                  padding: '0.5rem',
                  background: 'rgba(255,255,255,0.5)',
                  borderRadius: '6px'
                }}
              >
                {person.bio}
              </div>
            </div>
          )}

          {/* معلومات إضافية */}
          <div style={{ 
            background: '#f0f9ff', 
            padding: '1rem', 
            borderRadius: '10px',
            border: '1px solid #bae6fd'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#0369a1', fontSize: '1rem' }}>
              ℹ️ معلومات إضافية
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>الاسم الكامل:</span>
                <span style={{ fontWeight: '600' }}>{person.full_name}</span>
              </div>
              {person.father_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>اسم الأب:</span>
                  <span style={{ fontWeight: '600' }}>{person.father_name}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>تاريخ الإضافة:</span>
                <span style={{ fontWeight: '600' }}>
                  {person.created_at ? new Date(person.created_at).toLocaleDateString('ar-SA') : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* الفوتر - ثابت */}
        <div 
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '0.5rem',
            flexShrink: 0 // ✅ عدم الانكماش
          }}
        >
          <button 
            onClick={onClose} 
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            ✓ إغلاق
          </button>
        </div>
      </div>

      {/* ✅ تحسينات CSS للتمرير */}
      <style>{`
        .modal-box-v4::-webkit-scrollbar {
          width: 8px;
        }
        .modal-box-v4::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .modal-box-v4::-webkit-scrollbar-thumb {
          background: '#cbd5e1';
          border-radius: 10px;
        }
        .modal-box-v4::-webkit-scrollbar-thumb:hover {
          background: '#94a3b8';
        }
      `}</style>
    </div>
  )
}

function ActionModal({ data, isAdmin, onClose, onSave }) {
  const { type, person } = data || {}
  if (!person) return null
  const [name, setName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [status, setStatus] = useState(person.status || 'alive')
  const [birthDate, setBirthDate] = useState(person.birth_date || '')
  const [deathDate, setDeathDate] = useState(person.death_date || '')
  const [bio, setBio] = useState(person.bio || '')
  const isReq = type?.includes('request')
  const mType = isReq ? type.replace('request_', '') : type
  const isAdd = mType === 'add', isEdit = mType === 'edit'
  const submit = e => {
    e.preventDefault()
    const payload = isAdd ? {
      first_name: name.trim(), father_name: fatherName.trim() || person.full_name, parent_id: person.id, status,
      birth_date: birthDate || null, death_date: deathDate || null, bio: bio.trim() || null,
      full_name: `${name.trim()} بن ${fatherName.trim() || person.full_name}`
    } : {
      id: person.id, full_name: name.trim() || person.full_name, status,
      birth_date: birthDate || null, death_date: deathDate || null, bio: bio.trim() || null
    }
    onSave({ type: isReq ? (isAdd ? 'request_add' : 'request_edit') : mType, payload })
  }
  return (
    <div className="modal-overlay-v4" onClick={onClose}>
      <div className="modal-box-v4" onClick={e => e.stopPropagation()}>
        <div className="modal-head-v4">
          <h3>{isReq ? (isAdd ? '📝 طلب إضافة' : '📝 طلب تعديل') : (isAdd ? '➕ إضافة' : isEdit ? '✏️ تعديل' : '🗑️ حذف')}</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <form onSubmit={submit}>
          {isAdd && <div className="form-group"><label>اسم الابن *</label><input className="modal-input-v4" value={name} onChange={e => setName(e.target.value)} autoFocus required /></div>}
          {isAdd && <div className="form-group"><label>اسم الأب (اختياري)</label><input className="modal-input-v4" value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder={person.full_name} /></div>}
          {isEdit && <div className="form-group"><label>الاسم الكامل</label><input className="modal-input-v4" value={name} onChange={e => setName(e.target.value)} placeholder={person.full_name} /></div>}
          <div className="form-group"><label>الحالة *</label><select className="modal-input-v4" value={status} onChange={e => setStatus(e.target.value)}><option value="alive">🟢 حي</option><option value="deceased">⚫ متوفي</option><option value="martyr">🔴 شهيد</option></select></div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>📅 تاريخ الميلاد</label><input className="modal-input-v4" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>📅 تاريخ الوفاة</label><input className="modal-input-v4" type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} /></div>
          </div>
          <div className="form-group"><label>📝 السيرة الذاتية</label><textarea className="modal-input-v4" rows="2" value={bio} onChange={e => setBio(e.target.value)} placeholder="نبذة..." /></div>
          {mType === 'delete' && <p className="modal-warn-v4">⚠️ حذف {person.full_name}؟</p>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn-confirm-v4" style={{ flex: 1 }}>{isReq ? 'إرسال' : 'حفظ'}</button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RequestsPanel({ requests, onProcess, onClose }) {
  return (
    <div className="requests-panel-v4">
      <div className="requests-header"><h3>📋 الطلبات ({requests?.length||0})</h3><button onClick={onClose}><X size={20}/></button></div>
      <div className="requests-list">{!requests?.length ? <p className="no-requests">لا توجد طلبات</p> : requests.map(r => (<div key={r.id} className="request-item"><div className="request-info"><span className={`req-badge ${r.request_type}`}>{r.request_type==='add'?'➕ إضافة':'✏️ تعديل'}</span><p><strong>من:</strong> {r.requester_name}</p><pre>{JSON.stringify(r.person_data,null,2)}</pre></div><div className="request-actions"><button onClick={()=>onProcess(r.id,'approve')} className="btn-approve">✓ موافقة</button><button onClick={()=>onProcess(r.id,'reject')} className="btn-reject">✗ رفض</button></div></div>))}</div>
    </div>
  )
}