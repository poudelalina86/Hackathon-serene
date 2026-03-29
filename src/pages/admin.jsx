import React, { useEffect, useState, useMemo } from 'react'
import {
    Avatar, Badge, Box, Button, Circle, Divider, Flex, Grid, GridItem,
    Heading, HStack, IconButton, Input, InputGroup, InputLeftElement,
    Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay,
    SimpleGrid, Spinner, Tag, Text, Tooltip, VStack,
    useColorModeValue, useDisclosure,
} from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import {
    FiArrowLeft, FiArrowUp, FiBarChart2, FiMessageSquare,
    FiRefreshCw, FiSearch, FiTrendingUp, FiUser, FiZap,
} from 'react-icons/fi'

const RAW_BASE =
    import.meta.env["VITE_API_URL"] ||
    "http://localhost:8000/api/v1"

const toServerBase = (raw) => {
    const t = String(raw || "").replace(/\/+$/, "")
    if (/\/api\/v1$/i.test(t)) return t.replace(/\/api\/v1$/i, "")
    if (/\/v1$/i.test(t)) return t.replace(/\/v1$/i, "")
    return t
}

const API_BASE = `${toServerBase(RAW_BASE)}/api/v1`

const ENERGY_LABEL = { very_low: 'Very Low', low: 'Low', neutral: 'Neutral', high: 'High', very_high: 'Very High' }
const ENERGY_COLOR = { very_low: 'red', low: 'orange', neutral: 'gray', high: 'teal', very_high: 'green' }
const PROGRESS_COLOR = { significant: 'green', moderate: 'teal', slight: 'yellow', none: 'gray' }

const fmt = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = 'teal', sub }) {
    const bg = useColorModeValue('white', 'gray.800')
    const border = useColorModeValue(`${color}.100`, 'whiteAlpha.100')
    return (
        <Box p={5} bg={bg} borderRadius="2xl" borderWidth="1px" borderColor={border} boxShadow="sm">
            <HStack spacing={3} mb={2}>
                <Circle size="9" bg={`${color}.50`}>
                    <Box as={icon} color={`${color}.500`} size={16} />
                </Circle>
                <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                    {label}
                </Text>
            </HStack>
            <Text fontSize="3xl" fontWeight="900" color={`${color}.700`} lineHeight="1">{value}</Text>
            {sub && <Text fontSize="xs" color="gray.400" mt={1} fontWeight="600">{sub}</Text>}
        </Box>
    )
}

// ── Energy pill ────────────────────────────────────────────────────────────────
function EnergyTag({ value }) {
    const color = ENERGY_COLOR[value] || 'gray'
    return (
        <Tag size="sm" colorScheme={color} borderRadius="full" fontWeight="800" px={3}>
            {ENERGY_LABEL[value] || value || '—'}
        </Tag>
    )
}

