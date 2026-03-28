import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { IconButton, useToast } from '@chakra-ui/react'
import { FiMic, FiSquare } from 'react-icons/fi'

export const VoiceRecorderButton = forwardRef(function VoiceRecorderButton(
    {
        onRecordingComplete,
        onRecordingStateChange,
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

    useEffect(() => {
        onCompleteRef.current = onRecordingComplete
    }, [onRecordingComplete])

    useEffect(() => {
        onStateRef.current = onRecordingStateChange
    }, [onRecordingStateChange])

    useEffect(() => {
        onStateRef.current?.({ isRecording })
    }, [isRecording])

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
        }
    }, [])

    useImperativeHandle(ref, () => ({
        stop: () => stop(),
        cancel: () => cancel(),
        isRecording: () => isRecording,
    }), [isRecording])

    const start = async () => {
        cancelledRef.current = false
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream
        } catch {
            toast({
                status: 'error',
                title: 'Microphone blocked',
                description: 'Allow microphone permissions to record voice.',
            })
            return
        }

        chunksRef.current = []

        let mimeType = ''
        if (window.MediaRecorder?.isTypeSupported?.('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus'
        } else if (window.MediaRecorder?.isTypeSupported?.('audio/webm')) {
            mimeType = 'audio/webm'
        }

        try {
            const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined)
            recorderRef.current = recorder

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onerror = () => {
                setIsRecording(false)
                toast({ status: 'error', title: 'Recording failed' })
            }

            recorder.onstop = async () => {
                setIsRecording(false)
                try {
                    if (cancelledRef.current) return
                    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
                    onCompleteRef.current?.({ blob, mimeType: blob.type })
                } finally {
                    chunksRef.current = []
                    try {
                        streamRef.current?.getTracks?.()?.forEach((t) => t.stop())
                    } catch {
                        // ignore
                    }
                    streamRef.current = null
                    recorderRef.current = null
                }
            }

            recorder.start()
            setIsRecording(true)
        } catch (e) {
            toast({
                status: 'error',
                title: 'Cannot start recording',
                description: e?.message || 'Unknown error',
            })
        }
    }

    const stop = () => {
        try {
            recorderRef.current?.stop?.()
        } catch {
            // ignore
        }
    }

    const cancel = () => {
        cancelledRef.current = true
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
        streamRef.current = null
        recorderRef.current = null
        setIsRecording(false)
    }

    const label = isRecording ? 'Stop recording' : 'Record voice'

    return (
        <IconButton
            aria-label={label}
            icon={isRecording ? <FiSquare /> : <FiMic />}
            onClick={isRecording ? stop : start}
            isDisabled={isDisabled}
            size={size}
            variant="solid"
            colorScheme={isRecording ? 'red' : 'blue'}
            isRound
            boxShadow={isRecording ? '0 0 0 6px rgba(245, 101, 101, 0.18)' : 'md'}
        />
    )
})
