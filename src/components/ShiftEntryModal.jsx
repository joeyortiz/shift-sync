import { useState, useRef } from 'react'
import { addShift, updateShift } from '../lib/supabase'
import { extractTextFromImage, parseScheduleText } from '../lib/ocr'

const TITLE_COLORS = {
  add: 'linear-gradient(to right, #7c3aed, #4f46e5)',
  ocr: 'linear-gradient(to right, #0891b2, #0e7490)',
}

export default function ShiftEntryModal({ user, group, defaultDate, editShift, onSave, onClose }) {
  const isEditing = !!editShift
  const [tab, setTab] = useState('manual')

  // Manual form state
  const [date, setDate] = useState(editShift?.shift_date || defaultDate || '')
  const [startTime, setStartTime] = useState(editShift?.start_time?.slice(0, 5) || '09:00')
  const [endTime, setEndTime] = useState(editShift?.end_time?.slice(0, 5) || '17:00')
  const [notes, setNotes] = useState(editShift?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // OCR state
  const [ocrFile, setOcrFile] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('') // idle | scanning | parsed | importing | done
  const [parsedShifts, setParsedShifts] = useState([])
  const [ocrError, setOcrError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleManualSave = async () => {
    if (!date || !startTime || !endTime) {
      setError('Please fill in date, start time, and end time.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        user_id: user.id,
        group_id: group.id,
        shift_date: date,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        notes,
      }
      let result
      if (isEditing) {
        result = await updateShift(editShift.id, payload)
      } else {
        result = await addShift(payload)
      }
      onSave(result, isEditing)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setOcrError('Please upload an image file (PNG, JPG, etc.)')
      return
    }
    setOcrFile(file)
    setOcrError('')
    setParsedShifts([])
    setOcrStatus('idle')
  }

  const handleOcrScan = async () => {
    if (!ocrFile) return
    setOcrStatus('scanning')
    setOcrProgress(0)
    setOcrError('')
    try {
      const text = await extractTextFromImage(ocrFile, (p) => setOcrProgress(p))
      const parsed = parseScheduleText(text)
      if (parsed.length === 0) {
        setOcrError('No shifts found in image. Try a clearer screenshot or add manually.')
        setOcrStatus('idle')
      } else {
        setParsedShifts(parsed.map(s => ({ ...s, selected: true })))
        setOcrStatus('parsed')
      }
    } catch (err) {
      setOcrError(`OCR failed: ${err.message}`)
      setOcrStatus('idle')
    }
  }

  const handleImportSelected = async () => {
    const toImport = parsedShifts.filter(s => s.selected)
    if (!toImport.length) {
      setOcrError('Select at least one shift to import.')
      return
    }
    setOcrStatus('importing')
    setOcrError('')
    let imported = 0
    for (const s of toImport) {
      try {
        await addShift({
          user_id: user.id,
          group_id: group.id,
          shift_date: s.shift_date,
          start_time: s.start_time,
          end_time: s.end_time,
          notes: s.notes || '',
        })
        imported++
      } catch (err) {
        console.warn('Failed to import shift:', err.message)
      }
    }
    setOcrStatus('done')
    // Notify parent with a refresh signal
    onSave({ _refresh: true, count: imported }, false)
  }

  const toggleShift = (i) => {
    setParsedShifts(prev => prev.map((s, idx) => idx === i ? { ...s, selected: !s.selected } : s))
  }

  const formatTimeDisplay = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'pm' : 'am'
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hr}:${String(m).padStart(2, '0')}${ampm}`
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        {/* Title bar */}
        <div
          className="modal-titlebar"
          style={{ background: tab === 'ocr' ? TITLE_COLORS.ocr : TITLE_COLORS.add }}
        >
          <span style={{ fontSize: 14 }}>{isEditing ? '✏️' : '➕'}</span>
          <span className="modal-titlebar-title">
            {isEditing ? 'Edit Shift' : 'Add Shift'}
          </span>
          <div className="win-titlebar-btns">
            <div className="win-btn close" onClick={onClose}>✕</div>
          </div>
        </div>

        <div className="modal-content">
          {/* Tabs */}
          {!isEditing && (
            <div style={{ display: 'flex', marginBottom: 14, gap: 4 }}>
              {['manual', 'ocr'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="modal-btn"
                  style={{
                    background: tab === t ? '#7c3aed' : undefined,
                    color: tab === t ? '#fff' : undefined,
                    fontSize: 15,
                    padding: '3px 14px',
                  }}
                >
                  {t === 'manual' ? '✏️ Manual' : '📷 Screenshot OCR'}
                </button>
              ))}
            </div>
          )}

          {/* Manual Entry */}
          {tab === 'manual' && (
            <>
              <div className="modal-field">
                <label>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="modal-field">
                  <label>Start Time</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="modal-field">
                  <label>End Time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="modal-field">
                <label>Notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Dollar Tree - Store 123"
                />
              </div>
              {error && (
                <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>
              )}
              <div className="modal-btn-row">
                <button className="modal-btn" onClick={onClose}>Cancel</button>
                <button className="modal-btn primary" onClick={handleManualSave} disabled={saving}>
                  {saving ? 'Saving...' : isEditing ? 'Update' : 'Add Shift'}
                </button>
              </div>
            </>
          )}

          {/* OCR Upload */}
          {tab === 'ocr' && (
            <>
              {ocrStatus !== 'parsed' && ocrStatus !== 'importing' && ocrStatus !== 'done' && (
                <>
                  <div
                    className={`ocr-drop-zone ${dragging ? 'dragging' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      handleFile(e.dataTransfer.files[0])
                    }}
                  >
                    {ocrFile
                      ? <><div style={{ fontSize: 24, marginBottom: 4 }}>🖼️</div><div>{ocrFile.name}</div></>
                      : <><div style={{ fontSize: 28, marginBottom: 6 }}>📷</div><div>Drop your schedule screenshot here</div><div style={{ fontSize: 11, marginTop: 4, color: '#888' }}>or click to browse</div></>
                    }
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])}
                  />

                  {ocrStatus === 'scanning' && (
                    <div className="ocr-progress">
                      Scanning... {ocrProgress}%
                      <div style={{ height: 6, background: '#ddd', marginTop: 6, borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${ocrProgress}%`, background: '#7c3aed', borderRadius: 3, transition: 'width 0.2s' }} />
                      </div>
                    </div>
                  )}

                  {ocrError && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{ocrError}</div>}

                  <div className="modal-btn-row">
                    <button className="modal-btn" onClick={onClose}>Cancel</button>
                    <button
                      className="modal-btn primary"
                      onClick={handleOcrScan}
                      disabled={!ocrFile || ocrStatus === 'scanning'}
                      style={{ background: '#0891b2', borderColor: '#67e8f9' }}
                    >
                      {ocrStatus === 'scanning' ? 'Scanning...' : '🔍 Scan Image'}
                    </button>
                  </div>
                </>
              )}

              {ocrStatus === 'parsed' && (
                <>
                  <div style={{ color: '#333', marginBottom: 10, fontFamily: 'VT323', fontSize: 18 }}>
                    Found {parsedShifts.length} shift{parsedShifts.length !== 1 ? 's' : ''}. Select which to import:
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
                    {parsedShifts.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => toggleShift(i)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 8px', cursor: 'pointer',
                          background: s.selected ? '#ede9fe' : '#f5f5f5',
                          borderBottom: '1px solid #e0e0e0',
                          fontSize: 12,
                        }}
                      >
                        <input type="checkbox" checked={s.selected} onChange={() => toggleShift(i)} />
                        <span style={{ fontWeight: 'bold', minWidth: 90 }}>{s.shift_date}</span>
                        <span style={{ color: '#7c3aed' }}>
                          {formatTimeDisplay(s.start_time)} – {formatTimeDisplay(s.end_time)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {ocrError && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{ocrError}</div>}
                  <div className="modal-btn-row">
                    <button className="modal-btn" onClick={() => setOcrStatus('idle')}>← Back</button>
                    <button
                      className="modal-btn primary"
                      onClick={handleImportSelected}
                      style={{ background: '#0891b2', borderColor: '#67e8f9' }}
                    >
                      Import {parsedShifts.filter(s => s.selected).length} Shift{parsedShifts.filter(s => s.selected).length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </>
              )}

              {ocrStatus === 'importing' && (
                <div className="ocr-progress">Saving shifts...</div>
              )}

              {ocrStatus === 'done' && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                  <div style={{ fontFamily: 'VT323', fontSize: 22, color: '#16a34a' }}>Shifts imported!</div>
                  <div className="modal-btn-row" style={{ justifyContent: 'center', marginTop: 12 }}>
                    <button className="modal-btn primary" onClick={onClose}>Done</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
