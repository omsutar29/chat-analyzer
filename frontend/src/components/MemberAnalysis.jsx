/**
 * MemberAnalysis.jsx — Individual Member Deep Dive
 * ─────────────────────────────────────────────────────────────────────────
 * Features:
 *   - Searchable dropdown to select a member
 *   - Profile card with avatar (initials), rank, key stats
 *   - Radar Chart: Member vs Group Average
 *   - Hourly Distribution Bar Chart (00:00–23:00)
 *   - Monthly Activity Line Chart
 *
 * Data is fetched from GET /api/member?name=... on member selection.
 */

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Search, User, Trophy, MessageSquare, FileImage, Link2, Hash } from 'lucide-react'
import axios from 'axios'

// ─── Theme ───────────────────────────────────────────────────────────────────
const PERIWINKLE  = '#818CF8'
const MINT        = '#34D399'
const SOFT_PURPLE = '#A5B4FC'

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl px-3 py-2 shadow-soft border border-periwinkle-300/20 text-sm">
      {label && <p className="font-semibold text-slate-500 text-xs mb-0.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color || PERIWINKLE }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Avatar (initials circle) ─────────────────────────────────────────────────
function Avatar({ name, size = 64 }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() || '')
    .join('')

  // Deterministic color from name
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 60) % 360}, 70%, 60%))`,
      }}
    >
      {initials}
    </div>
  )
}

// ─── Stat Badge ───────────────────────────────────────────────────────────────
function StatBadge({ icon: Icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-slate-50">
      <Icon size={16} style={{ color }} />
      <p className="text-lg font-bold text-slate-800">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-[10px] text-slate-400 text-center leading-tight">{label}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MemberAnalysis({ members }) {
  const [query,     setQuery]     = useState('')
  const [selected,  setSelected]  = useState(null)   // currently selected member name
  const [memberData, setMemberData] = useState(null)  // API response
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // Filter members by search query
  const filtered = useMemo(
    () => members.filter(m => m.toLowerCase().includes(query.toLowerCase())),
    [members, query]
  )

  // Fetch member deep-dive data from API
  const selectMember = async (name) => {
    setSelected(name)
    setQuery(name)
    setShowDropdown(false)
    setLoading(true)
    setError(null)
    setMemberData(null)

    try {
      const res = await axios.get(`/api/member`, { params: { name } })
      setMemberData(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load member data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <User size={20} className="text-periwinkle-500" />
        <h2 className="text-2xl font-bold text-slate-800">Member Deep Dive</h2>
      </div>

      {/* ── Searchable Dropdown ──────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search or select a member..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            className="w-full pl-9 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-periwinkle-400 focus:outline-none text-sm font-medium text-slate-700 bg-white transition-colors"
          />
        </div>

        <AnimatePresence>
          {showDropdown && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-1 w-full bg-white rounded-2xl border border-slate-200 shadow-soft-lg overflow-hidden z-20 max-h-60 overflow-y-auto"
            >
              {filtered.map(name => (
                <button
                  key={name}
                  onClick={() => selectMember(name)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-periwinkle-300/10 transition-colors flex items-center gap-2 ${
                    selected === name ? 'text-periwinkle-600 bg-periwinkle-300/10' : 'text-slate-700'
                  }`}
                >
                  <Avatar name={name} size={24} />
                  {name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
      )}

      {/* ── Loading State ───────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full border-3 border-periwinkle-300 border-t-periwinkle-500"
            style={{ borderWidth: 3 }}
          />
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 rounded-2xl text-red-600 text-sm">{error}</div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────── */}
      {!selected && !loading && (
        <div className="text-center py-20 text-slate-400">
          <User size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Select a member to see their stats</p>
        </div>
      )}

      {/* ── Member Data ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {memberData && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Profile Card */}
            <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <Avatar name={memberData.profile.name} size={72} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-bold text-slate-800 truncate">
                    {memberData.profile.name}
                  </h3>
                  <span className="badge bg-periwinkle-300/20 text-periwinkle-600">
                    <Trophy size={10} /> #{memberData.profile.rank}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Responsible for {memberData.profile.percentage_of_chat}% of the entire chat
                </p>
              </div>

              {/* Stat badges */}
              <div className="grid grid-cols-4 gap-2 sm:w-auto w-full">
                <StatBadge icon={MessageSquare} label="Messages" value={memberData.profile.total_messages} color={PERIWINKLE} />
                <StatBadge icon={Hash}         label="Words"    value={memberData.profile.total_words}    color={MINT} />
                <StatBadge icon={FileImage}    label="Media"    value={memberData.profile.total_media}    color="#F9A8D4" />
                <StatBadge icon={Link2}        label="Links"    value={memberData.profile.total_links}    color="#FCD34D" />
              </div>
            </div>

            {/* Radar + Hourly grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Radar Chart */}
              <div className="card">
                <p className="section-title">vs. Group Average</p>
                <p className="section-subtitle">Radar of key metrics (normalized to group max)</p>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={memberData.radar_data} margin={{ top: 10 }}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                    />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Group Average"
                      dataKey="average"
                      stroke={SOFT_PURPLE}
                      fill={SOFT_PURPLE}
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                    <Radar
                      name={memberData.profile.name}
                      dataKey="user"
                      stroke={PERIWINKLE}
                      fill={PERIWINKLE}
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconSize={10}
                      formatter={(v) => <span style={{ fontSize: '11px', color: '#64748B' }}>{v}</span>}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Hourly Distribution */}
              <div className="card">
                <p className="section-title">Hourly Activity</p>
                <p className="section-subtitle">When are they most active?</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={memberData.hourly_activity}
                    margin={{ top: 5, right: 5, bottom: 20, left: 0 }}
                    barSize={8}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 9, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                      interval={2}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="messages" fill={MINT} radius={[4, 4, 0, 0]} name="Messages" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>

            {/* Monthly Activity Line Chart */}
            <div className="card">
              <p className="section-title">Monthly Activity</p>
              <p className="section-subtitle">{memberData.profile.name}'s chat journey over time</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={memberData.monthly_activity}
                  margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                >
                  <defs>
                    <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={PERIWINKLE} stopOpacity={1} />
                      <stop offset="100%" stopColor={MINT}       stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    name="Messages"
                    stroke={PERIWINKLE}
                    strokeWidth={2.5}
                    dot={{ fill: PERIWINKLE, r: 3 }}
                    activeDot={{ r: 5, fill: PERIWINKLE }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
