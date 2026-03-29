import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    Avatar,
    Badge,
    Box,
    Button,
    Circle,
    Divider,
    Heading,
    HStack,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Progress,
    SimpleGrid,
    Spinner,
    Tag,
    Text,
    VStack,
    useColorModeValue,
} from '@chakra-ui/react'
import { FiBarChart2, FiClock, FiMessageSquare, FiSend, FiZap, FiUser, FiSave } from 'react-icons/fi'
import { VoiceRecorderButton } from '../components/VoiceRecorderButton'
import { VoiceMessageBubble } from '../components/VoiceMessageBubble'
import { OracleStructuredReply } from '../components/OracleStructuredReply'
import { Home } from './home'

const RAW_BASE =
    import.meta.env["VITE_API_URL"] ||
    import.meta.env["VITE_X_7ea54382_7b12_4f3d_9c3a_1e4d5f6a7b8c"] ||
    "http://localhost:8010/v1"

const toServerBase = (raw) => {
    const trimmed = String(raw || "").replace(/\/+$/, "")
    if (!trimmed) return "http://localhost:8010"
    if (/\/api\/v1$/i.test(trimmed)) return trimmed.replace(/\/api\/v1$/i, "")
    if (/\/v1$/i.test(trimmed)) return trimmed.replace(/\/v1$/i, "")
    return trimmed
}

const SERVER_BASE = toServerBase(RAW_BASE)
const API_BASE = `${SERVER_BASE}/api/v1`
const CHAT_SERVER_BASE = toServerBase(import.meta.env["VITE_CHAT_SERVER_URL"] || SERVER_BASE)
const CHAT_COMPLETIONS_URL = import.meta.env.DEV
    ? '/v1/chat/completions'
    : `${CHAT_SERVER_BASE}/v1/chat/completions`
const SESSION_NEW_URL = import.meta.env.DEV
    ? '/v1/session/new'
    : `${CHAT_SERVER_BASE}/v1/session/new`
const SESSION_END_URL = import.meta.env.DEV
    ? '/v1/session/end'
    : `${CHAT_SERVER_BASE}/v1/session/end`
const USERNAME = "incri"

const formatSeconds = (s) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
}

const getBlobDurationSeconds = (blob) =>
    new Promise((resolve) => {
        try {
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            const done = (val) => {
                try { URL.revokeObjectURL(url) } catch { /* ignore */ }
                resolve(val)
            }
            audio.addEventListener('loadedmetadata', () => {
                const d = Number.isFinite(audio.duration) ? audio.duration : 0
                done(d)
            })
            audio.addEventListener('error', () => done(0))
        } catch {
            resolve(0)
        }
    })

