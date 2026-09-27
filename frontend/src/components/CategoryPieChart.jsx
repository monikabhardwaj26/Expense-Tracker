import React from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const CATEGORY_LABELS = {
  food: 'Food', travel: 'Travel', bills: 'Bills', shopping: 'Shopping',
  entertainment: 'Entertainment', healthcare: 'Healthcare', education: 'Education',
  transport: 'Transport', other: 'Other',
}

// One fixed color per category so the same category always renders the
// same slice color across Dashboard/Reports, rather than a random palette.
const CATEGORY_COLORS = {
  food: '#2f6fed', travel: '#22b8cf', bills: '#e5484d', shopping: '#f0b654',
  entertainment: '#8e6fed', healthcare: '#2fa84f', education: '#eb64b9',
  transport: '#6b7686', other: '#b6bdc9',
}

const formatMoney = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function CategoryPieChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="empty-state">No spending recorded this month yet.</p>
  }

  const chartData = data.map((row) => ({
    name: CATEGORY_LABELS[row.category] || row.category,
    category: row.category,
    value: Number(row.total),
  }))

  return (
    <div className="pie-chart-wrapper">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(value)} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: '0.82rem' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
