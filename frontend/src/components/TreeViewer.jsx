import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ArrowLeft, ZoomIn, ZoomOut, Search, X, Edit3, Trash2, UserPlus, RefreshCw, FileText, Menu, Download, Minimize2, Maximize2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getFamilyTree, addPersonDirect, updateStatusDirect, deletePersonDirect, submitRequest, getPendingRequests, processRequest } from '../services/api'
import html2canvas from 'html2canvas'
import axios from 'axios'
import NotificationsBell from './NotificationsBell'
import BackupManager from './BackupManager'
import UserManagement from './UserManagement'

// ✅ تم تغيير الألوان: الحي=أزرق، الشهيد=أخضر، المتوفي=رمادي
const STATUS = {
  alive: { color: '#3b82f6', bg: '#dbeafe', text: '#1e40af', label: 'حي' },
  deceased: { color: '#64748b', bg: '#f1f5f9', text: '#475569', label: 'متوفي' },
  martyr: { color: '#10b981', bg: '#d1fae5', text: '#064e3b', label: 'شهيد' }
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

  const filterTree = useCallback((node, searchQuery, status) => {
    if (!node) return null
    
    const fullName = node.node.full_name || node.node.first_name || ''
    const matchesSearch = !searchQuery || fullName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = status === 'all' || node.node.status === status
    
    const filteredChildren = node.children
      .map(child => filterTree(child, searchQuery, status))
      .filter(Boolean)
    
    if (matchesSearch && matchesStatus) {
      return { ...node, children: filteredChildren }
    } else if (filteredChildren.length > 0) {
      return { ...node, children: filteredChildren }
    }
    
    return null
  }, [])

  const filteredLayout = useMemo(() => {
    if (!layout) return null
    return filterTree(layout, search.trim(), statusFilter)
  }, [layout, search, statusFilter, filterTree])

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
        if (type === 'add') {
          await addPersonDirect(payload)
        } else if (type === 'edit') {
          const updateData = {
            full_name: payload.full_name,
            status: payload.status,
            birth_date: payload.birth_date,
            death_date: payload.death_date,
            bio: payload.bio || ''
          }
          await axios.patch(`/api/tree/persons/${payload.id}`, updateData, { 
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            } 
          })
        } else if (type === 'delete') {
          await deletePersonDirect(payload.id)
        }
      } else if (isRegularUser && isReq) {
        await submitRequest(type.replace('request_', ''), payload)
        alert('✅ تم إرسال طلبك للمدير للمراجعة')
      }
      
      await loadTree()
      if (isAdmin) await loadPendingRequests()
      setModal(null)
    } catch (err) {
      console.error('Save error:', err)
      alert('خطأ: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleProcessRequest = async (requestId, action) => {
    try {
      const request = pendingRequests.find(r => r.id === requestId)
      if (!request) {
        alert('❌ الطلب غير موجود')
        return
      }

      if (action === 'approve') {
        const personData = request.person_data
        
        if (request.request_type === 'add') {
          await addPersonDirect(personData)
        } else if (request.request_type === 'edit') {
          const updateData = {
            full_name: personData.full_name,
            status: personData.status,
            birth_date: personData.birth_date,
            death_date: personData.death_date,
            bio: personData.bio || ''
          }
          
          await axios.patch(`/api/tree/persons/${personData.id}`, updateData, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })
        }
        
        const note = prompt('ملاحظة للموافقة (اختياري):') || ''
        await processRequest(requestId, 'approve', note)
        alert('✅ تمت الموافقة على الطلب وحفظ التعديلات')
      } else {
        const note = prompt('سبب الرفض (مطلوب):') || ''
        if (!note.trim()) {
          alert('⚠️ يجب إدخال سبب الرفض')
          return
        }
        await processRequest(requestId, 'reject', note)
        alert('❌ تم رفض الطلب')
      }
      
      await loadPendingRequests()
      await loadTree()
    } catch (err) {
      console.error('Process request error:', err)
      alert('خطأ في معالجة الطلب: ' + (err.response?.data?.error || err.message))
    }
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
            <input placeholder="بحث بالاسم..." value={search} onChange={e=>setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', minWidth: '150px' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 0.25rem' }}>
                <X size={14}/>
              </button>
            )}
          </div>
          
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'white', cursor: 'pointer', fontWeight: '600' }}>
            <option value="all">الكل</option>
            <option value="alive">🔵 أحياء</option>
            <option value="deceased">⚫ متوفين</option>
            <option value="martyr">🟢 شهداء</option>
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
            <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '10px' }}><div style={{ color: '#1e40af', fontSize: '0.875rem' }}>🔵 أحياء</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>{stats.alive}</div></div>
            <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '10px' }}><div style={{ color: '#475569', fontSize: '0.875rem' }}>⚫ متوفين</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#475569' }}>{stats.deceased}</div></div>
            <div style={{ background: '#d1fae5', padding: '1rem', borderRadius: '10px' }}><div style={{ color: '#064e3b', fontSize: '0.875rem' }}>🟢 شهداء</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#064e3b' }}>{stats.martyr}</div></div>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e0e7ff', borderRadius: '8px', textAlign: 'center', fontWeight: '600', color: '#3730a3' }}>
            {isAdmin ? '👑 مدير/مشرف' : '👤 عضو'}
          </div>

          {isAdmin && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <BackupManager user={effectiveUser} />
            </div>
          )}
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

      {modal && <ActionModal data={modal} isAdmin={isAdmin} isRegularUser={isRegularUser} onClose={()=>setModal(null)} onSave={handleSave}/>}
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
        
        {(isAdmin || isRegularUser) && (
          <g transform={`translate(${CARD_W - 15}, 12)`} style={{pointerEvents: 'all'}}>
            {isAdmin && (
              <>
                <g transform="translate(-55, 0)" onClick={e => { e.stopPropagation(); onAction('add', node.node); }} cursor="pointer">
                  <circle r="12" fill="white" stroke="#e2e8f0" />
                  <text y="4" textAnchor="middle" fontSize="14">➕</text>
                </g>
                <g transform="translate(-30, 0)" onClick={e => { e.stopPropagation(); onAction('edit', node.node); }} cursor="pointer">
                  <circle r="12" fill="white" stroke="#e2e8f0" />
                  <text y="4" textAnchor="middle" fontSize="12">✏️</text>
                </g>
                <g transform="translate(-5, 0)" onClick={e => { e.stopPropagation(); onAction('delete', node.node); }} cursor="pointer">
                  <circle r="12" fill="white" stroke="#e2e8f0" />
                  <text y="4" textAnchor="middle" fontSize="12">🗑️</text>
                </g>
              </>
            )}
            {isRegularUser && (
              <>
                <g transform="translate(-35, 0)" onClick={e => { e.stopPropagation(); onAction('request_add', node.node); }} cursor="pointer">
                  <circle r="12" fill="white" stroke="#e2e8f0" />
                  <text y="4" textAnchor="middle" fontSize="14">➕</text>
                </g>
                <g transform="translate(-5, 0)" onClick={e => { e.stopPropagation(); onAction('request_edit', node.node); }} cursor="pointer">
                  <circle r="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
                  <text y="4" textAnchor="middle" fontSize="12">✏️</text>
                </g>
              </>
            )}
          </g>
        )}
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
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
      >
        <div className="modal-head-v4" style={{ borderBottom: `2px solid ${sc.color}`, padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ margin: 0, color: sc.color, fontSize: '1.5rem' }}>👤 {person.full_name || person.first_name}</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', borderRadius: '50%', width: '36px', height: '36px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><X size={20}/></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.5rem 1rem', background: sc.bg, color: sc.text, borderRadius: '20px', fontWeight: '700', fontSize: '0.9rem' }}>{sc.label}</span>
            {person.birth_date && <span style={{ color: '#64748b', fontWeight: '600' }}>🎂 العمر: {age} سنة</span>}
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#334155', fontSize: '1rem' }}>📅 التواريخ</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>تاريخ الميلاد:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{person.birth_date ? new Date(person.birth_date).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>تاريخ الوفاة:</span>
                <span style={{ fontWeight: '600', color: person.death_date ? '#ef4444' : '#94a3b8' }}>{person.death_date ? new Date(person.death_date).toLocaleDateString('ar-SA') : '—'}</span>
              </div>
            </div>
          </div>

          {person.bio && (
            <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontSize: '1rem' }}>📝 السيرة الذاتية</h4>
              <div style={{ color: '#78350f', lineHeight: '2', fontSize: '0.95rem', whiteSpace: 'pre-wrap', wordWrap: 'break-word', overflowWrap: 'break-word', maxHeight: '300px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '6px' }}>{person.bio}</div>
            </div>
          )}

          <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '10px', border: '1px solid #bae6fd' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#0369a1', fontSize: '1rem' }}>ℹ️ معلومات إضافية</h4>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>الاسم الكامل:</span><span style={{ fontWeight: '600' }}>{person.full_name}</span></div>
              {person.father_name && (<div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>اسم الأب:</span><span style={{ fontWeight: '600' }}>{person.father_name}</span></div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>تاريخ الإضافة:</span><span style={{ fontWeight: '600' }}>{person.created_at ? new Date(person.created_at).toLocaleDateString('ar-SA') : '—'}</span></div>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}>✓ إغلاق</button>
        </div>
      </div>

      <style>{`
        .modal-box-v4::-webkit-scrollbar { width: 8px; }
        .modal-box-v4::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .modal-box-v4::-webkit-scrollbar-thumb { background: '#cbd5e1'; border-radius: 10px; }
        .modal-box-v4::-webkit-scrollbar-thumb:hover { background: '#94a3b8'; }
      `}</style>
    </div>
  )
}

