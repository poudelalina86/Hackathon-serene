import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Badge,
    Box,
    Button,
    Container,
    Divider,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Flex,
    Heading,
    HStack,
    Icon,
    Input,
    InputGroup,
    InputLeftElement,
    Link as ChakraLink,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    StatLabel,
    StatNumber,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    useColorModeValue,
    useDisclosure,
} from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { FiBarChart2, FiMessageSquare, FiRefreshCw, FiSearch, FiShield, FiUser } from 'react-icons/fi'

const RAW_BASE =
    import.meta.env["VITE_API_URL"] ||
    import.meta.env["VITE_X_7ea54382_7b12_4f3d_9c3a_1e4d5f6a7b8c"] ||
    "http://localhost:8000/api/v1"

const toServerBase = (raw) => {
    const trimmed = String(raw || "").replace(/\/+$/, "")
    if (!trimmed) return "http://localhost:8000"
    if (/\/api\/v1$/i.test(trimmed)) return trimmed.replace(/\/api\/v1$/i, "")
    if (/\/v1$/i.test(trimmed)) return trimmed.replace(/\/v1$/i, "")
    return trimmed
}

const SERVER_BASE = toServerBase(RAW_BASE)
const API_BASE = `${SERVER_BASE}/api/v1`

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const asText = (v) => (v === null || v === undefined ? '' : String(v))

const truncate = (s, n = 120) => {
    const t = asText(s).trim()
    if (!t) return ''
    return t.length > n ? `${t.slice(0, n).trim()}…` : t
}

const extractTextFromMaybeJson = (text) => {
    const raw = asText(text).trim()
    if (!raw) return ''
    try {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') {
            return (
                asText(obj.message).trim() ||
                asText(obj.oracle_message).trim() ||
                asText(obj.oracle_response).trim() ||
                asText(obj.response).trim() ||
                asText(obj.text).trim() ||
                raw
            )
        }
        return raw
    } catch {
        return raw
    }
}

const analyzeChatHistory = (history) => {
    const items = Array.isArray(history) ? history : []
    const normalized = items
        .map((m) => ({
            sender: asText(m?.sender || ''),
            text: extractTextFromMaybeJson(m?.text),
            createdAt: m?.created_at || m?.createdAt || m?.timestamp || null,
        }))
        .filter((m) => m.sender && m.text)

    const userMsgs = normalized.filter((m) => m.sender !== 'oracle').slice(-12)
    const oracleMsgs = normalized.filter((m) => m.sender === 'oracle').slice(-12)
    const lastUser = [...userMsgs].reverse().find(Boolean) || null
    const lastOracle = [...oracleMsgs].reverse().find(Boolean) || null

    const buckets = {
        highRisk: [
            'suicide',
            'kill myself',
            'self-harm',
            'hurt myself',
            'end it all',
        ],
        stress: [
            'stress',
            'stressed',
            'anxious',
            'anxiety',
            'panic',
            'overwhelmed',
            'burnout',
            'depressed',
            'sad',
            'hopeless',
            'lonely',
            "can't sleep",
            'insomnia',
            "can't focus",
        ],
        positive: [
            'better',
            'calm',
            'relieved',
            'happy',
            'grateful',
            'excited',
            'good',
            'progress',
            'proud',
        ],
    }

    const counts = { highRisk: 0, stress: 0, positive: 0 }
    const keywordCounts = new Map()
    const scan = (t) => {
        const text = asText(t).toLowerCase()
        for (const k of buckets.highRisk) {
            if (text.includes(k)) {
                counts.highRisk += 1
                keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1)
            }
        }
        for (const k of buckets.stress) {
            if (text.includes(k)) {
                counts.stress += 1
                keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1)
            }
        }
        for (const k of buckets.positive) {
            if (text.includes(k)) {
                counts.positive += 1
                keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1)
            }
        }
    }

    userMsgs.forEach((m) => scan(m.text))

    let score = 10
    score += Math.min(100, counts.highRisk * 35)
    score += Math.min(60, counts.stress * 8)
    score -= Math.min(30, counts.positive * 6)
    score = Math.max(0, Math.min(100, Math.round(score)))

    const mood =
        counts.positive >= counts.stress + 2 ? 'positive' :
            counts.stress >= counts.positive + 2 ? 'stressed' :
                'neutral'

    const risk =
        counts.highRisk > 0 || score >= 70 ? 'high' :
            score >= 40 ? 'medium' :
                'low'

    const topKeywords = [...keywordCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k)

    const recentUserHighlights = userMsgs
        .slice(-3)
        .map((m) => truncate(m.text, 140))
        .filter(Boolean)

    return {
        score,
        risk,
        mood,
        topKeywords,
        lastUserText: lastUser ? truncate(lastUser.text, 220) : '',
        lastOracleText: lastOracle ? truncate(lastOracle.text, 220) : '',
        recentUserHighlights,
        normalized,
    }
}

