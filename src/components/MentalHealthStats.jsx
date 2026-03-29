import React, { useEffect, useState } from 'react'
import {
    Box, Circle, Divider, HStack, SimpleGrid, Spinner,
    Tag, Text, VStack, useColorModeValue,
} from '@chakra-ui/react'
import {
    Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
    LineChart, Line,
} from 'recharts'

const ENERGY_LABEL = { very_low: 'Very Low', low: 'Low', neutral: 'Neutral', high: 'High', very_high: 'Very High' }
const ENERGY_COLOR_MAP = { very_low: '#FC8181', low: '#F6AD55', neutral: '#A0AEC0', high: '#68D391', very_high: '#48BB78' }
const PROGRESS_COLORS = { significant: '#48BB78', moderate: '#4FD1C5', slight: '#F6E05E', none: '#CBD5E0', unknown: '#CBD5E0' }

const fmt = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const EnergyDot = ({ value }) => {
    const color = ENERGY_COLOR_MAP[value] || '#A0AEC0'
    return (
        <Tag size="sm" borderRadius="full" fontWeight="800" px={3}
            bg={color + '33'} color={color} border={`1px solid ${color}66`}>
            {ENERGY_LABEL[value] || value || '—'}
        </Tag>
    )
}

const SectionLabel = ({ children }) => (
    <Text fontSize="10px" fontWeight="900" textTransform="uppercase" letterSpacing="wider"
        color="gray.400" mb={3}>{children}</Text>
)

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <Box bg="white" p={3} borderRadius="lg" boxShadow="lg" borderWidth="1px" borderColor="gray.100">
            <Text fontSize="xs" fontWeight="800" color="gray.500" mb={1}>{label}</Text>
            {payload.map((p, i) => (
                <HStack key={i} spacing={2}>
                    <Circle size="2" bg={p.color} />
                    <Text fontSize="xs" fontWeight="700" color="gray.700">{p.name}: <b>{p.value}</b></Text>
                </HStack>
            ))}
        </Box>
    )
}