function ActionModal({ data, isAdmin, isRegularUser, onClose, onSave }) {
  const { type, person } = data || {}
  if (!person) return null
  
  const [name, setName] = useState(person.full_name || person.first_name || '')
  const [fatherName, setFatherName] = useState(person.father_name || '')
  const [status, setStatus] = useState(person.status || 'alive')
  const [birthDate, setBirthDate] = useState(person.birth_date ? person.birth_date.split('T')[0] : '')
  const [deathDate, setDeathDate] = useState(person.death_date ? person.death_date.split('T')[0] : '')
  const [bio, setBio] = useState(person.bio || '')
  
  const isReq = type?.includes('request')
  const mType = isReq ? type.replace('request_', '') : type
  const isAdd = mType === 'add', isEdit = mType === 'edit'
  const isMemberRequest = isRegularUser && isReq
  
  const submit = e => {
    e.preventDefault()
    const payload = isAdd ? {
      first_name: name.trim(), 
      father_name: fatherName.trim() || person.full_name, 
      parent_id: person.id, 
      status,
      birth_date: birthDate || null, 
      death_date: deathDate || null, 
      bio: bio.trim() || null,
      full_name: `${name.trim()} بن ${fatherName.trim() || person.full_name}`
    } : {
      id: person.id, 
      full_name: name.trim() || person.full_name, 
      status,
      birth_date: birthDate || null, 
      death_date: deathDate || null, 
      bio: bio.trim() || null
    }
    onSave({ type: isReq ? (isAdd ? 'request_add' : 'request_edit') : mType, payload })
  }
  
  return (
    <div className="modal-overlay-v4" onClick={onClose} style={{ direction: 'rtl' }}>
      <div className="modal-box-v4" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
        <div className="modal-head-v4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>
            {isMemberRequest && '📤 '}
            {isReq ? (isAdd ? 'طلب إضافة شخص' : 'طلب تعديل بيانات') : (isAdd ? '➕ إضافة شخص' : isEdit ? '✏️ تعديل بيانات' : '🗑️ تأكيد الحذف')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20}/></button>
        </div>
        
        {isMemberRequest && (
          <div style={{ padding: '0.75rem 1.5rem', background: '#fef3c7', color: '#92400e', fontSize: '0.875rem', borderBottom: '1px solid #fde68a' }}>
            ⚠️ سيتم إرسال طلبك للمدير للمراجعة والموافقة
          </div>
        )}
        
        <form onSubmit={submit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isAdd && (
            <>
              <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>اسم الابن *</label>
              <input className="modal-input-v4" value={name} onChange={e => setName(e.target.value)} autoFocus required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>اسم الأب (اختياري)</label>
              <input className="modal-input-v4" value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder={person.full_name} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} /></div>
            </>
          )}
          {isEdit && (
            <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>الاسم الكامل</label>
            <input className="modal-input-v4" value={name} onChange={e => setName(e.target.value)} placeholder={person.full_name} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} /></div>
          )}
          
          <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>الحالة *</label>
          <select className="modal-input-v4" value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: 'white' }}>
            <option value="alive">🔵 حي</option>
            <option value="deceased">⚫ متوفي</option>
            <option value="martyr">🟢 شهيد</option>
          </select></div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>📅 تاريخ الميلاد</label>
            <input className="modal-input-v4" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} /></div>
            <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>📅 تاريخ الوفاة</label>
            <input className="modal-input-v4" type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} /></div>
          </div>
          
          <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>📝 السيرة الذاتية</label>
          <textarea className="modal-input-v4" rows="3" value={bio} onChange={e => setBio(e.target.value)} placeholder="نبذة عن الشخص..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', resize: 'vertical', fontFamily: 'inherit' }} /></div>
          
          {mType === 'delete' && <p style={{ color: '#ef4444', fontWeight: '600', background: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>⚠️ هل أنت متأكد من حذف "{person.full_name}"؟ لا يمكن التراجع عن هذا الإجراء!</p>}
          
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-confirm-v4" style={{ flex: 1, padding: '0.75rem', background: isMemberRequest ? '#f59e0b' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}>
              {isMemberRequest ? '📤 إرسال الطلب' : (isReq ? 'إرسال' : 'حفظ')}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RequestsPanel({ requests, onProcess, onClose }) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef(null)
  
  useEffect(() => {
    const centerX = (window.innerWidth - 800) / 2
    const centerY = (window.innerHeight - 600) / 2
    setPosition({ x: centerX, y: centerY })
  }, [])
  
  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])
  
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
    if (!isMaximized) {
      setPosition({ x: 0, y: 0 })
    } else {
      const centerX = (window.innerWidth - 800) / 2
      const centerY = (window.innerHeight - 600) / 2
      setPosition({ x: centerX, y: centerY })
    }
  }
  
  const width = isMaximized ? '95vw' : '800px'
  const height = isMaximized ? '90vh' : '600px'
  const left = isMaximized ? '2.5vw' : position.x
  const top = isMaximized ? '5vh' : position.y

  return (
    <div 
      className="requests-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        ref={panelRef}
        className="requests-panel-modal"
        onClick={e => e.stopPropagation()}
        style={{
          position: isMaximized ? 'relative' : 'absolute',
          width,
          height,
          left: isMaximized ? 0 : left,
          top: isMaximized ? 0 : top,
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          direction: 'rtl',
          overflow: 'hidden',
          cursor: isMaximized ? 'default' : (isDragging ? 'grabbing' : 'grab'),
          transition: isDragging ? 'none' : 'all 0.3s ease'
        }}
      >
        <div 
          className="requests-header" 
          onMouseDown={handleMouseDown}
          style={{ 
            padding: '1.5rem', 
            borderBottom: '2px solid #e2e8f0', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            cursor: isMaximized ? 'default' : (isDragging ? 'grabbing' : 'grab')
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            📋 الطلبات المعلقة 
            <span style={{ 
              background: 'rgba(255,255,255,0.3)', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '20px',
              fontSize: '1rem'
            }}>
              {requests?.length||0}
            </span>
          </h3>
          
          <div style={{ display: 'flex', gap: '0.5rem' }} className="no-drag">
            <button 
              onClick={toggleMaximize} 
              title={isMaximized ? 'تصغير' : 'تكبير'}
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                border: 'none', 
                borderRadius: '8px', 
                width: '36px', 
                height: '36px',
                cursor: 'pointer', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {isMaximized ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
            </button>
            <button 
              onClick={onClose} 
              title="إغلاق"
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                border: 'none', 
                borderRadius: '8px', 
                width: '36px', 
                height: '36px',
                cursor: 'pointer', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={20}/>
            </button>
          </div>
        </div>
        
        <div className="requests-list" style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1.5rem', 
          background: '#f8fafc' 
        }}>
          {!requests?.length ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 2rem', 
              background: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginTop: '2rem'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
              <p style={{ color: '#64748b', fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>لا توجد طلبات معلقة</p>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>جميع الطلبات تمت معالجتها بنجاح</p>
            </div>
          ) : requests.map(r => (
            <div key={r.id} className="request-item" style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '1.5rem', 
              marginBottom: '1rem', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '1rem', 
                paddingBottom: '1rem', 
                borderBottom: '2px solid #f1f5f9' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span className={`req-badge ${r.request_type}`} style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '20px', 
                    fontSize: '0.875rem', 
                    fontWeight: '700', 
                    background: r.request_type==='add' ? '#d1fae5' : '#fef3c7', 
                    color: r.request_type==='add' ? '#064e3b' : '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {r.request_type==='add' ? '➕' : '✏️'}
                    {r.request_type==='add' ? 'طلب إضافة' : 'طلب تعديل'}
                  </span>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#64748b', 
                    background: '#f1f5f9', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '6px' 
                  }}>
                    {new Date(r.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: '#475569' }}>
                  <strong>👤 مقدم الطلب:</strong> 
                  <span style={{ color: '#1e293b', fontWeight: '600', marginRight: '0.5rem' }}>{r.requester_name}</span>
                </p>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>📋 البيانات:</p>
                <pre style={{ 
                  background: 'white', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  fontSize: '0.8rem', 
                  overflowX: 'auto', 
                  margin: 0, 
                  direction: 'ltr', 
                  textAlign: 'left',
                  border: '1px solid #e2e8f0',
                  lineHeight: '1.6',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>{JSON.stringify(r.person_data, null, 2)}</pre>
              </div>
              
              <div className="request-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={()=>onProcess(r.id,'approve')} 
                  className="btn-approve" 
                  style={{ 
                    flex: 1, 
                    padding: '0.875rem', 
                    background: '#10b981', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#059669'}
                  onMouseLeave={e => e.target.style.background = '#10b981'}
                >
                  ✓ موافقة
                </button>
                <button 
                  onClick={()=>onProcess(r.id,'reject')} 
                  className="btn-reject" 
                  style={{ 
                    flex: 1, 
                    padding: '0.875rem', 
                    background: '#ef4444', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#dc2626'}
                  onMouseLeave={e => e.target.style.background = '#ef4444'}
                >
                  ✗ رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        .requests-modal-overlay::-webkit-scrollbar {
          width: 8px;
        }
        .requests-list::-webkit-scrollbar {
          width: 8px;
        }
        .requests-list::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .requests-list::-webkit-scrollbar-thumb {
          background: '#cbd5e1';
          border-radius: 10px;
        }
        .requests-list::-webkit-scrollbar-thumb:hover {
          background: '#94a3b8';
        }
      `}</style>
    </div>
  )
}