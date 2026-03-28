import React, { useMemo } from 'react'
import {
    Badge,
    Box,
    Divider,
    Heading,
    HStack,
    ListItem,
    Text,
    UnorderedList,
    VStack,
    useColorModeValue,
} from '@chakra-ui/react'

const asText = (v) => (v === null || v === undefined ? '' : String(v))

const pickMessage = (obj) => {
    if (!obj || typeof obj !== 'object') return ''
    return (
        asText(obj.message).trim() ||
        asText(obj.oracle_message).trim() ||
        asText(obj.oracle_response).trim() ||
        asText(obj.response).trim() ||
        asText(obj.text).trim()
    )
}

export function OracleStructuredReply({ data }) {
    const cardBg = useColorModeValue('white', 'gray.800')
    const border = useColorModeValue('teal.100', 'whiteAlpha.200')
    const muted = useColorModeValue('gray.600', 'gray.300')

    const message = useMemo(() => pickMessage(data), [data])

    const jokes = Array.isArray(data?.jokes) ? data.jokes : []
    const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
    const nextSteps = asText(data?.next_steps_suggestion).trim()
    const reflection = asText(data?.thought_for_reflection).trim()
    const responseType = asText(data?.response_type).trim()

    const userStateReflection = data?.user_state_reflection && typeof data.user_state_reflection === 'object'
        ? data.user_state_reflection
        : null

    return (
        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="2xl" p={4}>
            <VStack align="stretch" spacing={3}>
                <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                        {responseType && (
                            <Badge colorScheme="teal" borderRadius="full">
                                {responseType.replaceAll('_', ' ').toUpperCase()}
                            </Badge>
                        )}
                        {message && (
                            <Text fontSize="sm" fontWeight="700" color="teal.900" whiteSpace="pre-wrap">
                                {message}
                            </Text>
                        )}
                    </VStack>
                </HStack>

                {jokes.length > 0 && (
                    <Box>
                        <Heading size="xs" color={muted} textTransform="uppercase" letterSpacing="0.12em" mb={2}>
                            Jokes
                        </Heading>
                        <VStack align="stretch" spacing={2}>
                            {jokes.map((j, idx) => (
                                <Box key={j?.id ?? idx} p={3} borderRadius="xl" bg="teal.50" borderWidth="1px" borderColor="teal.100">
                                    <Text fontSize="sm" fontWeight="900" color="teal.900" mb={1}>
                                        {asText(j?.setup).trim() || '—'}
                                    </Text>
                                    <Text fontSize="sm" fontWeight="700" color="teal.800" whiteSpace="pre-wrap">
                                        {asText(j?.punchline).trim()}
                                    </Text>
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                )}

                {userStateReflection && (
                    <Box>
                        <Heading size="xs" color={muted} textTransform="uppercase" letterSpacing="0.12em" mb={2}>
                            State
                        </Heading>
                        <Box p={3} borderRadius="xl" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                            <HStack spacing={3} mb={2} flexWrap="wrap">
                                {'level' in userStateReflection && (
                                    <Badge colorScheme="teal" borderRadius="full">Level {userStateReflection.level}</Badge>
                                )}
                                {'xp' in userStateReflection && (
                                    <Badge colorScheme="gray" borderRadius="full">{userStateReflection.xp} XP</Badge>
                                )}
                                {Array.isArray(userStateReflection.tasks) && userStateReflection.tasks.length > 0 && (
                                    <Badge colorScheme="purple" borderRadius="full">{userStateReflection.tasks.join(', ')}</Badge>
                                )}
                            </HStack>
                            {userStateReflection.comment && (
                                <Text fontSize="sm" fontWeight="700" color={muted} whiteSpace="pre-wrap">
                                    {asText(userStateReflection.comment).trim()}
                                </Text>
                            )}
                        </Box>
                    </Box>
                )}

                {suggestions.length > 0 && (
                    <Box>
                        <Heading size="xs" color={muted} textTransform="uppercase" letterSpacing="0.12em" mb={2}>
                            Suggestions
                        </Heading>
                        <UnorderedList spacing={2} pl={5} m={0}>
                            {suggestions.map((s, idx) => (
                                <ListItem key={idx}>
                                    <Text as="span" fontSize="sm" fontWeight="700" color="teal.800">
                                        {asText(s?.text || s?.message || s).trim()}
                                    </Text>
                                </ListItem>
                            ))}
                        </UnorderedList>
                    </Box>
                )}

                {(nextSteps || reflection) && <Divider borderColor={border} />}

                {nextSteps && (
                    <Box>
                        <Heading size="xs" color={muted} textTransform="uppercase" letterSpacing="0.12em" mb={2}>
                            Next
                        </Heading>
                        <Text fontSize="sm" fontWeight="700" color="teal.900" whiteSpace="pre-wrap">
                            {nextSteps}
                        </Text>
                    </Box>
                )}

                {reflection && (
                    <Box>
                        <Heading size="xs" color={muted} textTransform="uppercase" letterSpacing="0.12em" mb={2}>
                            Reflection
                        </Heading>
                        <Text fontSize="sm" fontWeight="700" color="teal.900" whiteSpace="pre-wrap">
                            {reflection}
                        </Text>
                    </Box>
                )}

            </VStack>
        </Box>
    )
}
