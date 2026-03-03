/**
 * LandingScreen.jsx — Pre-upload Hero Screen
 * ─────────────────────────────────────────────────────────────────────────
 * Shown when no chat data is loaded. Drives users to upload their chat.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, BarChart2, Award, User, Zap } from 'lucide-react'

// Feature highlight cards shown on the landing page
const FEATURES = [
  { icon: BarChart2, label: 'Activity Heatmaps',   color: '#A5B4FC', desc: 'See when your group is most alive' },
  { icon: Award,     label: 'Hall of Shame',        color: '#34D399', desc: '8 hilariously accurate awards' },
  { icon: User,      label: 'Member Deep Dive',     color: '#F9A8D4', desc: 'Stalk each member\'s chat habits' },
  { icon: Zap,       label: 'Instant Analysis',     color: '#FCD34D', desc: 'Results in under 2 seconds' },
]

// Stagger animation container
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } }
}
const itemVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

export default function LandingScreen({ onUploadClick }) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center py-16 px-4">

      {/* Hero badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="badge bg-periwinkle-400/15 text-periwinkle-600 mb-6"
      >
        <Zap size={12} /> Spotify Wrapped · but for WhatsApp
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-5xl sm:text-6xl font-bold text-slate-800 mb-4 leading-tight"
      >
        Discover Your Group's{' '}
        <span className="gradient-text">Chat Vibe</span>
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-lg text-slate-500 max-w-lg mb-10"
      >
        Upload your WhatsApp chat export and get beautiful, animated insights about
        your group — who talks the most, when, and why.
      </motion.p>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        whileHover={{ scale: 1.06, boxShadow: '0 20px 40px -10px rgba(129,140,248,0.45)' }}
        whileTap={{ scale: 0.97 }}
        onClick={onUploadClick}
        className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-white text-lg font-bold shadow-soft-lg mb-16"
        style={{ background: 'linear-gradient(135deg, #818CF8, #34D399)' }}
      >
        <MessageSquare size={20} />
        Analyze My Chat
      </motion.button>

      {/* Feature Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full"
      >
        {FEATURES.map(({ icon: Icon, label, color, desc }) => (
          <motion.div
            key={label}
            variants={itemVariants}
            className="card text-left cursor-default"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: color + '22' }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <p className="font-bold text-slate-700 text-sm">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Privacy note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10 text-xs text-slate-400"
      >
        🔒 Your chat is processed locally and never stored on our servers.
      </motion.p>

    </div>
  )
}