export function MentalHealthStats({ apiBase, username }) {
    const cardBg = useColorModeValue('white', 'gray.800')
    const border = useColorModeValue('gray.100', 'whiteAlpha.100')
    const muted = useColorModeValue('gray.400', 'gray.500')

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${apiBase}/stats/mental/${username}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [apiBase, username])

    if (loading) return (
        <Box py={10} textAlign="center">
            <Spinner color="teal.400" size="md" />
            <Text fontSize="sm" color={muted} mt={3} fontWeight="600">Loading your mental health insights…</Text>
        </Box>
    )

    if (!data || !data.sessions?.length) return (
        <Box py={10} textAlign="center">
            <Text fontSize="2xl" mb={2}>🧘</Text>
            <Text fontWeight="700" color={muted}>No session insights yet.</Text>
            <Text fontSize="sm" color={muted}>End a conversation to see your mental health trends here.</Text>
        </Box>
    )

    const { sessions, summary } = data

    // chart data: energy journey over sessions
    const energyChartData = sessions.map((s, i) => ({
        session: fmt(s.analyzed_at) || `#${i + 1}`,
        'Start Energy': s.initial_energy_val,
        'End Energy': s.final_energy_val,
    }))

    // pie data: progress breakdown
    const pieData = Object.entries(summary.progress_breakdown || {}).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        value: v,
        color: PROGRESS_COLORS[k] || '#CBD5E0',
    }))

    const energyTick = (v) => ['', 'Very Low', 'Low', 'Neutral', 'High', 'Very High'][v] || ''
    const liftPositive = summary.energy_lift > 0

    return (
        <VStack align="stretch" spacing={6}>

            {/* ── Summary row ── */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                {[
                    { label: 'Sessions', value: summary.total_sessions, color: 'purple', emoji: '💬' },
                    { label: 'Improved', value: summary.sessions_improved, color: 'green', emoji: '📈' },
                    {
                        label: 'Avg Start', color: 'orange', emoji: '🌅',
                        value: ENERGY_LABEL[['', 'very_low', 'low', 'neutral', 'high', 'very_high'][Math.round(summary.avg_start_energy)]] || '—'
                    },
                    {
                        label: 'Avg End', color: liftPositive ? 'teal' : 'gray', emoji: liftPositive ? '✨' : '😶',
                        value: ENERGY_LABEL[['', 'very_low', 'low', 'neutral', 'high', 'very_high'][Math.round(summary.avg_end_energy)]] || '—'
                    },
                ].map(({ label, value, color, emoji }) => (
                    <Box key={label} bg={cardBg} p={4} borderRadius="2xl" borderWidth="1px"
                        borderColor={`${color}.100`} textAlign="center">
                        <Text fontSize="xl" mb={1}>{emoji}</Text>
                        <Text fontSize="lg" fontWeight="900" color={`${color}.600`} lineHeight="1">{value}</Text>
                        <Text fontSize="9px" fontWeight="800" color={muted} textTransform="uppercase" mt={1}>{label}</Text>
                    </Box>
                ))}
            </SimpleGrid>

            {/* ── Energy journey chart ── */}
            {energyChartData.length > 1 && (
                <Box bg={cardBg} p={5} borderRadius="2xl" borderWidth="1px" borderColor={border}>
                    <SectionLabel>Your Energy Journey</SectionLabel>
                    <Text fontSize="xs" color={muted} mb={4} fontWeight="600">
                        How your energy shifted from the start to the end of each session
                    </Text>
                    <Box h="200px">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={energyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="gStart" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F6AD55" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#F6AD55" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gEnd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#48BB78" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#48BB78" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" />
                                <XAxis dataKey="session" tick={{ fontSize: 10, fill: '#A0AEC0' }} />
                                <YAxis tickFormatter={energyTick} tick={{ fontSize: 9, fill: '#A0AEC0' }} domain={[1, 5]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                <Area type="monotone" dataKey="Start Energy" stroke="#F6AD55" fill="url(#gStart)" strokeWidth={2} dot={{ r: 4, fill: '#F6AD55' }} />
                                <Area type="monotone" dataKey="End Energy" stroke="#48BB78" fill="url(#gEnd)" strokeWidth={2} dot={{ r: 4, fill: '#48BB78' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </Box>
            )}

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {/* ── Progress pie ── */}
                {pieData.length > 0 && (
                    <Box bg={cardBg} p={5} borderRadius="2xl" borderWidth="1px" borderColor={border}>
                        <SectionLabel>Session Progress</SectionLabel>
                        <Box h="200px">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                                        paddingAngle={3} dataKey="value">
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [v, n]} />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Box>
                )}

                {/* ── Top feelings ── */}
                {summary.top_feelings?.length > 0 && (
                    <Box bg={cardBg} p={5} borderRadius="2xl" borderWidth="1px" borderColor={border}>
                        <SectionLabel>What You've Been Feeling</SectionLabel>
                        <VStack align="stretch" spacing={2} mt={1}>
                            {summary.top_feelings.map(({ feeling, count }, i) => {
                                const pct = Math.round((count / summary.total_sessions) * 100)
                                const colors = ['purple', 'teal', 'blue', 'orange', 'pink', 'red', 'green', 'cyan']
                                const c = colors[i % colors.length]
                                return (
                                    <Box key={feeling}>
                                        <HStack justify="space-between" mb={1}>
                                            <Text fontSize="xs" fontWeight="800" color="gray.600" textTransform="capitalize">{feeling}</Text>
                                            <Text fontSize="9px" fontWeight="700" color={muted}>{count}x</Text>
                                        </HStack>
                                        <Box bg="gray.100" borderRadius="full" h="6px">
                                            <Box bg={`${c}.400`} borderRadius="full" h="6px" w={`${Math.min(pct, 100)}%`}
                                                transition="width 0.6s ease" />
                                        </Box>
                                    </Box>
                                )
                            })}
                        </VStack>
                    </Box>
                )}
            </SimpleGrid>

            {/* ── Recent sessions timeline ── */}
            <Box bg={cardBg} p={5} borderRadius="2xl" borderWidth="1px" borderColor={border}>
                <SectionLabel>Recent Sessions</SectionLabel>
                <VStack align="stretch" spacing={2}>
                    {[...sessions].reverse().slice(0, 5).map((s, i) => (
                        <Box key={s.session_id || i} p={4} borderRadius="xl" bg="gray.50"
                            borderWidth="1px" borderColor="gray.100">
                            <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                                <Text fontSize="xs" color={muted} fontWeight="700">{fmt(s.analyzed_at)}</Text>
                                <HStack spacing={2}>
                                    <EnergyDot value={s.initial_energy} />
                                    <Text fontSize="xs" color={muted}>→</Text>
                                    <EnergyDot value={s.final_energy} />
                                </HStack>
                            </HStack>
                            {s.core_problem && (
                                <Text fontSize="sm" fontWeight="700" color="gray.700" noOfLines={2} mb={s.mindset_shift ? 1 : 0}>
                                    {s.core_problem}
                                </Text>
                            )}
                            {s.mindset_shift && (
                                <Text fontSize="xs" color="teal.600" fontWeight="600" noOfLines={1}>
                                    💡 {s.mindset_shift}
                                </Text>
                            )}
                        </Box>
                    ))}
                </VStack>
            </Box>

        </VStack>
    )
}