function SidebarNavItem({ icon, label, to, isActive = false }) {
    return (
        <ChakraLink as={RouterLink} to={to} _hover={{ textDecoration: 'none' }} w="full">
            <HStack
                px={3}
                py={2.5}
                borderRadius="xl"
                spacing={3}
                bg={isActive ? 'teal.500' : 'transparent'}
                color={isActive ? 'white' : 'inherit'}
                transition="all 120ms ease"
                _hover={{ bg: isActive ? 'teal.500' : 'blackAlpha.50' }}
            >
                <Icon as={icon} opacity={isActive ? 1 : 0.85} />
                <Text fontWeight="800" fontSize="sm">
                    {label}
                </Text>
            </HStack>
        </ChakraLink>
    )
}

export function Admin() {
    const pageBg = useColorModeValue('#F5FBFB', 'gray.900')
    const sidebarBg = useColorModeValue('rgba(255,255,255,0.75)', 'rgba(26,32,44,0.72)')
    const cardBg = useColorModeValue('rgba(255,255,255,0.85)', 'rgba(26,32,44,0.72)')
    const border = useColorModeValue('rgba(226,232,240,0.9)', 'whiteAlpha.200')
    const muted = useColorModeValue('gray.600', 'gray.300')
    const headingColor = useColorModeValue('teal.900', 'whiteAlpha.900')
    const tableHeaderBg = useColorModeValue('rgba(255,255,255,0.92)', 'rgba(26,32,44,0.92)')
    const rowHoverBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
    const barTrackBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.200')
    const highlightBg = useColorModeValue('whiteAlpha.700', 'whiteAlpha.50')
    const chatOracleBg = useColorModeValue('teal.50', 'whiteAlpha.50')
    const chatUserBg = useColorModeValue('white', 'blackAlpha.200')

    const errorBg = useColorModeValue('red.50', 'rgba(254, 178, 178, 0.10)')
    const errorBorder = useColorModeValue('red.200', 'red.400')
    const errorText = useColorModeValue('red.700', 'red.200')

    const drawerBg = useColorModeValue('white', 'gray.900')

    const { isOpen, onOpen, onClose } = useDisclosure()

    const usernames = useMemo(() => {
        const raw = String(import.meta.env.VITE_ADMIN_USERS || '').trim()
        const list = raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        return list.length > 0 ? list : ['incri']
    }, [])

    const abortRef = useRef(null)
    const [isLoading, setIsLoading] = useState(true)
    const [rows, setRows] = useState([])
    const [error, setError] = useState('')
    const [query, setQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all') // all | ok | error
    const [selected, setSelected] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)

    const load = useCallback(async () => {
        setIsLoading(true)
        setError('')

        try {
            abortRef.current?.abort?.()
        } catch {
            // ignore
        }

        const ac = new AbortController()
        abortRef.current = ac

        const fetchJson = async (url) => {
            const res = await fetch(url, { signal: ac.signal })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
            return data
        }

        try {
            const results = await Promise.all(
                usernames.map(async (username) => {
                    const base = { username }
                    try {
                        const [user, processStats, progress, history] = await Promise.all([
                            fetchJson(`${API_BASE}/user/${username}`),
                            fetchJson(`${API_BASE}/stats/process/${username}`),
                            fetchJson(`${API_BASE}/progress/${username}`),
                            fetchJson(`${API_BASE}/history/${username}`),
                        ])
                        return { ...base, user, processStats, progress, history, ok: true }
                    } catch (e) {
                        return { ...base, ok: false, error: e?.message || 'Failed to load' }
                    }
                })
            )
            setRows(results)
            setLastUpdated(new Date())
        } catch (e) {
            if (e?.name === 'AbortError') return
            setError(e?.message || 'Failed to load admin metrics')
        } finally {
            setIsLoading(false)
        }
    }, [usernames])

    useEffect(() => {
        load()
        return () => {
            try {
                abortRef.current?.abort?.()
            } catch {
                // ignore
            }
        }
    }, [load])

    const derivedRows = useMemo(() => {
        return rows.map((r) => {
            const level = safeNum(r?.user?.level)
            const xp = safeNum(r?.user?.xp)
            const streak = safeNum(r?.progress?.streak)
            const activeDays = safeNum(r?.progress?.total_days_active)
            const tasks = safeNum(r?.progress?.total_tasks_completed)
            const days = safeNum(r?.processStats?.days)
            const weeks = safeNum(r?.processStats?.weeks)
            const months = safeNum(r?.processStats?.months)
            const years = safeNum(r?.processStats?.years)
            const processAge = `${years}y ${months}m ${weeks}w ${days}d`
            const analysis = analyzeChatHistory(r?.history)
            return { ...r, level, xp, streak, activeDays, tasks, processAge, analysis }
        })
    }, [rows])

    const filteredRows = useMemo(() => {
        const q = query.trim().toLowerCase()
        return derivedRows.filter((r) => {
            if (statusFilter === 'ok' && !r.ok) return false
            if (statusFilter === 'error' && r.ok) return false
            if (!q) return true
            const hay = [r.username, asText(r?.user?.email), asText(r?.user?.name)].join(' ').toLowerCase()
            return hay.includes(q)
        })
    }, [derivedRows, query, statusFilter])

    const summary = useMemo(() => {
        const total = derivedRows.length
        const ok = derivedRows.filter((r) => r.ok).length
        const err = total - ok
        const avgStreak = ok === 0 ? 0 : Math.round(derivedRows.filter((r) => r.ok).reduce((acc, r) => acc + safeNum(r.streak), 0) / ok)
        const totalTasks = derivedRows.filter((r) => r.ok).reduce((acc, r) => acc + safeNum(r.tasks), 0)
        const needsAttention = derivedRows.filter((r) => r.ok && (r.analysis?.risk === 'high' || r.analysis?.risk === 'medium')).length
        const highRisk = derivedRows.filter((r) => r.ok && r.analysis?.risk === 'high').length
        return { total, ok, err, avgStreak, totalTasks, needsAttention, highRisk }
    }, [derivedRows])

    const openRow = useCallback((row) => {
        setSelected(row || null)
        onOpen()
    }, [onOpen])

    const riskBadgeProps = useCallback((risk) => {
        if (risk === 'high') return { colorScheme: 'red', label: 'High' }
        if (risk === 'medium') return { colorScheme: 'orange', label: 'Medium' }
        return { colorScheme: 'green', label: 'Low' }
    }, [])

    const moodBadgeProps = useCallback((mood) => {
        if (mood === 'stressed') return { colorScheme: 'orange', label: 'Stressed' }
        if (mood === 'positive') return { colorScheme: 'teal', label: 'Positive' }
        return { colorScheme: 'gray', label: 'Neutral' }
    }, [])

    return (
        <Box
            minH="100vh"
            bg={pageBg}
            position="relative"
            sx={{
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background:
                        'radial-gradient(900px 380px at 20% 0%, rgba(56, 178, 172, 0.16), transparent 60%), radial-gradient(900px 380px at 90% 10%, rgba(49, 130, 206, 0.14), transparent 55%)',
                    pointerEvents: 'none',
                },
            }}
        >
            <Flex minH="100vh" position="relative" zIndex={1}>
                {/* Sidebar */}
                <Box
                    w={{ base: '0', lg: '280px' }}
                    display={{ base: 'none', lg: 'block' }}
                    borderRightWidth="1px"
                    borderRightColor={border}
                    bg={sidebarBg}
                    backdropFilter="blur(14px)"
                    px={4}
                    py={6}
                >
                    <VStack align="stretch" spacing={5}>
                        <HStack spacing={3} px={2}>
                            <Box
                                w="36px"
                                h="36px"
                                borderRadius="14px"
                                bg="teal.500"
                                color="white"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                boxShadow="lg"
                            >
                                <Icon as={FiShield} />
                            </Box>
                            <VStack spacing={0} align="start">
                                <Text fontWeight="900" letterSpacing="-0.3px" color={headingColor}>
                                    Admin
                                </Text>
                                <Text fontSize="xs" color={muted} fontWeight="700">
                                    Premium dashboard
                                </Text>
                            </VStack>
                        </HStack>

                        <VStack align="stretch" spacing={1}>
                            <SidebarNavItem icon={FiMessageSquare} label="Chat" to="/" />
                            <SidebarNavItem icon={FiBarChart2} label="Admin" to="/admin" isActive />
                            <SidebarNavItem icon={FiUser} label="Account" to="/account/profile" />
                        </VStack>

                        <Box px={2}>
                            <Divider borderColor={border} />
                        </Box>

                        <Box px={2}>
                            <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.14em" textTransform="uppercase" mb={3}>
                                Overview
                            </Text>
                            <VStack align="stretch" spacing={3}>
                                <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl" p={4} backdropFilter="blur(14px)">
                                    <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase">
                                        Users
                                    </Text>
                                    <Text fontSize="2xl" fontWeight="900" letterSpacing="-0.6px" color={headingColor}>
                                        {summary.total}
                                    </Text>
                                    <HStack spacing={2} mt={2}>
                                        <Badge colorScheme="green" borderRadius="full">OK {summary.ok}</Badge>
                                        <Badge colorScheme="red" borderRadius="full">Err {summary.err}</Badge>
                                    </HStack>
                                </Box>
                                <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl" p={4} backdropFilter="blur(14px)">
                                    <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase">
                                        Avg streak
                                    </Text>
                                    <Text fontSize="2xl" fontWeight="900" letterSpacing="-0.6px" color={headingColor}>
                                        {summary.avgStreak}
                                    </Text>
                                    <Text fontSize="sm" color={muted} fontWeight="700">
                                        Total tasks: {summary.totalTasks}
                                    </Text>
                                </Box>
                            </VStack>
                        </Box>
                    </VStack>
                </Box>

                {/* Main */}
                <Box flex={1} px={{ base: 4, lg: 8 }} py={{ base: 6, lg: 10 }}>
                    <Container maxW="1200px" p={0}>
                        <Stack direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} spacing={4} mb={6}>
                            <VStack align="start" spacing={1}>
                                <Heading size="lg" letterSpacing="-0.6px" color={headingColor}>
                                    Admin Dashboard
                                </Heading>
                                <Text color={muted} fontSize="sm" fontWeight="700">
                                    Metrics per user • {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Not updated yet'}
                                </Text>
                            </VStack>

                            <HStack spacing={3} justify="flex-end">
                                <InputGroup w={{ base: 'full', md: '340px' }}>
                                    <InputLeftElement pointerEvents="none">
                                        <Icon as={FiSearch} color={muted} />
                                    </InputLeftElement>
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search users…"
                                        bg={cardBg}
                                        borderColor={border}
                                        borderRadius="xl"
                                        fontWeight="700"
                                    />
                                </InputGroup>
                                <Button
                                    leftIcon={<FiRefreshCw />}
                                    onClick={load}
                                    isLoading={isLoading}
                                    variant="solid"
                                    colorScheme="teal"
                                    borderRadius="xl"
                                >
                                    Refresh
                                </Button>
                            </HStack>
                        </Stack>

                        {error && (
                            <Box mb={6} p={4} bg={errorBg} borderWidth="1px" borderColor={errorBorder} borderRadius="2xl">
                                <Text fontWeight="900" color={errorText}>Error</Text>
                                <Text color={errorText} fontSize="sm" fontWeight="700">
                                    {error}
                                </Text>
                            </Box>
                        )}

                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
                            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl" p={5} backdropFilter="blur(14px)">
                                <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase">
                                    Total users
                                </Text>
                                <Text fontSize="3xl" fontWeight="900" letterSpacing="-1px" color={headingColor}>
                                    {summary.total}
                                </Text>
                                <HStack spacing={2} mt={2}>
                                    <Badge colorScheme="green" borderRadius="full">OK {summary.ok}</Badge>
                                    <Badge colorScheme="red" borderRadius="full">Err {summary.err}</Badge>
                                </HStack>
                            </Box>
                            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl" p={5} backdropFilter="blur(14px)">
                                <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase">
                                    Avg streak
                                </Text>
                                <Text fontSize="3xl" fontWeight="900" letterSpacing="-1px" color={headingColor}>
                                    {summary.avgStreak}
                                </Text>
                                <Text color={muted} fontWeight="700" fontSize="sm">Across OK users</Text>
                            </Box>
                            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl" p={5} backdropFilter="blur(14px)">
                                <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase">
                                    Needs attention
                                </Text>
                                <Text fontSize="3xl" fontWeight="900" letterSpacing="-1px" color={headingColor}>
                                    {summary.needsAttention}
                                </Text>
                                <HStack spacing={2} mt={2}>
                                    <Badge colorScheme="red" borderRadius="full">High {summary.highRisk}</Badge>
                                    <Badge colorScheme="orange" borderRadius="full">Med {Math.max(0, summary.needsAttention - summary.highRisk)}</Badge>
                                </HStack>
                            </Box>
                        </SimpleGrid>

                        <HStack spacing={2} mb={3} flexWrap="wrap">
                            <Button
                                size="sm"
                                variant={statusFilter === 'all' ? 'solid' : 'outline'}
                                colorScheme="teal"
                                borderRadius="full"
                                onClick={() => setStatusFilter('all')}
                            >
                                All
                            </Button>
                            <Button
                                size="sm"
                                variant={statusFilter === 'ok' ? 'solid' : 'outline'}
                                colorScheme="green"
                                borderRadius="full"
                                onClick={() => setStatusFilter('ok')}
                            >
                                OK
                            </Button>
                            <Button
                                size="sm"
                                variant={statusFilter === 'error' ? 'solid' : 'outline'}
                                colorScheme="red"
                                borderRadius="full"
                                onClick={() => setStatusFilter('error')}
                            >
                                Errors
                            </Button>
                            <Text fontSize="sm" color={muted} fontWeight="800" ml={{ base: 0, md: 2 }}>
                                Showing {filteredRows.length} of {derivedRows.length}
                            </Text>
                        </HStack>

                        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl" overflow="hidden" backdropFilter="blur(14px)">
                            {isLoading && rows.length === 0 ? (
                                <HStack spacing={3} py={16} justify="center">
                                    <Spinner />
                                    <Text color={muted} fontWeight="800">Loading metrics…</Text>
                                </HStack>
                            ) : (
                                <Box overflowX="auto">
                                    <Table size="sm">
                                        <Thead position="sticky" top={0} zIndex={1} bg={tableHeaderBg} backdropFilter="blur(14px)">
                                            <Tr>
                                                <Th>User</Th>
                                                <Th>Status</Th>
                                                <Th>Risk</Th>
                                                <Th>Mood</Th>
                                                <Th isNumeric>Level</Th>
                                                <Th isNumeric>XP</Th>
                                                <Th isNumeric>Streak</Th>
                                                <Th isNumeric>Active</Th>
                                                <Th isNumeric>Tasks</Th>
                                                <Th>Process age</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {filteredRows.map((r) => (
                                                (() => {
                                                    const riskInfo = riskBadgeProps(r?.analysis?.risk)
                                                    const moodInfo = moodBadgeProps(r?.analysis?.mood)
                                                    return (
                                                <Tr
                                                    key={r.username}
                                                    cursor="pointer"
                                                    _hover={{ bg: rowHoverBg }}
                                                    onClick={() => openRow(r)}
                                                >
                                                    <Td>
                                                        <VStack align="start" spacing={0}>
                                                            <Text fontWeight="900" color={headingColor}>{r.username}</Text>
                                                            {r?.user?.email && (
                                                                <Text fontSize="xs" color={muted} fontWeight="700">
                                                                    {asText(r.user.email)}
                                                                </Text>
                                                            )}
                                                            {r?.analysis?.lastUserText && (
                                                                <Text fontSize="xs" color={muted} fontWeight="700">
                                                                    {truncate(r.analysis.lastUserText, 56)}
                                                                </Text>
                                                            )}
                                                        </VStack>
                                                    </Td>
                                                    <Td>
                                                        {r.ok ? (
                                                            <Badge colorScheme="green" borderRadius="full">OK</Badge>
                                                        ) : (
                                                            <Badge colorScheme="red" borderRadius="full">ERROR</Badge>
                                                        )}
                                                    </Td>
                                                    <Td>
                                                        {r.ok ? (
                                                            <Badge colorScheme={riskInfo.colorScheme} borderRadius="full">
                                                                {riskInfo.label}
                                                            </Badge>
                                                        ) : (
                                                            <Text color={muted} fontWeight="800">—</Text>
                                                        )}
                                                    </Td>
                                                    <Td>
                                                        {r.ok ? (
                                                            <Badge colorScheme={moodInfo.colorScheme} borderRadius="full">
                                                                {moodInfo.label}
                                                            </Badge>
                                                        ) : (
                                                            <Text color={muted} fontWeight="800">—</Text>
                                                        )}
                                                    </Td>
                                                    <Td isNumeric fontWeight="800">{r.ok ? r.level : '—'}</Td>
                                                    <Td isNumeric fontWeight="800">{r.ok ? r.xp : '—'}</Td>
                                                    <Td isNumeric fontWeight="800">{r.ok ? r.streak : '—'}</Td>
                                                    <Td isNumeric fontWeight="800">{r.ok ? r.activeDays : '—'}</Td>
                                                    <Td isNumeric fontWeight="800">{r.ok ? r.tasks : '—'}</Td>
                                                    <Td>
                                                        <Text fontWeight="800">{r.ok ? r.processAge : '—'}</Text>
                                                    </Td>
                                                </Tr>
                                                    )
                                                })()
                                            ))}
                                            {filteredRows.length === 0 && (
                                                <Tr>
                                                    <Td colSpan={8}>
                                                        <VStack py={10} spacing={1}>
                                                            <Text fontWeight="900" color={headingColor}>No users match your search.</Text>
                                                            <Text color={muted} fontWeight="700" fontSize="sm">
                                                                Try clearing filters or update `VITE_ADMIN_USERS`.
                                                            </Text>
                                                        </VStack>
                                                    </Td>
                                                </Tr>
                                            )}
                                        </Tbody>
                                    </Table>
                                </Box>
                            )}
                        </Box>
                    </Container>
                </Box>
            </Flex>

            <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
                <DrawerOverlay />
                <DrawerContent bg={drawerBg} maxW={{ base: '100%', md: '520px', lg: '580px' }}>
                    <DrawerCloseButton />
                    <DrawerHeader>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase">
                                User
                            </Text>
                            <HStack spacing={2} align="center">
                                <Heading size="md" letterSpacing="-0.4px">{selected?.username || '—'}</Heading>
                                {selected?.ok && (
                                    (() => {
                                        const riskInfo = riskBadgeProps(selected?.analysis?.risk)
                                        const moodInfo = moodBadgeProps(selected?.analysis?.mood)
                                        return (
                                            <>
                                                <Badge colorScheme={riskInfo.colorScheme} borderRadius="full">{riskInfo.label} risk</Badge>
                                                <Badge colorScheme={moodInfo.colorScheme} borderRadius="full">{moodInfo.label}</Badge>
                                            </>
                                        )
                                    })()
                                )}
                            </HStack>
                        </VStack>
                    </DrawerHeader>
                    <DrawerBody>
                        {!selected ? (
                            <Text color={muted} fontWeight="700">No user selected.</Text>
                        ) : (
                            <VStack align="stretch" spacing={4}>
                                {!selected.ok && (
                                    <Box p={4} bg={errorBg} borderWidth="1px" borderColor={errorBorder} borderRadius="2xl">
                                        <Text fontWeight="900" color={errorText}>Failed to load</Text>
                                        <Text color={errorText} fontSize="sm" fontWeight="700">
                                            {selected.error}
                                        </Text>
                                    </Box>
                                )}

                                {selected.ok && (
                                    <>
                                        <Box p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl">
                                            <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase" mb={2}>
                                                Monitoring signals (heuristic)
                                            </Text>
                                            <VStack align="stretch" spacing={3}>
                                                <HStack justify="space-between">
                                                    <Text color={muted} fontWeight="800" fontSize="sm">Signal level</Text>
                                                    <Text fontWeight="900">{safeNum(selected?.analysis?.score)}/100</Text>
                                                </HStack>
                                                <Box>
                                                    <Box
                                                        h="10px"
                                                        borderRadius="full"
                                                        bg={barTrackBg}
                                                        overflow="hidden"
                                                    >
                                                        <Box
                                                            h="100%"
                                                            w={`${Math.max(0, Math.min(100, safeNum(selected?.analysis?.score)))}%`}
                                                            bg={selected?.analysis?.risk === 'high' ? 'red.400' : (selected?.analysis?.risk === 'medium' ? 'orange.400' : 'green.400')}
                                                        />
                                                    </Box>
                                                </Box>
                                                {Array.isArray(selected?.analysis?.topKeywords) && selected.analysis.topKeywords.length > 0 && (
                                                    <HStack spacing={2} flexWrap="wrap">
                                                        {selected.analysis.topKeywords.map((k) => (
                                                            <Badge key={k} borderRadius="full" colorScheme="purple">
                                                                {k}
                                                            </Badge>
                                                        ))}
                                                    </HStack>
                                                )}
                                                {Array.isArray(selected?.analysis?.recentUserHighlights) && selected.analysis.recentUserHighlights.length > 0 && (
                                                    <Box>
                                                        <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase" mb={2}>
                                                            Recent user highlights
                                                        </Text>
                                                        <VStack align="stretch" spacing={2}>
                                                            {selected.analysis.recentUserHighlights.map((t, idx) => (
                                                                <Box key={idx} p={3} borderRadius="xl" bg={highlightBg} borderWidth="1px" borderColor={border}>
                                                                    <Text fontSize="sm" fontWeight="800" color={headingColor} whiteSpace="pre-wrap">
                                                                        {t}
                                                                    </Text>
                                                                </Box>
                                                            ))}
                                                        </VStack>
                                                    </Box>
                                                )}
                                            </VStack>
                                        </Box>

                                        <SimpleGrid columns={2} spacing={3}>
                                            <Box p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl">
                                                <Stat>
                                                    <StatLabel color={muted}>Level</StatLabel>
                                                    <StatNumber>{selected.level}</StatNumber>
                                                </Stat>
                                            </Box>
                                            <Box p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl">
                                                <Stat>
                                                    <StatLabel color={muted}>XP</StatLabel>
                                                    <StatNumber>{selected.xp}</StatNumber>
                                                </Stat>
                                            </Box>
                                            <Box p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl">
                                                <Stat>
                                                    <StatLabel color={muted}>Streak</StatLabel>
                                                    <StatNumber>{selected.streak}</StatNumber>
                                                </Stat>
                                            </Box>
                                            <Box p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl">
                                                <Stat>
                                                    <StatLabel color={muted}>Tasks</StatLabel>
                                                    <StatNumber>{selected.tasks}</StatNumber>
                                                </Stat>
                                            </Box>
                                        </SimpleGrid>

                                        <Box p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl">
                                            <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase" mb={2}>
                                                Details
                                            </Text>
                                            <VStack align="stretch" spacing={2}>
                                                <HStack justify="space-between">
                                                    <Text color={muted} fontWeight="800" fontSize="sm">Active days</Text>
                                                    <Text fontWeight="900">{selected.activeDays}</Text>
                                                </HStack>
                                                <HStack justify="space-between">
                                                    <Text color={muted} fontWeight="800" fontSize="sm">Process age</Text>
                                                    <Text fontWeight="900">{selected.processAge}</Text>
                                                </HStack>
                                                {selected?.user?.email && (
                                                    <HStack justify="space-between">
                                                        <Text color={muted} fontWeight="800" fontSize="sm">Email</Text>
                                                        <Text fontWeight="900">{asText(selected.user.email)}</Text>
                                                    </HStack>
                                                )}
                                            </VStack>
                                        </Box>

                                        <Box p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl">
                                            <Text fontSize="xs" color={muted} fontWeight="900" letterSpacing="0.12em" textTransform="uppercase" mb={2}>
                                                Recent chat log
                                            </Text>
                                            <Box maxH="320px" overflowY="auto" pr={2}>
                                                <VStack align="stretch" spacing={2}>
                                                    {(selected?.analysis?.normalized || []).slice(-30).map((m, idx) => (
                                                        <Box
                                                            key={`${idx}-${m.sender}`}
                                                            p={3}
                                                            borderRadius="xl"
                                                            borderWidth="1px"
                                                            borderColor={border}
                                                            bg={m.sender === 'oracle' ? chatOracleBg : chatUserBg}
                                                        >
                                                            <HStack justify="space-between" mb={1}>
                                                                <Badge borderRadius="full" colorScheme={m.sender === 'oracle' ? 'teal' : 'gray'}>
                                                                    {m.sender === 'oracle' ? 'Oracle' : 'User'}
                                                                </Badge>
                                                                {m.createdAt && (
                                                                    <Text fontSize="xs" color={muted} fontWeight="700">
                                                                        {truncate(m.createdAt, 28)}
                                                                    </Text>
                                                                )}
                                                            </HStack>
                                                            <Text fontSize="sm" fontWeight="700" color={headingColor} whiteSpace="pre-wrap">
                                                                {m.text}
                                                            </Text>
                                                        </Box>
                                                    ))}
                                                </VStack>
                                            </Box>
                                        </Box>

                                        <Button as={RouterLink} to="/" variant="outline" colorScheme="teal" borderRadius="xl">
                                            Back to chat
                                        </Button>
                                    </>
                                )}
                            </VStack>
                        )}
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </Box>
    )
}