// ── Analysis detail modal ──────────────────────────────────────────────────────
function AnalysisModal({ item, isOpen, onClose }) {
    if (!item) return null
    const improved = (ENERGY_COLOR[item.final_energy] === 'green' || ENERGY_COLOR[item.final_energy] === 'teal') &&
        (ENERGY_COLOR[item.initial_energy] === 'red' || ENERGY_COLOR[item.initial_energy] === 'orange')
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay backdropFilter="blur(8px)" />
            <ModalContent borderRadius="2xl" mx={4}>
                <ModalHeader borderBottomWidth="1px" borderColor="purple.100">
                    <HStack spacing={2}>
                        <FiBarChart2 color="#805AD5" />
                        <Text fontWeight="900" color="purple.700">Session Analysis</Text>
                        <Badge colorScheme={PROGRESS_COLOR[item.progress_made] || 'gray'} borderRadius="full" ml={2}>
                            {item.progress_made || 'unknown'}
                        </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.400" fontWeight="600" mt={1}>
                        {item.username} · {fmt(item.analyzed_at)}
                    </Text>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody py={6}>
                    <VStack align="stretch" spacing={5}>

                        <Box p={4} borderRadius="xl" bg="purple.50" borderWidth="1px" borderColor="purple.100">
                            <Text fontSize="10px" fontWeight="900" color="purple.500" textTransform="uppercase" mb={1}>Core Problem</Text>
                            <Text fontWeight="700" color="purple.900">{item.core_problem || '—'}</Text>
                        </Box>

                        <SimpleGrid columns={2} spacing={3}>
                            <Box p={4} borderRadius="xl" bg="red.50" borderWidth="1px" borderColor="red.100">
                                <Text fontSize="10px" fontWeight="900" color="red.500" textTransform="uppercase" mb={2}>At Start</Text>
                                <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>{item.initial_feelings || '—'}</Text>
                                <EnergyTag value={item.initial_energy} />
                            </Box>
                            <Box p={4} borderRadius="xl" bg="green.50" borderWidth="1px" borderColor="green.100">
                                <HStack justify="space-between" mb={2}>
                                    <Text fontSize="10px" fontWeight="900" color="green.600" textTransform="uppercase">After Session</Text>
                                    {improved && <FiArrowUp color="green" size={14} />}
                                </HStack>
                                <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>{item.final_feelings || '—'}</Text>
                                <EnergyTag value={item.final_energy} />
                            </Box>
                        </SimpleGrid>

                        {item.mindset_shift && (
                            <Box p={4} borderRadius="xl" bg="teal.50" borderWidth="1px" borderColor="teal.100">
                                <Text fontSize="10px" fontWeight="900" color="teal.600" textTransform="uppercase" mb={1}>Mindset Shift</Text>
                                <Text fontSize="sm" fontWeight="700" color="teal.900">{item.mindset_shift}</Text>
                            </Box>
                        )}

                        {item.recommendations?.length > 0 && (
                            <Box>
                                <Text fontSize="10px" fontWeight="900" color="gray.500" textTransform="uppercase" mb={3}>Recommendations</Text>
                                <VStack align="stretch" spacing={2}>
                                    {item.recommendations.map((r, i) => (
                                        <HStack key={i} p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.100" spacing={3}>
                                            <Circle size="6" bg="purple.100" flexShrink={0}>
                                                <Text fontSize="10px" fontWeight="900" color="purple.600">{i + 1}</Text>
                                            </Circle>
                                            <Text fontSize="sm" fontWeight="600" color="gray.700">{r}</Text>
                                        </HStack>
                                    ))}
                                </VStack>
                            </Box>
                        )}
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    )
}

