import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ArrowLeft, ZoomIn, ZoomOut, Search, X, Edit3, Trash2, UserPlus, RefreshCw, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getFamilyTree, addPersonDirect, updateStatusDirect, deletePersonDirect, submitRequest, getPendingRequests, processRequest } from '../services/api'

const STATUS = {
  alive: { color: '#22c55e', bg: '#dcfce7', label: 'حي' },
  deceased: { color: '#64748b', bg: '#f1f5f9', label: 'متوفي' },
  martyr: { color: '#ef4444', bg: '#fee2e2', label: 'شهيد' }
}

const NODE_W = 180, NODE_H = 65, LEVEL_H = 140, SIBLING_GAP = 30

function buildTreeLayout(node, depth = 0, leafCounter = { val: 0 }) {
  const isLeaf = !node.children?.length
  const children = node.children?.map(c => buildTreeLayout(c, depth + 1, leafCounter)) || []
  let x = isLeaf ? leafCounter.val++ * (NODE_W + SIBLING_GAP) + 50 : (children[0].x + children[children.length - 1].x) / 2
  return { node, x, y: depth * LEVEL_H + 60, width: NODE_W, children, depth }
}

function getTreeBounds(layout) {
  let maxX = 0, maxY = 0
  const t = n => { maxX = Math.max(maxX, n.x + NODE_W + 50); maxY = Math.max(maxY, n.y + NODE_H + 50); n.children.forEach(t) }
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
  const [zoom, setZoom] = useState(1)
  const [modal, setModal] = useState(null)
  const [stats, setStats] = useState({ total: 0, alive: 0, deceased: 0, martyr: 0 })
  const [pendingRequests, setPendingRequests] = useState([])
  const [showRequests, setShowRequests] = useState(false)
  
  const [currentUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })
  const canvasRef = useRef(null)
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
    if (!layout || !search.trim()) return layout
    const match = n => (n.node.full_name || n.node.first_name || '').toLowerCase().includes(search.toLowerCase())
    const filter = n => match(n) ? n : n.children.map(filter).filter(Boolean).length ? { ...n, children: n.children.map(filter).filter(Boolean) } : null
    return filter(layout)
  }, [layout, search])

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
        if (type === 'edit') await updateStatusDirect(payload.id, payload.status)
        if (type === 'delete') await deletePersonDirect(payload.id)
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
    <div className="tree-app-v4">
      <header className="top-bar-v4">
        <button onClick={() => navigate('/')}><ArrowLeft size={18}/> رجوع</button>
        <h2>🌳 شجرة النسب</h2>
        <div className="toolbar-v4">
          <div className="search-box"><Search size={16}/><input placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
          {isAdmin && <button onClick={()=>setShowRequests(!showRequests)}><FileText size={18}/>{pendingRequests.length>0 && <span className="badge-count">{pendingRequests.length}</span>}</button>}
          <button onClick={()=>setZoom(z=>Math.min(z+0.2,2.5))}><ZoomIn size={18}/></button>
          <button onClick={()=>setZoom(z=>Math.max(z-0.2,0.4))}><ZoomOut size={18}/></button>
          <button onClick={()=>setZoom(1)}><RefreshCw size={18}/></button>
          <button onClick={onLogout} className="logout-btn">خروج</button>
        </div>
      </header>
      <div className="main-v4">
        <aside className="stats-panel-v4">
          <h3>📊 إحصائيات</h3>
          <div className="stat-grid-v4">
            <div className="stat-card-v4 total"><span>👥 إجمالي</span><b>{stats.total}</b></div>
            <div className="stat-card-v4 alive"><span>🟢 أحياء</span><b>{stats.alive}</b></div>
            <div className="stat-card-v4 deceased"><span>⚫ متوفين</span><b>{stats.deceased}</b></div>
            <div className="stat-card-v4 martyr"><span>🔴 شهداء</span><b>{stats.martyr}</b></div>
          </div>
          <div className="user-role-info">{isAdmin ? '👑 مدير/مشرف' : '👤 عضو'}</div>
        </aside>
        <div ref={canvasRef} className="tree-canvas-v4" onMouseDown={e=>{isDragging.current=true;dragStart.current={x:e.clientX,y:e.clientY}}} style={{cursor:isDragging.current?'grabbing':'grab'}}>
          <div className="tree-wrapper-v4" style={{width:bounds.width,height:bounds.height,transform:`scale(${zoom})`}}>
            {filteredLayout && (<><svg className="tree-lines-v4"><RenderLines node={filteredLayout}/></svg><div className="tree-nodes-v4"><RenderNodes node={filteredLayout} isAdmin={isAdmin} isRegularUser={isRegularUser} onAction={(t,p)=>setModal({type:t,person:p})}/></div></>)}
          </div>
        </div>
      </div>
      {modal && <ActionModal data={modal} isAdmin={isAdmin} onClose={()=>setModal(null)} onSave={handleSave}/>}
      {showRequests && isAdmin && <RequestsPanel requests={pendingRequests} onProcess={handleProcessRequest} onClose={()=>setShowRequests(false)}/>}
    </div>
  )
}

