import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Box, IconButton, useToast } from '@chakra-ui/react'
import { FiMic } from 'react-icons/fi'

function RecordingWaveIcon() {
    return (
        <Box display="flex" alignItems="flex-end" gap="2px" h="16px">
            <Box className="rec-bar" w="3px" h="6px" bg="currentColor" borderRadius="999px" />
            <Box className="rec-bar rec-bar--2" w="3px" h="12px" bg="currentColor" borderRadius="999px" />
            <Box className="rec-bar rec-bar--3" w="3px" h="9px" bg="currentColor" borderRadius="999px" />
            <Box className="rec-bar rec-bar--4" w="3px" h="14px" bg="currentColor" borderRadius="999px" />
        </Box>
    )
}

export const VoiceRecorderButton = forwardRef(function VoiceRecorderButton(
    {
        onRecordingComplete,
        onRecordingStateChange,
        autoStopOnSilence = false,
        autoSendOnSilence = false,
        isPaused = false,
        silenceMs = 3500,
        minRecordMs = 800,
        volumeThreshold = 0.015,
        size = 'md',
        isDisabled = false,
    },
    ref
) {
    const toast = useToast()
    const streamRef = useRef(null)
    const recorderRef = useRef(null)
    const chunksRef = useRef([])
    const cancelledRef = useRef(false)
    const onCompleteRef = useRef(onRecordingComplete)
    const onStateRef = useRef(onRecordingStateChange)
    const [isRecording, setIsRecording] = useState(false)
    const isRecordingRef = useRef(false)
    const isPausedRef = useRef(false)
    const audioCtxRef = useRef(null)
    const analyserRef = useRef(null)
    const gainRef = useRef(null)
    const rafRef = useRef(0)
    const startedAtRef = useRef(0)
    const lastLoudAtRef = useRef(0)
    const heardSpeechRef = useRef(false)
    const stoppingSessionRef = useRef(false)
    const stopReasonRef = useRef('session') // 'utterance' | 'pause' | 'session'
    const dropNextBlobRef = useRef(false)
    const mimeTypeRef = useRef('audio/webm')
    const ensureRecorderInFlightRef = useRef(false)
    const lastEnsureRecorderAtRef = useRef(0)
    const ensureGraphInFlightRef = useRef(false)

    useEffect(() => {
        onCompleteRef.current = onRecordingComplete
    }, [onRecordingComplete])

    useEffect(() => {
        onStateRef.current = onRecordingStateChange
    }, [onRecordingStateChange])

    useEffect(() => {
        isPausedRef.current = Boolean(isPaused)
    }, [isPaused])

    useEffect(() => {
        isRecordingRef.current = isRecording
        onStateRef.current?.({ isRecording })
    }, [isRecording])

    useEffect(() => {
        if (!isRecording) return
        // Keep the ref in sync for long-lived callbacks.
        isPausedRef.current = Boolean(isPaused)
    }, [isPaused, isRecording])

    useEffect(() => {
        return () => {
            try {
                recorderRef.current?.stop?.()
            } catch {
                // ignore
            }
            try {
                streamRef.current?.getTracks?.()?.forEach((t) => t.stop())
            } catch {
                // ignore
            }
            try {
                if (rafRef.current) cancelAnimationFrame(rafRef.current)
            } catch {
                // ignore
            }
            try {
                audioCtxRef.current?.close?.()
            } catch {
                // ignore
            }
        }
    }, [])

    useImperativeHandle(ref, () => ({
        stop: () => stop(),
        cancel: () => cancel(),
        isRecording: () => isRecording,
    }), [isRecording])

    const cleanupAudioGraph = () => {
        try {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        } catch {
            // ignore
        }
        rafRef.current = 0
        try {
            audioCtxRef.current?.close?.()
        } catch {
            // ignore
        }
        audioCtxRef.current = null
        analyserRef.current = null
        gainRef.current = null
    }

    const cleanupStream = () => {
        try {
            streamRef.current?.getTracks?.()?.forEach((t) => t.stop())
        } catch {
            // ignore
        }
        streamRef.current = null
    }

    const resetUtteranceWindow = () => {
        const now = Date.now()
        startedAtRef.current = now
        lastLoudAtRef.current = now
        heardSpeechRef.current = false
        chunksRef.current = []
    }

    const ensureStream = async () => {
        if (streamRef.current) return streamRef.current
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream
            return stream
        } catch {
            toast({
                status: 'error',
                title: 'Microphone blocked',
                description: 'Allow microphone permissions to record voice.',
            })
            return null
        }
    }

    const ensureAudioGraph = async () => {
        if (audioCtxRef.current && analyserRef.current) return true
        const stream = streamRef.current
        if (!stream) return false
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            const ctx = new AudioContext()
            audioCtxRef.current = ctx
            const source = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 2048
            analyser.smoothingTimeConstant = 0.8
            analyserRef.current = analyser
            const gain = ctx.createGain()
            gain.gain.value = 0
            gainRef.current = gain
            source.connect(analyser)
            analyser.connect(gain)
            gain.connect(ctx.destination)
            try { await ctx.resume?.() } catch { /* ignore */ }
            return true
        } catch (e) {
            console.warn('Silence detection unavailable:', e)
            return false
        }
    }

    const resumeAudioGraph = async () => {
        try {
            await audioCtxRef.current?.resume?.()
        } catch {
            // ignore
        }
    }

    const computeMimeType = () => {
        if (window.MediaRecorder?.isTypeSupported?.('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
        if (window.MediaRecorder?.isTypeSupported?.('audio/webm')) return 'audio/webm'
        return 'audio/webm'
    }

    const startRecorder = async () => {
        if (!streamRef.current) return false
        if (isPausedRef.current) return false
        if (recorderRef.current && recorderRef.current.state === 'recording') return true

        const mimeType = computeMimeType()
        mimeTypeRef.current = mimeType
        resetUtteranceWindow()

        try {
            const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined)
            recorderRef.current = recorder

            recorder.ondataavailable = (e) => {
                if (isPausedRef.current) return
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onerror = () => {
                toast({ status: 'error', title: 'Recording failed' })
                stopReasonRef.current = 'session'
                stoppingSessionRef.current = true
                try { recorderRef.current?.stop?.() } catch { /* ignore */ }
            }

            recorder.onstop = () => {
                const reason = stopReasonRef.current
                const shouldDrop = dropNextBlobRef.current
                dropNextBlobRef.current = false

                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeTypeRef.current || 'audio/webm' })
                chunksRef.current = []

                recorderRef.current = null

                if (!cancelledRef.current && !shouldDrop && blob.size > 0 && reason === 'utterance') {
                    onCompleteRef.current?.({ blob, mimeType: blob.type, auto: true })
                }

                if (reason === 'session') {
                    // Fallback: if auto-send is enabled but silence detection fails (no analyser),
                    // allow a manual stop to still send what was recorded.
                    try {
                        const longEnough = Date.now() - startedAtRef.current >= minRecordMs
                        if (
                            autoSendOnSilence &&
                            !cancelledRef.current &&
                            !shouldDrop &&
                            blob.size > 0 &&
                            heardSpeechRef.current &&
                            longEnough
                        ) {
                            onCompleteRef.current?.({ blob, mimeType: blob.type, auto: false })
                        }
                    } catch {
                        // ignore
                    }
                    cleanupAudioGraph()
                    cleanupStream()
                    stoppingSessionRef.current = false
                    cancelledRef.current = false
                    setIsRecording(false)
                    isRecordingRef.current = false
                    return
                }

                // For 'utterance', restart immediately (pause/resume is handled by the isPaused effect).
                if (reason === 'utterance' && isRecordingRef.current && autoSendOnSilence && !isPausedRef.current && !cancelledRef.current) {
                    // start a fresh recorder for next utterance
                    startRecorder()
                }
            }

            // Use a small timeslice so we always have chunks buffered before stop.
            // This avoids edge cases where `onstop` fires before the final `ondataavailable`.
            if (autoSendOnSilence) recorder.start(250)
            else recorder.start()
            return true
        } catch (e) {
            toast({
                status: 'error',
                title: 'Cannot start recording',
                description: e?.message || 'Unknown error',
            })
            return false
        }
    }

    const ensureRecorderRunning = () => {
        if (isPausedRef.current) return
        if (!isRecordingRef.current) return
        if (cancelledRef.current || stoppingSessionRef.current) return
        if (recorderRef.current && recorderRef.current.state === 'recording') return

        const now = Date.now()
        if (ensureRecorderInFlightRef.current) return
        if (now - lastEnsureRecorderAtRef.current < 600) return
        lastEnsureRecorderAtRef.current = now
        ensureRecorderInFlightRef.current = true
        Promise.resolve(startRecorder())
            .catch(() => {})
            .finally(() => {
                ensureRecorderInFlightRef.current = false
            })
    }

    const start = async () => {
        cancelledRef.current = false
        stoppingSessionRef.current = false
        stopReasonRef.current = 'session'
        dropNextBlobRef.current = false

        const stream = await ensureStream()
        if (!stream) return

        setIsRecording(true)
        isRecordingRef.current = true

        if (autoStopOnSilence || autoSendOnSilence) {
            await ensureAudioGraph()
            try {
                if (rafRef.current) cancelAnimationFrame(rafRef.current)
            } catch {
                // ignore
            }
            const data = new Float32Array(2048)
            const tick = () => {
                if (!isRecordingRef.current) return
                if (cancelledRef.current || stoppingSessionRef.current) return
                if (isPausedRef.current) {
                    rafRef.current = requestAnimationFrame(tick)
                    return
                }

                if (!analyserRef.current) {
                    // Try to self-heal if the AudioContext/graph wasn't ready yet.
                    if (!ensureGraphInFlightRef.current) {
                        ensureGraphInFlightRef.current = true
                        Promise.resolve(ensureAudioGraph())
                            .catch(() => {})
                            .finally(() => { ensureGraphInFlightRef.current = false })
                    }
                    rafRef.current = requestAnimationFrame(tick)
                    return
                }
                if (!recorderRef.current || recorderRef.current.state !== 'recording') {
                    // Self-heal: MediaRecorder can end up stopped after a pause/resume.
                    ensureRecorderRunning()
                    rafRef.current = requestAnimationFrame(tick)
                    return
                }

                analyserRef.current.getFloatTimeDomainData(data)
                let sum = 0
                for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
                const rms = Math.sqrt(sum / data.length)

                const now = Date.now()
                if (rms > volumeThreshold) {
                    heardSpeechRef.current = true
                    lastLoudAtRef.current = now
                }

                if (
                    heardSpeechRef.current &&
                    now - lastLoudAtRef.current >= silenceMs &&
                    now - startedAtRef.current >= minRecordMs
                ) {
                    if (autoSendOnSilence) {
                        // finalize utterance as a standalone file (stop + restart recorder).
                        stopReasonRef.current = 'utterance'
                        try { recorderRef.current?.stop?.() } catch { /* ignore */ }
                        rafRef.current = requestAnimationFrame(tick)
                        return
                    }
                    if (autoStopOnSilence) {
                        stop()
                        rafRef.current = requestAnimationFrame(tick)
                        return
                    }
                }

                rafRef.current = requestAnimationFrame(tick)
            }
            rafRef.current = requestAnimationFrame(tick)
        }

        await startRecorder()
    }

    useEffect(() => {
        if (!isRecording) return
        isPausedRef.current = Boolean(isPaused)

        if (isPaused) {
            // Stop the current recorder while the assistant is speaking.
            // We must restart on resume to ensure new WebM headers (otherwise ffmpeg may fail).
            if (recorderRef.current && recorderRef.current.state === 'recording') {
                dropNextBlobRef.current = true
                stopReasonRef.current = 'pause'
                try { recorderRef.current.stop() } catch { /* ignore */ }
            }
            return
        }

        if (autoSendOnSilence) {
            resumeAudioGraph()
            startRecorder()
        }
    }, [isPaused, isRecording, autoSendOnSilence])

    const stop = () => {
        stoppingSessionRef.current = true
        stopReasonRef.current = 'session'
        try {
            recorderRef.current?.stop?.()
        } catch {
            // ignore
        }
        // If recorder isn't running, still cleanup immediately.
        if (!recorderRef.current) {
            cleanupAudioGraph()
            cleanupStream()
            stoppingSessionRef.current = false
            cancelledRef.current = false
            setIsRecording(false)
            isRecordingRef.current = false
        }
    }

    const cancel = () => {
        cancelledRef.current = true
        stoppingSessionRef.current = true
        stopReasonRef.current = 'session'
        dropNextBlobRef.current = true
        chunksRef.current = []
        try {
            recorderRef.current?.stop?.()
        } catch {
            // ignore
        }
        try {
            streamRef.current?.getTracks?.()?.forEach((t) => t.stop())
        } catch {
            // ignore
        }
        try {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        } catch {
            // ignore
        }
        try {
            audioCtxRef.current?.close?.()
        } catch {
            // ignore
        }
        streamRef.current = null
        recorderRef.current = null
        audioCtxRef.current = null
        analyserRef.current = null
        gainRef.current = null
        setIsRecording(false)
        isRecordingRef.current = false
    }

    const label = isRecording ? 'Recording (tap to stop)' : 'Record voice'

    return (
        <IconButton
            aria-label={label}
            icon={isRecording ? <RecordingWaveIcon /> : <FiMic />}
            onClick={isRecording ? stop : start}
            isDisabled={isDisabled}
            size={size}
            variant="solid"
            colorScheme={isRecording ? 'red' : 'blue'}
            isRound
            boxShadow={isRecording ? '0 0 0 6px rgba(245, 101, 101, 0.18)' : 'md'}
            sx={{
                '.rec-bar': { animation: 'rec-pulse 700ms ease-in-out infinite alternate' },
                '.rec-bar--2': { animationDelay: '100ms' },
                '.rec-bar--3': { animationDelay: '220ms' },
                '.rec-bar--4': { animationDelay: '320ms' },
                '@keyframes rec-pulse': {
                    '0%': { transform: 'scaleY(0.55)', opacity: 0.65 },
                    '100%': { transform: 'scaleY(1.15)', opacity: 1 },
                },
            }}
        />
    )
})