// ── Main Admin Page ────────────────────────────────────────────────────────────
export function Admin() {
    const bg = useColorModeValue('gray.50', 'gray.900')
    const cardBg = useColorModeValue('white', 'gray.800')
    const border = useColorModeValue('gray.100', 'whiteAlpha.100')
    const muted = useColorModeValue('gray.500', 'gray.400')

    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [analyses, setAnalyses] = useState([])
    const [loading, setLoading] = useState(true)
    const [userSearch, setUserSearch] = useState('')
    const [analysisSearch, setAnalysisSearch] = useState('')
    const [selectedAnalysis, setSelectedAnalysis] = useState(null)
    const [activeTab, setActiveTab] = useState('overview')
    const { isOpen, onOpen, onClose } = useDisclosure()

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [s, u, a] = await Promise.all([
                fetch(`${API_BASE}/admin/stats`).then(r => r.json()),
                fetch(`${API_BASE}/admin/users`).then(r => r.json()),
                fetch(`${API_BASE}/admin/analyses`).then(r => r.json()),
            ])
            setStats(s)
            setUsers(Array.isArray(u) ? u : [])
            setAnalyses(Array.isArray(a) ? a : [])
        } catch (e) {
            console.error('Admin fetch failed', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    const openAnalysis = (item) => { setSelectedAnalysis(item); onOpen() }

    const filteredUsers = useMemo(() =>
        users.filter(u =>
            u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email?.toLowerCase().includes(userSearch.toLowerCase())
        ), [users, userSearch])

    const filteredAnalyses = useMemo(() =>
        analyses.filter(a =>
            a.username?.toLowerCase().includes(analysisSearch.toLowerCase()) ||
            a.core_problem?.toLowerCase().includes(analysisSearch.toLowerCase())
        ), [analyses, analysisSearch])

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FiBarChart2 },
        { id: 'users', label: 'Users', icon: FiUser },
        { id: 'analyses', label: 'Session Analyses', icon: FiTrendingUp },
    ]

    return (
        <Box minH="100vh" bg={bg}>
            {/* Header */}
            <Box
                bg={cardBg} borderBottomWidth="1px" borderColor={border}
                px={{ base: 4, lg: 8 }} py={4} position="sticky" top={0} zIndex={10}
                backdropFilter="blur(12px)"
            >
                <HStack justify="space-between" maxW="1400px" mx="auto">
                    <HStack spacing={4}>
                        <RouterLink to="/">
                            <IconButton icon={<FiArrowLeft />} variant="ghost" size="sm" borderRadius="lg" aria-label="Back" />
                        </RouterLink>
                        <HStack spacing={2}>
                            <Circle size="8" bg="purple.100">
                                <FiBarChart2 color="#805AD5" size={16} />
                            </Circle>
                            <Box>
                                <Heading size="sm" fontWeight="900" color="purple.800">Admin Dashboard</Heading>
                                <Text fontSize="10px" color={muted} fontWeight="700">Serene · Mental Health Platform</Text>
                            </Box>
                        </HStack>
                    </HStack>
                    <Tooltip label="Refresh data">
                        <IconButton
                            icon={<FiRefreshCw size={15} />}
                            variant="ghost" size="sm" borderRadius="lg"
                            isLoading={loading}
                            onClick={fetchAll}
                            aria-label="Refresh"
                        />
                    </Tooltip>
                </HStack>
            </Box>

            <Box maxW="1400px" mx="auto" px={{ base: 4, lg: 8 }} py={8}>
                {loading && !stats ? (
                    <Flex justify="center" align="center" h="60vh">
                        <VStack spacing={4}>
                            <Spinner size="xl" color="purple.500" thickness="3px" />
                            <Text color={muted} fontWeight="600">Loading dashboard…</Text>
                        </VStack>
                    </Flex>
                ) : (
                    <VStack align="stretch" spacing={8}>

                        {/* Tab bar */}
                        <HStack spacing={1} bg={cardBg} p={1} borderRadius="xl" borderWidth="1px" borderColor={border} w="fit-content">
                            {tabs.map(t => (
                                <Button
                                    key={t.id}
                                    leftIcon={<t.icon size={14} />}
                                    size="sm"
                                    borderRadius="lg"
                                    fontWeight="700"
                                    variant={activeTab === t.id ? 'solid' : 'ghost'}
                                    colorScheme={activeTab === t.id ? 'purple' : 'gray'}
                                    onClick={() => setActiveTab(t.id)}
                                >
                                    {t.label}
                                </Button>
                            ))}
                        </HStack>

                        {/* ── OVERVIEW ── */}
                        {activeTab === 'overview' && stats && (
                            <VStack align="stretch" spacing={6}>
                                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                                    <StatCard icon={FiUser} label="Total Users" value={stats.total_users} color="purple" />
                                    <StatCard icon={FiMessageSquare} label="Total Messages" value={stats.total_messages} color="teal" />
                                    <StatCard icon={FiBarChart2} label="Sessions Analyzed" value={stats.total_analyses} color="blue" />
                                    <StatCard icon={FiArrowUp} label="Energy Improved" value={stats.improved_energy}
                                        color="green" sub="sessions where energy went up" />
                                </SimpleGrid>

                                {/* Progress breakdown */}
                                <Box bg={cardBg} p={6} borderRadius="2xl" borderWidth="1px" borderColor={border}>
                                    <Text fontSize="xs" fontWeight="900" color={muted} textTransform="uppercase" mb={4}>
                                        Session Progress Breakdown
                                    </Text>
                                    <HStack spacing={3} flexWrap="wrap">
                                        {Object.entries(stats.progress_breakdown || {}).map(([k, v]) => (
                                            <Box key={k} px={4} py={3} borderRadius="xl" bg={`${PROGRESS_COLOR[k] || 'gray'}.50`}
                                                borderWidth="1px" borderColor={`${PROGRESS_COLOR[k] || 'gray'}.100`}>
                                                <Text fontSize="2xl" fontWeight="900" color={`${PROGRESS_COLOR[k] || 'gray'}.700`}>{v}</Text>
                                                <Text fontSize="xs" fontWeight="800" color={`${PROGRESS_COLOR[k] || 'gray'}.500`} textTransform="capitalize">{k}</Text>
                                            </Box>
                                        ))}
                                        {!Object.keys(stats.progress_breakdown || {}).length && (
                                            <Text color={muted} fontSize="sm">No analyses yet</Text>
                                        )}
                                    </HStack>
                                </Box>

                                {/* Recent analyses preview */}
                                <Box bg={cardBg} p={6} borderRadius="2xl" borderWidth="1px" borderColor={border}>
                                    <HStack justify="space-between" mb={4}>
                                        <Text fontSize="xs" fontWeight="900" color={muted} textTransform="uppercase">Recent Sessions</Text>
                                        <Button size="xs" variant="ghost" colorScheme="purple" fontWeight="700"
                                            onClick={() => setActiveTab('analyses')}>View All</Button>
                                    </HStack>
                                    <VStack align="stretch" spacing={2}>
                                        {analyses.slice(0, 5).map(a => (
                                            <HStack key={a.id} p={3} borderRadius="xl" bg="gray.50"
                                                borderWidth="1px" borderColor="gray.100"
                                                cursor="pointer" _hover={{ bg: 'purple.50', borderColor: 'purple.100' }}
                                                onClick={() => openAnalysis(a)} justify="space-between">
                                                <HStack spacing={3}>
                                                    <Avatar size="xs" name={a.username} bg="purple.200" />
                                                    <Box>
                                                        <Text fontSize="sm" fontWeight="800" color="gray.800" noOfLines={1}>
                                                            {a.core_problem || 'No problem identified'}
                                                        </Text>
                                                        <Text fontSize="xs" color={muted}>{a.username} · {fmt(a.analyzed_at)}</Text>
                                                    </Box>
                                                </HStack>
                                                <HStack spacing={2}>
                                                    <EnergyTag value={a.initial_energy} />
                                                    <FiArrowUp size={12} color="gray" />
                                                    <EnergyTag value={a.final_energy} />
                                                </HStack>
                                            </HStack>
                                        ))}
                                        {!analyses.length && (
                                            <Text color={muted} fontSize="sm" textAlign="center" py={4}>
                                                No session analyses yet.
                                            </Text>
                                        )}
                                    </VStack>
                                </Box>
                            </VStack>
                        )}

                        {/* ── USERS ── */}
                        {activeTab === 'users' && (
                            <VStack align="stretch" spacing={4}>
                                <InputGroup maxW="380px">
                                    <InputLeftElement pointerEvents="none">
                                        <FiSearch color="gray" size={14} />
                                    </InputLeftElement>
                                    <Input
                                        placeholder="Search users…"
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                        bg={cardBg} borderRadius="xl" fontWeight="600" fontSize="sm"
                                    />
                                </InputGroup>

                                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                                    {filteredUsers.map(u => (
                                        <Box key={u.username} bg={cardBg} p={5} borderRadius="2xl"
                                            borderWidth="1px" borderColor={border} boxShadow="sm"
                                            _hover={{ borderColor: 'purple.200', boxShadow: 'md' }} transition="all 0.15s">
                                            <HStack spacing={3} mb={4}>
                                                <Avatar size="md" name={u.username} bg="purple.200" color="purple.800" />
                                                <Box flex={1}>
                                                    <Text fontWeight="900" color="gray.800">{u.username}</Text>
                                                    <Text fontSize="xs" color={muted}>{u.email || 'No email'}</Text>
                                                </Box>
                                                <Badge colorScheme="purple" borderRadius="full" fontWeight="800">
                                                    Lv {u.level}
                                                </Badge>
                                            </HStack>
                                            <Divider mb={4} />
                                            <SimpleGrid columns={3} spacing={2}>
                                                <Box textAlign="center">
                                                    <HStack justify="center" spacing={1} mb={1}>
                                                        <FiZap size={12} color="#805AD5" />
                                                        <Text fontSize="lg" fontWeight="900" color="purple.700">{u.xp}</Text>
                                                    </HStack>
                                                    <Text fontSize="9px" fontWeight="800" color={muted} textTransform="uppercase">XP</Text>
                                                </Box>
                                                <Box textAlign="center">
                                                    <HStack justify="center" spacing={1} mb={1}>
                                                        <FiMessageSquare size={12} color="#319795" />
                                                        <Text fontSize="lg" fontWeight="900" color="teal.600">{u.total_messages}</Text>
                                                    </HStack>
                                                    <Text fontSize="9px" fontWeight="800" color={muted} textTransform="uppercase">Messages</Text>
                                                </Box>
                                                <Box textAlign="center">
                                                    <HStack justify="center" spacing={1} mb={1}>
                                                        <FiBarChart2 size={12} color="#3182CE" />
                                                        <Text fontSize="lg" fontWeight="900" color="blue.500">{u.total_analyses}</Text>
                                                    </HStack>
                                                    <Text fontSize="9px" fontWeight="800" color={muted} textTransform="uppercase">Analyses</Text>
                                                </Box>
                                            </SimpleGrid>
                                            <Text fontSize="9px" color={muted} mt={3} textAlign="right">
                                                Joined {fmt(u.created_at)}
                                            </Text>
                                        </Box>
                                    ))}
                                    {!filteredUsers.length && (
                                        <Text color={muted} fontSize="sm" gridColumn="1/-1" textAlign="center" py={8}>
                                            No users found.
                                        </Text>
                                    )}
                                </SimpleGrid>
                            </VStack>
                        )}

                        {/* ── ANALYSES ── */}
                        {activeTab === 'analyses' && (
                            <VStack align="stretch" spacing={4}>
                                <InputGroup maxW="380px">
                                    <InputLeftElement pointerEvents="none">
                                        <FiSearch color="gray" size={14} />
                                    </InputLeftElement>
                                    <Input
                                        placeholder="Search by user or problem…"
                                        value={analysisSearch}
                                        onChange={e => setAnalysisSearch(e.target.value)}
                                        bg={cardBg} borderRadius="xl" fontWeight="600" fontSize="sm"
                                    />
                                </InputGroup>

                                <VStack align="stretch" spacing={3}>
                                    {filteredAnalyses.map(a => (
                                        <Box
                                            key={a.id} bg={cardBg} p={5} borderRadius="2xl"
                                            borderWidth="1px" borderColor={border}
                                            cursor="pointer" transition="all 0.15s"
                                            _hover={{ borderColor: 'purple.200', boxShadow: 'md', transform: 'translateY(-1px)' }}
                                            onClick={() => openAnalysis(a)}
                                        >
                                            <Grid templateColumns={{ base: '1fr', md: '1fr auto' }} gap={4}>
                                                <Box>
                                                    <HStack spacing={2} mb={2} flexWrap="wrap">
                                                        <Avatar size="xs" name={a.username} bg="purple.100" />
                                                        <Text fontSize="sm" fontWeight="800" color="gray.600">{a.username}</Text>
                                                        <Text fontSize="xs" color={muted}>{fmt(a.analyzed_at)}</Text>
                                                        <Badge colorScheme={PROGRESS_COLOR[a.progress_made] || 'gray'}
                                                            borderRadius="full" fontSize="10px">
                                                            {a.progress_made || 'unknown'}
                                                        </Badge>
                                                    </HStack>
                                                    <Text fontWeight="800" color="gray.800" mb={2} noOfLines={2}>
                                                        {a.core_problem || 'No problem identified'}
                                                    </Text>
                                                    {a.mindset_shift && (
                                                        <Text fontSize="sm" color={muted} noOfLines={1}>
                                                            💡 {a.mindset_shift}
                                                        </Text>
                                                    )}
                                                </Box>
                                                <VStack align="flex-end" justify="center" spacing={2} minW="160px">
                                                    <HStack spacing={2}>
                                                        <Box textAlign="center">
                                                            <Text fontSize="9px" fontWeight="800" color={muted} textTransform="uppercase" mb={1}>Start</Text>
                                                            <EnergyTag value={a.initial_energy} />
                                                        </Box>
                                                        <FiArrowUp size={14} color="#805AD5" />
                                                        <Box textAlign="center">
                                                            <Text fontSize="9px" fontWeight="800" color={muted} textTransform="uppercase" mb={1}>End</Text>
                                                            <EnergyTag value={a.final_energy} />
                                                        </Box>
                                                    </HStack>
                                                    {a.recommendations?.length > 0 && (
                                                        <Text fontSize="10px" color="purple.500" fontWeight="700">
                                                            {a.recommendations.length} recommendation{a.recommendations.length > 1 ? 's' : ''}
                                                        </Text>
                                                    )}
                                                </VStack>
                                            </Grid>
                                        </Box>
                                    ))}
                                    {!filteredAnalyses.length && (
                                        <Box textAlign="center" py={12}>
                                            <FiBarChart2 size={32} color="gray" style={{ margin: '0 auto 12px' }} />
                                            <Text color={muted} fontWeight="600">No session analyses found.</Text>
                                            <Text fontSize="sm" color={muted}>End a conversation to generate an analysis.</Text>
                                        </Box>
                                    )}
                                </VStack>
                            </VStack>
                        )}

                    </VStack>
                )}
            </Box>

            <AnalysisModal item={selectedAnalysis} isOpen={isOpen} onClose={onClose} />
        </Box>
    )
}
