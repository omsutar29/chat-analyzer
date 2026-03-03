/**
 * App.jsx — Root Component
 * ─────────────────────────────────────────────────────────────────────────
 * Session isolation: on first render, we generate a UUID and store it in
 * React state. Every API call sends this as the "x-session-id" header.
 * Each browser tab gets its own UUID → completely independent analyses.
 *
 * axios.defaults.headers is set once here so ALL axios calls in child
 * components automatically include the session header — no prop drilling.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, BarChart2, Award, User, Upload } from 'lucide-react'
import axios from 'axios'

import UploadModal from './components/UploadModal.jsx'
import Dashboard from './components/Dashboard.jsx'
import HallOfShame from './components/HallOfShame.jsx'
import MemberAnalysis from './components/MemberAnalysis.jsx'
import LandingScreen from './components/LandingScreen.jsx'

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Dashboard',       icon: BarChart2 },
  { id: 'members',   label: 'Member Deep Dive', icon: User },
  { id: 'shame',     label: 'Hall of Shame',    icon: Award },
]

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.2 } },
}

// ─── UUID generator (no external library needed) ─────────────────────────────
function generateSessionId() {
  // crypto.randomUUID() is available in all modern browsers
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default function App() {
  const [chatData,   setChatData]   = useState(null)
  const [activeTab,  setActiveTab]  = useState('dashboard')
  const [showUpload, setShowUpload] = useState(false)

  // ── Generate session ID once on mount ────────────────────────────────────
  // This UUID uniquely identifies this browser tab's session.
  // It's injected into every axios request via the default header below.
  useEffect(() => {
    const sessionId = generateSessionId()

    // Set globally on axios — every request from any component will include this
    const BASE = import.meta.env.VITE_API_URL || ''
    axios.defaults.baseURL = BASE
    axios.defaults.headers.common['x-session-id'] = sessionId

    console.log(`[Chat Vibe] Session initialized: ${sessionId.slice(0, 8)}...`)
  }, [])

  const handleDataReady = (data) => {
    setChatData(data)
    setShowUpload(false)
    setActiveTab('dashboard')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDFBF7' }}>

      {/* ── Sticky Navbar ─────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-periwinkle-300/30"
        style={{ boxShadow: '0 4px 20px -4px rgba(165,180,252,0.15)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setChatData(null)}>
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              >
                <MessageSquare size={28} className="text-periwinkle-500 fill-periwinkle-300/50" />
              </motion.div>
              <span className="text-xl font-bold gradient-text tracking-wide">Chat Vibe</span>
            </div>

            {/* Nav links */}
            {chatData && (
              <div className="hidden md:flex items-center gap-1">
                {TABS.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-periwinkle-400/20 text-periwinkle-600'
                          : 'text-slate-500 hover:text-periwinkle-500 hover:bg-periwinkle-300/10'
                      }`}
                    >
                      <Icon size={15} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Upload CTA */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #818CF8, #34D399)' }}
            >
              <Upload size={14} />
              {chatData ? 'New Chat' : 'Upload Chat'}
            </motion.button>

          </div>
        </div>

        {/* Mobile tab bar */}
        {chatData && (
          <div className="md:hidden flex border-t border-periwinkle-300/20">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors ${
                    activeTab === tab.id ? 'text-periwinkle-500' : 'text-slate-400'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label.split(' ')[0]}
                </button>
              )
            })}
          </div>
        )}
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {!chatData ? (
            <motion.div key="landing" variants={pageVariants} initial="hidden" animate="visible" exit="exit">
              <LandingScreen onUploadClick={() => setShowUpload(true)} />
            </motion.div>
          ) : activeTab === 'dashboard' ? (
            <motion.div key="dashboard" variants={pageVariants} initial="hidden" animate="visible" exit="exit">
              <Dashboard data={chatData} />
            </motion.div>
          ) : activeTab === 'shame' ? (
            <motion.div key="shame" variants={pageVariants} initial="hidden" animate="visible" exit="exit">
              <HallOfShame data={chatData.hall_of_shame} />
            </motion.div>
          ) : activeTab === 'members' ? (
            <motion.div key="members" variants={pageVariants} initial="hidden" animate="visible" exit="exit">
              <MemberAnalysis members={chatData.members} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* ── Upload Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onDataReady={handleDataReady}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
