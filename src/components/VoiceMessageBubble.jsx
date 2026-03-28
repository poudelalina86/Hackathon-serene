import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, HStack, IconButton, Text, useColorModeValue } from '@chakra-ui/react'
import { FiPause, FiPlay } from 'react-icons/fi'

const clamp = (n, a, b) => Math.max(a, Math.min(b, n))

const formatSeconds = (s) => {
    if (!Number.isFinite(s) || s <= 0) return '0:00'
    const m = Math.floor(s / 60)
    const r = Math.floor(s % 60)
    return `${m}:${r.toString().padStart(2, '0')}`
}

const hashHeights = (seed, count = 28) => {
    let h = 2166136261
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    const heights = []
    for (let i = 0; i < count; i++) {
        h ^= h << 13
        h ^= h >>> 17
        h ^= h << 5
        const v = (h >>> 0) / 4294967295
        heights.push(6 + Math.round(v * 18))
    }
    return heights
}

export function VoiceMessageBubble({ audioUrl, durationSeconds = 0, isMine = false }) {
    const audioRef = useRef(null)
    const rafRef = useRef(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0) // 0..1

    const barHeights = useMemo(() => hashHeights(audioUrl || 'voice'), [audioUrl])
    const trackBg = useColorModeValue('gray.200', 'whiteAlpha.200')
    const fillBg = useColorModeValue('teal.500', 'teal.300')
    const timeColor = useColorModeValue('gray.600', 'whiteAlpha.800')

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [])

    const syncProgress = () => {
        const a = audioRef.current
        if (!a) return
        const p = a.duration ? a.currentTime / a.duration : 0
        setProgress(clamp(p, 0, 1))
        if (!a.paused) {
            rafRef.current = requestAnimationFrame(syncProgress)
        }
    }

    const toggle = async () => {
        const a = audioRef.current
        if (!a) return
        try {
            if (a.paused) {
                await a.play()
                setIsPlaying(true)
                rafRef.current = requestAnimationFrame(syncProgress)
            } else {
                a.pause()
                setIsPlaying(false)
            }
        } catch {
            // ignore
        }
    }

    const onEnded = () => {
        setIsPlaying(false)
        setProgress(0)
    }

    const filledBars = Math.round(progress * barHeights.length)

    return (
        <HStack spacing={3} align="center">
            <IconButton
                aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
                icon={isPlaying ? <FiPause /> : <FiPlay />}
                onClick={toggle}
                size="sm"
                isRound
                variant="solid"
                colorScheme="teal"
            />

            <Box display="flex" alignItems="flex-end" gap="3px" h="26px" flex={1} minW="160px">
                {barHeights.map((h, idx) => (
                    <Box
                        key={idx}
                        w="3px"
                        h={`${h}px`}
                        borderRadius="999px"
                        bg={idx < filledBars ? fillBg : trackBg}
                        transition="background 120ms ease"
                    />
                ))}
            </Box>

            <Text fontSize="xs" fontWeight="800" color={timeColor} minW="44px" textAlign="right">
                {formatSeconds(durationSeconds)}
            </Text>

            <audio ref={audioRef} src={audioUrl} onEnded={onEnded} />
        </HStack>
    )
}