function RenderLines({ node }) {
  if (!node.children.length) return null
  return <>{node.children.map(c => (<g key={c.node.id}><line x1={node.x+NODE_W/2} y1={node.y+NODE_H} x2={node.x+NODE_W/2} y2={node.y+NODE_H+25} stroke="#94a3b8" strokeWidth="2"/><line x1={c.x+NODE_W/2} y1={node.y+NODE_H+25} x2={c.x+NODE_W/2} y2={c.y} stroke="#94a3b8" strokeWidth="2"/><RenderLines node={c}/></g>))}</>
}

function RenderNodes({ node, isAdmin, isRegularUser, onAction }) {
  const cfg = STATUS[node.node.status] || STATUS.alive
  return (<><div className="person-card-v4" style={{left:node.x,top:node.y,borderColor:cfg.color,background:cfg.bg}}>
    <div className="card-name-v4">{node.node.full_name||node.node.first_name}</div>
    <div className="card-status-v4" style={{color:cfg.color}}>{cfg.label}</div>
    {(isAdmin||isRegularUser) && <div className="card-actions-v4">
      {isAdmin && <><button onClick={e=>{e.stopPropagation();onAction('add',node.node)}}><UserPlus size={14}/></button><button onClick={e=>{e.stopPropagation();onAction('edit',node.node)}}><Edit3 size={14}/></button><button onClick={e=>{e.stopPropagation();onAction('delete',node.node)}}><Trash2 size={14}/></button></>}
      {isRegularUser && <><button onClick={e=>{e.stopPropagation();onAction('request_add',node.node)}}><UserPlus size={14}/></button><button onClick={e=>{e.stopPropagation();onAction('request_edit',node.node)}}><Edit3 size={14}/></button></>}
    </div>}
  </div>{node.children.map(c=>(<RenderNodes key={c.node.id} node={c} isAdmin={isAdmin} isRegularUser={isRegularUser} onAction={onAction}/>))}</>)
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
    const payload = isAdd ? { first_name:name.trim(), father_name:fatherName.trim()||person.full_name, parent_id:person.id, status, birth_date:birthDate||null, death_date:deathDate||null, bio:bio.trim()||null, full_name:`${name.trim()} بن ${fatherName.trim()||person.full_name}` } : { id:person.id, full_name:name.trim()||person.full_name, status, birth_date:birthDate||null, death_date:deathDate||null, bio:bio.trim()||null }
    onSave({ type: isReq ? (isAdd?'request_add':'request_edit') : mType, payload })
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="m-box" onClick={e=>e.stopPropagation()}>
        <div className="m-head"><h3>{isReq?(isAdd?'📝 طلب إضافة':'📝 طلب تعديل'):(isAdd?'➕ إضافة':isEdit?'✏️ تعديل':'🗑️ حذف')}</h3><button onClick={onClose}><X size={20}/></button></div>
        <form onSubmit={submit}>
          {isAdd && <div className="fg"><label>اسم الابن *</label><input className="inp" value={name} onChange={e=>setName(e.target.value)} autoFocus required/></div>}
          {isAdd && <div className="fg"><label>اسم الأب</label><input className="inp" value={fatherName} onChange={e=>setFatherName(e.target.value)} placeholder={person.full_name}/></div>}
          {isEdit && <div className="fg"><label>الاسم الكامل</label><input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder={person.full_name}/></div>}
          <div className="fg"><label>الحالة</label><select className="inp" value={status} onChange={e=>setStatus(e.target.value)}><option value="alive">🟢 حي</option><option value="deceased">⚫ متوفي</option><option value="martyr">🔴 شهيد</option></select></div>
          <div className="fg-row" style={{display:'flex',gap:'0.5rem'}}><div className="fg" style={{flex:1}}><label>الميلاد</label><input className="inp" type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)}/></div><div className="fg" style={{flex:1}}><label>الوفاة</label><input className="inp" type="date" value={deathDate} onChange={e=>setDeathDate(e.target.value)}/></div></div>
          <div className="fg"><label>السيرة الذاتية</label><textarea className="inp" rows="2" value={bio} onChange={e=>setBio(e.target.value)} placeholder="نبذة عن الشخص..."/></div>
          {mType==='delete' && <p className="warn">⚠️ حذف {person.full_name}؟</p>}
          <div className="m-btns"><button type="submit" className="ok">{isReq?'إرسال الطلب':(mType==='delete'?'تأكيد':'حفظ')}</button><button type="button" onClick={onClose}>إلغاء</button></div>
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