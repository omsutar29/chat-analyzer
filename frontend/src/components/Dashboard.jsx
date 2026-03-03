/**
 * Dashboard.jsx — Main Analytics Grid
 * ─────────────────────────────────────────────────────────────────────────
 * Layout: Bento-box style responsive grid
 *
 * Row 1: Vitals (animated counters)
 * Row 2: Heatmap + Day-of-Week Bar + Monthly Area Chart
 * Row 3: Donut Chart + Top Emojis + Leaderboard + Word Cloud
 *
 * All charts use Recharts with custom themed tooltips.
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  MessageSquare, Users, Image, Link2, Calendar, TrendingUp, Hash
} from 'lucide-react'

// ─── Theme Constants ─────────────────────────────────────────────────────────
const PERIWINKLE = '#818CF8'
const MINT       = '#34D399'
const SOFT_PURPLE = '#A5B4FC'
const DONUT_COLORS = ['#818CF8', '#34D399', '#F9A8D4']

// ─── Reusable Card wrapper ────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 20px 60px -15px rgba(165,180,252,0.35)' }}
      transition={{ duration: 0.2 }}
      className={`card ${className}`}
    >
      {children}
    </motion.div>
  )
}

// ─── Animated Counter Vital ───────────────────────────────────────────────────
function Vital({ icon: Icon, label, value, color, delay = 0 }) {
  const [display, setDisplay] = useState(0)

  // Animate number from 0 → value over 1.2s
  useEffect(() => {
    let start = 0
    const target = typeof value === 'number' ? value : 0
    const duration = 1200
    const step = 16
    const increment = target / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) { setDisplay(target); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, step)
    return () => clearInterval(timer)
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="card flex items-start gap-4"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '18' }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 count-up">
          {typeof value === 'number'
            ? display.toLocaleString()
            : value}
        </p>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
      </div>
    </motion.div>
  )
}

// ─── Custom Tooltip (used across all charts) ─────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl px-3 py-2.5 shadow-soft border border-periwinkle-300/20 text-sm">
      {label && <p className="font-semibold text-slate-600 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color || PERIWINKLE }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────
function ActivityHeatmap({ data }) {
  const days  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Build lookup: day+hour → count
  const lookup = {}
  data.forEach(d => { lookup[`${d.day}-${d.hour}`] = d.count })
  const max = Math.max(...data.map(d => d.count), 1)

  const getOpacity = (count) => count ? 0.12 + (count / max) * 0.88 : 0

  return (
    <div>
      <p className="section-title">Activity Heatmap</p>
      <p className="section-subtitle">When does the group come alive?</p>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Hour labels */}
          <div className="flex mb-1 ml-10">
            {hours.filter(h => h % 3 === 0).map(h => (
              <div key={h} className="text-[10px] text-slate-400 font-medium"
                   style={{ width: `${100/8}%` }}>
                {`${h}:00`}
              </div>
            ))}
          </div>
          {days.map(day => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <span className="text-[11px] text-slate-500 w-8 text-right shrink-0">{day}</span>
              <div className="flex gap-0.5 flex-1">
                {hours.map(h => {
                  const count = lookup[`${day}-${h}`] || 0
                  const opacity = getOpacity(count)
                  return (
                    <div
                      key={h}
                      className="flex-1 h-5 rounded-sm transition-all"
                      style={{ backgroundColor: MINT, opacity: count ? Math.max(opacity, 0.07) : 0.04 }}
                      title={`${day} ${h}:00 — ${count} messages`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-slate-400">Less</span>
        {[0.07, 0.25, 0.5, 0.75, 1].map(o => (
          <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: MINT, opacity: o }} />
        ))}
        <span className="text-[10px] text-slate-400">More</span>
      </div>
    </div>
  )
}

// ─── Word Cloud ───────────────────────────────────────────────────────────────
function WordCloud({ data }) {
  if (!data?.length) return <p className="text-slate-400 text-sm">No word data.</p>

  const palette = [PERIWINKLE, MINT, '#F9A8D4', '#FCD34D', '#6EE7B7', '#C7D2FE']
  const sorted  = [...data].sort((a, b) => b.value - a.value)

  return (
    <div>
      <p className="section-title">Word Cloud</p>
      <p className="section-subtitle">What do you actually talk about?</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {sorted.slice(0, 40).map((word, i) => {
          const size = 12 + (word.value / 100) * 20
          return (
            <motion.span
              key={word.text}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className="px-2.5 py-1 rounded-full font-semibold cursor-default select-none"
              style={{
                fontSize: `${size}px`,
                color: palette[i % palette.length],
                backgroundColor: palette[i % palette.length] + '15',
              }}
            >
              {word.text}
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Top Emojis Podium ────────────────────────────────────────────────────────
function TopEmojis({ data }) {
  if (!data?.length) return <p className="text-slate-400 text-sm">No emoji data.</p>

  const tiers = [
    { bg: '#FCD34D22', border: '#FCD34D', size: '3xl', label: '🥇 #1' },
    { bg: '#94A3B822', border: '#94A3B8', size: '2xl', label: '🥈 #2' },
    { bg: '#CD7C2F22', border: '#CD7C2F', size: '2xl', label: '🥉 #3' },
    { bg: '#A5B4FC22', border: '#A5B4FC', size: 'xl',  label: '#4' },
    { bg: '#6EE7B722', border: '#6EE7B7', size: 'xl',  label: '#5' },
    { bg: '#F9A8D422', border: '#F9A8D4', size: 'xl',  label: '#6' },
  ]

  return (
    <div>
      <p className="section-title">Top Emojis</p>
      <p className="section-subtitle">Your group's emotional vocabulary</p>
      <div className="grid grid-cols-3 gap-3 mt-3">
        {data.slice(0, 6).map((item, i) => {
          const tier = tiers[i]
          return (
            <motion.div
              key={item.emoji}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border-2"
              style={{ backgroundColor: tier.bg, borderColor: tier.border }}
            >
              <span style={{ fontSize: tier.size === '3xl' ? '2rem' : tier.size === '2xl' ? '1.6rem' : '1.3rem' }}>
                {item.emoji}
              </span>
              <p className="text-xs font-bold text-slate-600 mt-1">{item.count.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">{tier.label}</p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function Dashboard({ data }) {
  const {
    global_stats: gs,
    heatmap,
    day_of_week,
    monthly_timeline,
    message_breakdown,
    top_emojis,
    leaderboard,
    word_cloud,
  } = data

  // Format active timeline
  const timeline = gs.first_date && gs.last_date
    ? `${gs.first_date} → ${gs.last_date}`
    : 'N/A'

  return (
    <div className="space-y-6">

      {/* ── Section Label ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-periwinkle-500" />
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <span className="badge bg-periwinkle-300/20 text-periwinkle-600 text-xs ml-1">
          {gs.total_participants} members
        </span>
      </div>

      {/* ── Row 1: Vitals ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Vital icon={MessageSquare} label="Total Messages"  value={gs.total_messages}     color={PERIWINKLE} delay={0}    />
        <Vital icon={Users}         label="Participants"    value={gs.total_participants}  color={MINT}       delay={0.08} />
        <Vital icon={Image}         label="Media Shared"    value={gs.media_count}         color="#F9A8D4"    delay={0.16} />
        <Vital icon={Link2}         label="Links Shared"    value={gs.links_shared}        color="#FCD34D"    delay={0.24} />
        <Vital icon={Calendar}      label="Active Since"    value={gs.first_date?.slice(0,7) || '—'} color="#6EE7B7" delay={0.32} />
      </div>

      {/* ── Row 2: Temporal ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Heatmap - takes 2 cols */}
        <Card className="lg:col-span-2">
          <ActivityHeatmap data={heatmap} />
        </Card>

        {/* Day of Week Bar */}
        <Card>
          <p className="section-title">Day of Week</p>
          <p className="section-subtitle">Which day is most chaotic?</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={day_of_week} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="messages" fill={PERIWINKLE} radius={[6, 6, 0, 0]} name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

      </div>

      {/* Monthly Area Chart - full width */}
      <Card>
        <p className="section-title">Monthly Timeline</p>
        <p className="section-subtitle">The rise, fall, and resurrection of your group chat</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthly_timeline} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={PERIWINKLE} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PERIWINKLE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="messages" name="Messages"
              stroke={PERIWINKLE} strokeWidth={2.5}
              fill="url(#areaGradient)"
              dot={{ fill: PERIWINKLE, r: 3 }}
              activeDot={{ r: 5, fill: PERIWINKLE }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Row 3: Content ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Donut Chart */}
        <Card>
          <p className="section-title">Message Types</p>
          <p className="section-subtitle">Text vs Media vs Emoji</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={message_breakdown}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                paddingAngle={3}
              >
                {message_breakdown.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ fontSize: '11px', color: '#64748B' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Emojis */}
        <Card>
          <TopEmojis data={top_emojis} />
        </Card>

        {/* Leaderboard */}
        <Card className="lg:col-span-2">
          <p className="section-title">Message Leaderboard</p>
          <p className="section-subtitle">Who carries the conversation?</p>
          <div className="space-y-2 mt-3">
            {leaderboard.slice(0, 7).map((user, i) => (
              <div key={user.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-right shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-slate-700 w-28 truncate shrink-0">
                  {user.name}
                </span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${user.percentage}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    className="h-full rounded-full flex items-center justify-end pr-2"
                    style={{
                      background: i === 0
                        ? `linear-gradient(90deg, ${PERIWINKLE}, ${MINT})`
                        : i < 3 ? PERIWINKLE : SOFT_PURPLE
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">{user.percentage}%</span>
                  </motion.div>
                </div>
                <span className="text-xs text-slate-400 shrink-0 w-16 text-right">
                  {user.messages.toLocaleString()} msg
                </span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* Word Cloud - full width */}
      <Card>
        <WordCloud data={word_cloud} />
      </Card>

    </div>
  )
}