const tryParseJsonReply = (text) => {
    const raw = String(text || '').trim()
    if (!raw) return null

    // Strip ```json fences if present
    const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
    const candidate = (fenced ? fenced[1] : raw).trim()
    if (!candidate.startsWith('{') || !candidate.endsWith('}')) return null
    try {
        const parsed = JSON.parse(candidate)
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

export function Chat() {
    const bg = useColorModeValue('gray.50', 'gray.900')
    const cardBg = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('teal.100', 'whiteAlpha.200')
    const muted = useColorModeValue('gray.600', 'gray.300')
    const glassBg = useColorModeValue('rgba(255,255,255,0.72)', 'rgba(26,32,44,0.64)')
    const glassBorder = useColorModeValue('rgba(226,232,240,0.75)', 'rgba(255,255,255,0.14)')
    const glassTealBorder = useColorModeValue('rgba(178,245,234,0.75)', 'rgba(255,255,255,0.14)')
    const glassText = useColorModeValue('teal.900', 'whiteAlpha.900')
    const glassVoiceText = useColorModeValue('gray.800', 'whiteAlpha.900')

    const [level, setLevel] = useState(1)
    const [xp, setXp] = useState(0)
    const [processStats, setProcessStats] = useState({ days: 0, weeks: 0, months: 0, years: 0 })
    const [progress, setProgress] = useState({ streak: 0, total_days_active: 0, total_tasks_completed: 0, history: [] })
    const [sidebarView, setSidebarView] = useState('chat')
    const [activePanel, setActivePanel] = useState(null) // 'focus' | 'log' | 'stats' | 'profile' | null

    const [conversationId, setConversationId] = useState(null)
    const conversationIdRef = useRef(null)
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState("")
    const [isThinking, setIsThinking] = useState(false)

    const [showAnalysis, setShowAnalysis] = useState(false)
    const [analysis, setAnalysis] = useState(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    const voiceRecorderRef = useRef(null)

    const chatEndRef = useRef(null)

    const sidebarWidth = 320

    const bgImageUrl = useMemo(() => 'url("/image copy.png")', [])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isThinking])

    const startNewSession = async (endCurrentId = null) => {
        if (endCurrentId) {
            fetch(SESSION_END_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: endCurrentId }),
            }).catch(() => {})
        }
        try {
            const res = await fetch(SESSION_NEW_URL, { method: 'POST' })
            const data = await res.json()
            conversationIdRef.current = data.conversation_id
            setConversationId(data.conversation_id)
            setMessages([])
        } catch (e) {
            console.warn('Failed to start new session:', e)
        }
    }

    const endAndAnalyze = async () => {
        const sid = conversationIdRef.current
        if (!sid) return
        setIsAnalyzing(true)
        setShowAnalysis(true)
        setAnalysis(null)
        try {
            await fetch(SESSION_END_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: sid }),
            })
            await fetch(`${API_BASE}/sessions/${USERNAME}/${sid}/analyze`, { method: 'POST' })
            setAnalysis({ saved: true })
        } catch (e) {
            setAnalysis({ saved: true }) // still show success — data may have saved partially
        } finally {
            setIsAnalyzing(false)
        }
    }

    useEffect(() => {
        const hydrate = async () => {
            try {
                const [userRes, statsRes, progressRes] = await Promise.all([
                    fetch(`${API_BASE}/user/${USERNAME}`),
                    fetch(`${API_BASE}/stats/process/${USERNAME}`),
                    fetch(`${API_BASE}/progress/${USERNAME}`),
                ])
                const userData = await userRes.json()
                setLevel(userData.level ?? 1)
                setXp(userData.xp ?? 0)
                setProcessStats(await statsRes.json())
                setProgress(await progressRes.json())
            } catch (e) {
                console.warn('Hydration failed:', e)
            }
        }
        hydrate()
        startNewSession()
    }, [])

    const sendMessageText = async (text) => {
        const userMsg = (text || '').trim()
        if (!userMsg) return

        const oracleMsgId = `${Date.now()}-oracle-${Math.random().toString(16).slice(2)}`
        setMessages(prev => [...prev, { kind: 'text', text: userMsg, sender: 'user' }])
        setIsThinking(true)
        try {
            const res = await fetch(CHAT_COMPLETIONS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: userMsg }],
                    conversation_id: conversationIdRef.current,
                    stream: false,
                })
            })
            const contentType = (res.headers.get('content-type') || '').toLowerCase()
            if (!res.ok) {
                let detail = ''
                if (contentType.includes('application/json')) {
                    const errJson = await res.json().catch(() => null)
                    detail = errJson?.detail || errJson?.error?.message || ''
                } else {
                    detail = await res.text().catch(() => '')
                }
                throw new Error(detail || `HTTP ${res.status}`)
            }

            const extractOracleTextFromJson = (json) => {
                if (!json) return ''
                return (
                    json?.choices?.[0]?.message?.content ||
                    json?.choices?.[0]?.delta?.content ||
                    json?.choices?.[0]?.text ||
                    json?.message ||
                    json?.oracle_response ||
                    json?.response ||
                    json?.content ||
                    ''
                )
            }

            // Some backends return SSE even when stream=false; handle both.
            if (contentType.includes('text/event-stream')) {
                let acc = ''
                setMessages(prev => [...prev, { id: oracleMsgId, kind: 'text', text: '', sender: 'oracle' }])

                const reader = res.body?.getReader?.()
                if (!reader) throw new Error('Streaming response has no reader')

                const decoder = new TextDecoder('utf-8')
                let buffer = ''
                while (true) {
                    const { value, done } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const parts = buffer.split('\n\n')
                    buffer = parts.pop() || ''

                    for (const part of parts) {
                        const lines = part.split('\n').map(l => l.trim()).filter(Boolean)
                        for (const line of lines) {
                            if (!line.startsWith('data:')) continue
                            const payload = line.slice(5).trim()
                            if (!payload || payload === '[DONE]') continue
                            try {
                                const evt = JSON.parse(payload)
                                const delta =
                                    evt?.choices?.[0]?.delta?.content ||
                                    evt?.choices?.[0]?.message?.content ||
                                    evt?.content ||
                                    ''
                                if (delta) {
                                    acc += delta
                                    setMessages(prev => prev.map(m => (m.id === oracleMsgId ? { ...m, text: acc } : m)))
                                }
                            } catch {
                                // ignore malformed chunks
                            }
                        }
                    }
                }

                if (!acc.trim()) {
                    setMessages(prev => prev.map(m => (m.id === oracleMsgId ? { ...m, text: '(No response)' } : m)))
                }
            } else if (contentType.includes('application/json')) {
                const response = await res.json().catch(() => ({}))
                const oracleText = extractOracleTextFromJson(response)
                setMessages(prev => [...prev, { id: oracleMsgId, kind: 'text', text: oracleText || '(No response)', sender: 'oracle' }])
            } else {
                const raw = await res.text().catch(() => '')
                let oracleText = raw
                try {
                    const maybeJson = JSON.parse(raw)
                    oracleText = extractOracleTextFromJson(maybeJson) || raw
                } catch {
                    // keep raw
                }
                setMessages(prev => [...prev, { id: oracleMsgId, kind: 'text', text: (oracleText || '').trim() || '(No response)', sender: 'oracle' }])
            }
        } catch (e) {
            console.error('Chat error:', e)
        } finally {
            setIsThinking(false)
        }
    }

    const sendVoiceMessage = async ({ blob }) => {
        const tempId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        const localUrl = URL.createObjectURL(blob)
        const durationSeconds = await getBlobDurationSeconds(blob)

        setMessages(prev => [...prev, { id: tempId, kind: 'voice', sender: 'user', audioUrl: localUrl, durationSeconds }])
        setIsThinking(true)
        try {
            const form = new FormData()
            form.append('file', blob, 'voice.webm')
            form.append('duration_seconds', String(durationSeconds || 0))
            const res = await fetch(`${API_BASE}/voice/${USERNAME}`, { method: 'POST', body: form })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)

            const serverUrl = data?.voice?.audio_url
            const oracle = data?.oracle || data

            if (serverUrl) {
                setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, audioUrl: serverUrl } : m)))
            }
            if (oracle?.message) {
                setMessages(prev => [...prev, { kind: 'text', text: oracle.message, sender: 'oracle' }])
            }
        } catch (e) {
            console.error('Voice error:', e)
        } finally {
            setIsThinking(false)
        }
    }

    const onSubmit = async (e) => {
        e.preventDefault()
        const t = inputText
        setInputText("")
        await sendMessageText(t)
    }

    const showEmpty = messages.length === 0 && !isThinking

    return (
        <Box minH="100vh" h="100vh" overflow="hidden" bg={bg} position="relative">
            {/* Fixed background for chat panel */}
            {activePanel === null && (
                <Box
                    position="fixed"
                    top={0}
                    bottom={0}
                    left={{ base: 0, lg: `${sidebarWidth}px` }}
                    right={0}
                    zIndex={0}
                    pointerEvents="none"
                    sx={{
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'white',
                            backgroundImage: bgImageUrl,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'clamp(320px, 38vw, 560px) auto',
                            backgroundPosition: 'center',
                            opacity: 1,
                        },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            background: 'transparent',
                        },
                    }}
                />
            )}

            <Box display="flex" minH="100vh" h="100vh" overflow="hidden" position="relative" zIndex={1}>
                {/* Sidebar (stats) */}
                <Box
                    w={`${sidebarWidth}px`}
                    display={{ base: 'none', lg: 'block' }}
                    bg={cardBg}
                    borderRightWidth="1px"
                    borderRightColor={borderColor}
                    px={6}
                    py={6}
                    position="sticky"
                    top={0}
                    h="100vh"
                    overflowY="auto"
                >
                    <HStack
                        as="button"
                        type="button"
                        onClick={() => {
                            setSidebarView('chat')
                            setActivePanel(null)
                        }}
                        spacing={3}
                        mb={6}
                        w="full"
                        textAlign="left"
                        _hover={{ opacity: 0.92 }}
                        _active={{ opacity: 0.85 }}
                    >
                        <Avatar size="md" src="/avatar.png" name="Oracle" />
                        <VStack align="start" spacing={0}>
                            <Badge colorScheme="teal" borderRadius="full">Rank {level}</Badge>
                            <Heading size="sm" fontWeight="900" color="teal.900">Life Agent</Heading>
                        </VStack>
                    </HStack>

                    <Box p={4} borderRadius="2xl" bg="teal.50" borderWidth="1px" borderColor="teal.100" mb={4}>
                        <Text fontSize="10px" fontWeight="900" color="teal.700" textTransform="uppercase" mb={2}>
                            Process Age
                        </Text>
                        <SimpleGrid columns={2} spacing={3}>
                            <Box>
                                <Text fontSize="2xl" fontWeight="900" lineHeight="1" color="teal.900">{processStats.days}</Text>
                                <Text fontSize="xs" fontWeight="800" color="teal.600">DAYS</Text>
                            </Box>
                            <Box>
                                <Text fontSize="2xl" fontWeight="900" lineHeight="1" color="teal.900">{processStats.weeks}</Text>
                                <Text fontSize="xs" fontWeight="800" color="teal.600">WEEKS</Text>
                            </Box>
                        </SimpleGrid>
                    </Box>

                    <Box mb={5}>
                        <Text fontSize="10px" fontWeight="900" color="teal.700" mb={3} textTransform="uppercase">Experience</Text>
                        <Progress value={Math.min(100, (xp % 1000) / 10)} size="sm" colorScheme="teal" borderRadius="full" />
                        <Text mt={2} fontSize="xs" color="teal.700" fontWeight="800">{xp} XP</Text>
                    </Box>

                    <Divider my={5} borderColor="teal.100" />

                    <VStack align="stretch" spacing={2}>
                        <Button
                            leftIcon={<FiMessageSquare />}
                            colorScheme="teal"
                            variant={sidebarView === 'chat' ? 'solid' : 'ghost'}
                            borderRadius="xl"
                            justifyContent="flex-start"
                            onClick={() => {
                                setSidebarView('chat')
                                setActivePanel(null)
                            }}
                        >
                            Chat
                        </Button>
                        <Button
                            leftIcon={<FiZap />}
                            colorScheme="teal"
                            variant={sidebarView === 'focus' ? 'solid' : 'ghost'}
                            borderRadius="xl"
                            justifyContent="flex-start"
                            onClick={() => {
                                setSidebarView('focus')
                                setActivePanel('focus')
                            }}
                        >
                            Focus
                        </Button>
                        <Button
                            leftIcon={<FiClock />}
                            colorScheme="teal"
                            variant={sidebarView === 'log' ? 'solid' : 'ghost'}
                            borderRadius="xl"
                            justifyContent="flex-start"
                            onClick={() => {
                                setSidebarView('log')
                                setActivePanel('log')
                            }}
                        >
                            Log
                        </Button>
                        <Button
                            leftIcon={<FiBarChart2 />}
                            colorScheme="teal"
                            variant={sidebarView === 'stats' ? 'solid' : 'ghost'}
                            borderRadius="xl"
                            justifyContent="flex-start"
                            onClick={() => {
                                setSidebarView('stats')
                                setActivePanel('stats')
                            }}
                        >
                            Stats
                        </Button>
                        <Button
                            leftIcon={<FiUser />}
                            colorScheme="teal"
                            variant={sidebarView === 'profile' ? 'solid' : 'ghost'}
                            borderRadius="xl"
                            justifyContent="flex-start"
                            onClick={() => {
                                setSidebarView('profile')
                                setActivePanel('profile')
                            }}
                        >
                            Profile
                        </Button>
                    </VStack>

                    <Divider my={5} borderColor="teal.100" />

                    {sidebarView === 'stats' && (
                        <Box p={4} borderRadius="2xl" bg="white" borderWidth="1px" borderColor="teal.100">
                            <Text fontSize="10px" fontWeight="900" color="teal.700" textTransform="uppercase" mb={3}>
                                Progress
                            </Text>
                            <SimpleGrid columns={3} spacing={3}>
                                <Box>
                                    <Text fontSize="xl" fontWeight="900" lineHeight="1" color="teal.900">{progress.streak ?? 0}</Text>
                                    <Text fontSize="xs" fontWeight="800" color="teal.600">STREAK</Text>
                                </Box>
                                <Box>
                                    <Text fontSize="xl" fontWeight="900" lineHeight="1" color="teal.900">{progress.total_days_active ?? 0}</Text>
                                    <Text fontSize="xs" fontWeight="800" color="teal.600">DAYS</Text>
                                </Box>
                                <Box>
                                    <Text fontSize="xl" fontWeight="900" lineHeight="1" color="teal.900">{progress.total_tasks_completed ?? 0}</Text>
                                    <Text fontSize="xs" fontWeight="800" color="teal.600">DONE</Text>
                                </Box>
                            </SimpleGrid>
                        </Box>
                    )}

                    {sidebarView === 'log' && (
                        <Box p={4} borderRadius="2xl" bg="white" borderWidth="1px" borderColor="teal.100">
                            <Text fontSize="10px" fontWeight="900" color="teal.700" textTransform="uppercase" mb={3}>
                                Recent
                            </Text>
                            <VStack align="stretch" spacing={2}>
                                {(messages.slice(-5)).reverse().map((m, idx) => (
                                    <Box key={`${m.id || idx}-log`} p={3} borderRadius="xl" bg="teal.50" borderWidth="1px" borderColor="teal.100">
                                        <Text fontSize="xs" color="teal.700" fontWeight="900" mb={1} textTransform="uppercase">
                                            {m.sender === 'user' ? 'You' : 'Oracle'}
                                        </Text>
                                        <Text fontSize="sm" fontWeight="800" color="teal.900" noOfLines={2}>
                                            {m.kind === 'voice' ? 'Voice message' : (m.text || '')}
                                        </Text>
                                    </Box>
                                ))}
                                {messages.length === 0 && (
                                    <Text fontSize="sm" color="teal.700" fontWeight="800">
                                        No messages yet.
                                    </Text>
                                )}
                            </VStack>
                        </Box>
                    )}

                    {sidebarView === 'profile' && (
                        <Box p={4} borderRadius="2xl" bg="white" borderWidth="1px" borderColor="teal.100">
                            <Text fontSize="10px" fontWeight="900" color="teal.700" textTransform="uppercase" mb={3}>
                                Agent
                            </Text>
                            <VStack align="stretch" spacing={2}>
                                <HStack justify="space-between">
                                    <Text fontSize="sm" fontWeight="900" color="teal.700">Username</Text>
                                    <Text fontSize="sm" fontWeight="900" color="teal.900">{USERNAME}</Text>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text fontSize="sm" fontWeight="900" color="teal.700">Rank</Text>
                                    <Badge colorScheme="teal" borderRadius="full">Level {level}</Badge>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text fontSize="sm" fontWeight="900" color="teal.700">XP</Text>
                                    <Text fontSize="sm" fontWeight="900" color="teal.900">{xp}</Text>
                                </HStack>
                            </VStack>
                        </Box>
                    )}
                </Box>

                {/* Right Panel */}
                <Box flex={1} h="100vh" display="flex" flexDirection="column" position="relative" overflow="hidden">
                    {activePanel !== null ? (
                        <Box flex={1} overflowY="auto">
                            <Home
                                embedded
                                initialTabIndex={
                                    activePanel === 'log'
                                        ? 1
                                        : activePanel === 'stats'
                                            ? 2
                                            : activePanel === 'profile'
                                                ? 3
                                                : 0
                                }
                            />
                        </Box>
                    ) : (
                        <>
                <HStack
                    position="sticky"
                    top={0}
                    zIndex={10}
                    px={{ base: 3, lg: 4 }}
                    py={{ base: 2, lg: 3 }}
                    bg={useColorModeValue('rgba(255,255,255,0.80)', 'rgba(26,32,44,0.72)')}
                    backdropFilter="blur(12px)"
                    borderBottomWidth="1px"
                    borderBottomColor={borderColor}
                    justify="space-between"
                >
                    <HStack w="full" maxW="980px" mx="auto" justify="space-between">
                        <HStack spacing={3}>
                            <Avatar size="md" src="/avatar.png" name="Oracle" border="2px solid" borderColor="teal.200" />
                            <Circle size="3" bg="teal.400" className="pulse-animation" />
                            <Heading size="md" fontWeight="900" letterSpacing="-0.3px" color="teal.900">Oracle</Heading>
                        </HStack>
                        <HStack spacing={2}>
                            {messages.length > 0 && (
                                <Button
                                    size="sm"
                                    variant="solid"
                                    colorScheme="purple"
                                    borderRadius="lg"
                                    fontWeight="700"
                                    leftIcon={<FiSave />}
                                    onClick={endAndAnalyze}
                                    isLoading={isAnalyzing}
                                    loadingText="Analyzing…"
                                >
                                    End Convo
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                colorScheme="teal"
                                borderRadius="lg"
                                fontWeight="700"
                                onClick={() => startNewSession(conversationId)}
                            >
                                New Chat
                            </Button>
                        </HStack>
                    </HStack>
                </HStack>

                <Box flex={1} position="relative" zIndex={1} overflowY="auto" px={{ base: 4, lg: 8 }} py={6}>
                    {showEmpty ? (
                        <VStack mt={{ base: 16, lg: 28 }} spacing={3} align="center" textAlign="center">
                            <Heading size="2xl" fontWeight="900" letterSpacing="-1px">
                                What can I help with?
                            </Heading>
                            <Text color="teal.700" fontWeight="800">
                                Send a message or a voice note to start.
                            </Text>
                        </VStack>
                    ) : (
                        <VStack spacing={4} align="stretch">
                            {messages.map((m, i) => (
                                <Box key={m.id || i} display="flex" justifyContent={m.sender === 'user' ? 'flex-end' : 'flex-start'}>
                                    {m.kind === 'voice' ? (
                                        <Box
                                            maxW={{ base: "92%", lg: "70%" }}
                                            p={4}
                                            borderRadius="2xl"
                                            bg={glassBg}
                                            backdropFilter="blur(10px)"
                                            color={glassVoiceText}
                                            boxShadow="sm"
                                            borderBottomRadius={m.sender === 'user' ? 'none' : '2xl'}
                                            borderTopRadius="2xl"
                                            minW={{ base: "240px", lg: "320px" }}
                                            borderWidth="1px"
                                            borderColor={glassBorder}
                                        >
                                            <VoiceMessageBubble
                                                audioUrl={m.audioUrl}
                                                durationSeconds={m.durationSeconds}
                                                isMine={m.sender === 'user'}
                                            />
                                        </Box>
                                    ) : (
                                        (() => {
                                            const parsed = m.sender === 'oracle' ? tryParseJsonReply(m.text) : null
                                            const isStructured = Boolean(parsed)
                                            return (
                                        <Box
                                            maxW={{ base: "92%", lg: "70%" }}
                                            p={isStructured ? 0 : 4}
                                            borderRadius={isStructured ? '0' : '2xl'}
                                            bg={isStructured ? 'transparent' : (m.sender === 'user' ? 'teal.600' : glassBg)}
                                            backdropFilter={isStructured ? 'none' : (m.sender === 'user' ? 'none' : 'blur(10px)')}
                                            color={m.sender === 'user' ? 'white' : glassText}
                                            fontSize="sm"
                                            fontWeight="600"
                                            boxShadow={isStructured ? 'none' : 'sm'}
                                            borderBottomRadius={m.sender === 'user' ? 'none' : '2xl'}
                                            borderTopRadius="2xl"
                                            whiteSpace="pre-wrap"
                                            borderWidth={isStructured ? '0' : (m.sender === 'user' ? '0' : '1px')}
                                            borderColor={isStructured ? 'transparent' : (m.sender === 'user' ? 'transparent' : glassTealBorder)}
                                        >
                                            {parsed ? <OracleStructuredReply data={parsed} /> : m.text}
                                        </Box>
                                            )
                                        })()
                                    )}
                                </Box>
                            ))}

                            {isThinking && (
                                <HStack
                                    spacing={2}
                                    p={4}
                                    bg={glassBg}
                                    backdropFilter="blur(10px)"
                                    borderWidth="1px"
                                    borderColor={glassTealBorder}
                                    borderRadius="2xl"
                                    w="fit-content"
                                    alignSelf="flex-start"
                                >
                                    <Circle size="2" bg="teal.500" opacity={0.4} />
                                    <Circle size="2" bg="teal.500" opacity={0.6} />
                                    <Circle size="2" bg="teal.500" opacity={0.8} />
                                </HStack>
                            )}

                            <div ref={chatEndRef} />
                        </VStack>
                    )}
                </Box>

                <Box
                    position="sticky"
                    bottom={0}
                    zIndex={20}
                    px={{ base: 3, lg: 4 }}
                    py={{ base: 2, lg: 3 }}
                    bg={useColorModeValue('rgba(255,255,255,0.86)', 'rgba(26,32,44,0.72)')}
                    backdropFilter="blur(12px)"
                    borderTopWidth="1px"
                    borderTopColor={borderColor}
                >
                    <Box w="full" maxW="980px" mx="auto">
                        <form onSubmit={onSubmit}>
                            <InputGroup size="md">
                                <Input
                                    pl="1.25rem"
                                    pr="8.5rem"
                                    py={6}
                                    placeholder="Message Oracle…"
                                    bg="gray.50"
                                    border="1px solid"
                                    borderColor="gray.100"
                                    borderRadius="xl"
                                    fontWeight="600"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                />
                                <InputRightElement width="8.5rem" h="full" pr={2}>
                                    <HStack spacing={2}>
                                        <VoiceRecorderButton
                                            ref={voiceRecorderRef}
                                            size="sm"
                                            onRecordingComplete={(payload) => sendVoiceMessage(payload)}
                                        />
                                        <IconButton
                                            size="sm"
                                            colorScheme="teal"
                                            icon={<FiSend />}
                                            type="submit"
                                            borderRadius="lg"
                                            aria-label="Send"
                                            isDisabled={!conversationId || isThinking}
                                        />
                                    </HStack>
                                </InputRightElement>
                            </InputGroup>
	                        </form>
	                    </Box>
	                </Box>
                        </>
                    )}
            </Box>
            </Box>

            {/* ── Conversation Analysis Modal ── */}
            <Modal isOpen={showAnalysis} onClose={() => setShowAnalysis(false)} size="lg" scrollBehavior="inside">
                <ModalOverlay backdropFilter="blur(6px)" />
                <ModalContent borderRadius="2xl" mx={4}>
                    <ModalHeader borderBottomWidth="1px" borderColor="purple.100" pb={3}>
                        <HStack spacing={2}>
                            <FiBarChart2 color="purple" />
                            <Text fontWeight="900" color="purple.700">Conversation Insights</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody py={8}>
                        {isAnalyzing ? (
                            <VStack spacing={4} py={8}>
                                <Spinner size="lg" color="purple.500" thickness="3px" />
                                <Text color="gray.500" fontWeight="600">Saving your conversation…</Text>
                            </VStack>
                        ) : (
                            <VStack spacing={5} py={6} align="center">
                                <Circle size="16" bg="green.50" borderWidth="2px" borderColor="green.200">
                                    <Text fontSize="3xl">✓</Text>
                                </Circle>
                                <VStack spacing={1}>
                                    <Text fontWeight="900" fontSize="lg" color="green.700">Conversation Saved</Text>
                                    <Text fontSize="sm" color="gray.400" fontWeight="600" textAlign="center">
                                        Your session has been stored. View insights in the Stats tab.
                                    </Text>
                                </VStack>
                                <Button
                                    colorScheme="teal" borderRadius="xl" fontWeight="800" w="full"
                                    onClick={() => { setShowAnalysis(false); startNewSession(null) }}
                                >
                                    Start Fresh Conversation
                                </Button>
                                <Button
                                    variant="ghost" size="sm" borderRadius="xl" fontWeight="700" color="gray.400"
                                    onClick={() => setShowAnalysis(false)}
                                >
                                    Stay here
                                </Button>
                            </VStack>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    )
}
