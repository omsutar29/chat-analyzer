/**
 * UploadModal.jsx — Drag & Drop File Upload Modal
 * ─────────────────────────────────────────────────────────────────────────
 * Features:
 *   - Drag-and-drop zone with animated visual feedback
 *   - Click-to-browse fallback
 *   - File validation (must be .txt)
 *   - Upload progress + loading state
 *   - Error display with helpful messages
 *   - How-to-export instructions accordion
 */

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileText, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import axios from 'axios'

// ─── Animation Variants ──────────────────────────────────────────────────────
const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
}
const modalVariants = {
  hidden:  { opacity: 0, scale: 0.92, y: 20 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit:    { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
}

export default function UploadModal({ onClose, onDataReady }) {
  const [isDragging, setIsDragging]   = useState(false)
  const [file, setFile]               = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [error, setError]             = useState(null)
  const [progress, setProgress]       = useState(0)
  const [showInstructions, setShowInstructions] = useState(false)
  const fileInputRef = useRef(null)

  // ── File validation ────────────────────────────────────────────────────
  const validateFile = (f) => {
    if (!f) return 'No file selected.'
    if (!f.name.endsWith('.txt')) return 'Please select a .txt file (WhatsApp export).'
    if (f.size > 50 * 1024 * 1024) return 'File too large (max 50 MB).'
    return null
  }

  const handleFileSelect = (f) => {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setFile(f)
    setError(null)
  }

  // ── Drag & Drop handlers ───────────────────────────────────────────────
  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true) }, [])
  const onDragLeave = useCallback(() => setIsDragging(false), [])
  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    handleFileSelect(dropped)
  }, [])

  // ── Upload to FastAPI ──────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          // Show upload progress (0-50%), analysis is the other 50%
          setProgress(Math.round((e.loaded / e.total) * 50))
        },
      })
      setProgress(100)
      // Small delay so user sees the 100% state
      setTimeout(() => onDataReady(response.data), 400)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Upload failed. Please try again.'
      setError(detail)
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden" animate="visible" exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden" animate="visible" exit="exit"
        className="bg-white rounded-3xl p-8 w-full max-w-md relative"
        style={{ boxShadow: '0 25px 80px -10px rgba(129,140,248,0.35)' }}
      >

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-periwinkle-300/20 hover:text-periwinkle-600 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Upload Your Chat</h2>
          <p className="text-sm text-slate-400 mt-1">Export your WhatsApp group chat as a .txt file</p>
        </div>

        {/* Drop Zone */}
        <motion.div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          animate={{ scale: isDragging ? 1.02 : 1 }}
          transition={{ duration: 0.15 }}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors duration-200 ${
            isDragging
              ? 'border-periwinkle-500 bg-periwinkle-300/10'
              : file
              ? 'border-mint-400 bg-mint-300/10'
              : 'border-slate-200 hover:border-periwinkle-400 hover:bg-periwinkle-300/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <CheckCircle size={40} className="text-mint-400" />
                <p className="font-bold text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </motion.div>
            ) : (
              <motion.div key="empty" className="flex flex-col items-center gap-2">
                <motion.div
                  animate={{ y: isDragging ? -8 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Upload size={40} className={isDragging ? 'text-periwinkle-500' : 'text-slate-300'} />
                </motion.div>
                <p className="font-semibold text-slate-600">
                  {isDragging ? 'Drop it!' : 'Drag & drop your chat'}
                </p>
                <p className="text-xs text-slate-400">or <span className="text-periwinkle-500 font-semibold">click to browse</span></p>
                <span className="badge bg-slate-100 text-slate-500 mt-1">.txt files only</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-red-50 text-red-600 text-sm"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4"
            >
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{progress < 50 ? 'Uploading...' : 'Analyzing...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #818CF8, #34D399)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyze button */}
        <motion.button
          whileHover={file && !uploading ? { scale: 1.02 } : {}}
          whileTap={file && !uploading ? { scale: 0.98 } : {}}
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`w-full mt-4 py-3.5 rounded-2xl font-bold text-white transition-all duration-200 ${
            !file || uploading
              ? 'opacity-50 cursor-not-allowed bg-slate-300'
              : ''
          }`}
          style={file && !uploading ? { background: 'linear-gradient(135deg, #818CF8, #34D399)' } : {}}
        >
          {uploading ? '✨ Analyzing...' : '🚀 Analyze Chat'}
        </motion.button>

        {/* How to export accordion */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center justify-between w-full text-sm text-slate-500 hover:text-periwinkle-500 transition-colors"
          >
            <span>How to export WhatsApp chat?</span>
            <motion.div animate={{ rotate: showInstructions ? 180 : 0 }}>
              <ChevronDown size={16} />
            </motion.div>
          </button>

          <AnimatePresence>
            {showInstructions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 text-xs text-slate-500 space-y-2 bg-slate-50 rounded-xl p-3">
                  <p className="font-semibold text-slate-600">📱 On your phone:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open the WhatsApp group chat</li>
                    <li>Tap the group name → More (⋮)</li>
                    <li>Select <strong>"Export Chat"</strong></li>
                    <li>Choose <strong>"Without Media"</strong></li>
                    <li>Save/send the .txt file to your device</li>
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </motion.div>
  )
}
