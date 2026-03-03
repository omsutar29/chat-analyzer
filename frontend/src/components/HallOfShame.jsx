/**
 * HallOfShame.jsx — 8 Award Trading Cards
 * ─────────────────────────────────────────────────────────────────────────
 * Each card is a "trading card" with:
 *   - Unique gradient background
 *   - Large icon
 *   - Award title + funny subtitle
 *   - Winner name + statistic
 *
 * Layout: 4×2 grid on desktop, 2×4 on tablet, 1×8 on mobile
 */

import React from 'react'
import { motion } from 'framer-motion'
import {
  Ghost, BookOpen, Zap, Smile, Moon, HelpCircle, Film, Sun
} from 'lucide-react'

// ─── Award Definitions (static metadata) ─────────────────────────────────────
// Each maps to a key from the API's hall_of_shame response
const AWARDS = [
  {
    key:    'ghost',
    title:  'The Ghost',
    icon:   Ghost,
    gradient: ['#C7D2FE', '#E0E7FF'],
    textColor: '#4338CA',
    iconBg:  '#818CF820',
    border:  '#818CF840',
    tagline: '👻 Seen but never heard',
  },
  {
    key:    'novelist',
    title:  'The Novelist',
    icon:   BookOpen,
    gradient: ['#FDE68A', '#FEF3C7'],
    textColor: '#92400E',
    iconBg:  '#F59E0B20',
    border:  '#F59E0B40',
    tagline: '📖 Every text is a saga',
  },
  {
    key:    'spammer',
    title:  'The Spammer',
    icon:   Zap,
    gradient: ['#FCA5A5', '#FEE2E2'],
    textColor: '#991B1B',
    iconBg:  '#EF444420',
    border:  '#EF444440',
    tagline: '⚡ Send. Send. SEND.',
  },
  {
    key:    'emoji_overload',
    title:  'Emoji Overload',
    icon:   Smile,
    gradient: ['#6EE7B7', '#D1FAE5'],
    textColor: '#064E3B',
    iconBg:  '#10B98120',
    border:  '#10B98140',
    tagline: '😂🔥💀😭✨🎉',
  },
  {
    key:    'night_owl',
    title:  'Night Owl',
    icon:   Moon,
    gradient: ['#A5B4FC', '#EDE9FE'],
    textColor: '#3730A3',
    iconBg:  '#818CF820',
    border:  '#818CF840',
    tagline: '🦉 3 AM? Prime time.',
  },
  {
    key:    'question_machine',
    title:  'Question Machine',
    icon:   HelpCircle,
    gradient: ['#FCA5A5', '#FDE68A'],
    textColor: '#7C2D12',
    iconBg:  '#F97316 20',
    border:  '#F9731640',
    tagline: '❓ But why? But how?',
  },
  {
    key:    'media_lord',
    title:  'Media Lord',
    icon:   Film,
    gradient: ['#F9A8D4', '#FCE7F3'],
    textColor: '#831843',
    iconBg:  '#EC489920',
    border:  '#EC489940',
    tagline: '📸 Your storage hates them',
  },
  {
    key:    'early_bird',
    title:  'Early Bird',
    icon:   Sun,
    gradient: ['#FDE68A', '#FEF9C3'],
    textColor: '#713F12',
    iconBg:  '#EAB30820',
    border:  '#EAB30840',
    tagline: '🌅 Good morning at 5 AM',
  },
]

// ─── Individual Trading Card ──────────────────────────────────────────────────
function AwardCard({ award, data, index }) {
  const Icon = award.icon
  const cardData = data?.[award.key]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -5 }}
      animate={{ opacity: 1, y: 0,  rotateY: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{
        y: -6,
        rotateY: 2,
        boxShadow: '0 25px 60px -10px rgba(0,0,0,0.15)',
      }}
      className="relative rounded-3xl overflow-hidden border-2 cursor-default"
      style={{
        background: `linear-gradient(145deg, ${award.gradient[0]}, ${award.gradient[1]})`,
        borderColor: award.border,
      }}
    >
      {/* Card inner padding */}
      <div className="p-5">

        {/* Top row: icon + tagline */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: award.iconBg, backdropFilter: 'blur(4px)' }}
          >
            <Icon size={24} style={{ color: award.textColor }} />
          </div>
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: award.textColor + '15', color: award.textColor }}
          >
            {award.tagline}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold mb-0.5" style={{ color: award.textColor }}>
          {award.title}
        </h3>

        {/* Funny subtitle from API */}
        {cardData && (
          <p className="text-xs mb-4 leading-relaxed" style={{ color: award.textColor + 'CC' }}>
            {cardData.funny_subtitle}
          </p>
        )}

        {/* Winner section */}
        {cardData ? (
          <div
            className="rounded-2xl p-3 mt-auto"
            style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
               style={{ color: award.textColor + '99' }}>
              Winner
            </p>
            <p className="font-bold text-base truncate" style={{ color: award.textColor }}>
              {cardData.winner}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-semibold" style={{ color: award.textColor + 'AA' }}>
                {cardData.stat_label}:
              </span>
              <span className="text-xs font-bold" style={{ color: award.textColor }}>
                {typeof cardData.stat_value === 'number'
                  ? cardData.stat_value.toLocaleString()
                  : cardData.stat_value}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
          >
            <p className="text-xs text-center" style={{ color: award.textColor + '80' }}>
              Not enough data
            </p>
          </div>
        )}

      </div>

      {/* Decorative circle in corner */}
      <div
        className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-20"
        style={{ backgroundColor: award.textColor }}
      />

    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HallOfShame({ data }) {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="text-center py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Hall of Shame</h2>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            8 awards nobody asked for, everyone deserves. These are your group's true legends.
          </p>
        </motion.div>
      </div>

      {/* 4×2 Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {AWARDS.map((award, i) => (
          <AwardCard
            key={award.key}
            award={award}
            data={data}
            index={i}
          />
        ))}
      </div>

    </div>
  )
}
