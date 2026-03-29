import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsername } from '../lib/session'
import {
    Box, VStack, HStack, Heading, Text, Button, IconButton,
    Avatar, Badge, Divider, Textarea, Input, Tag, TagLabel,
    useColorModeValue, Spinner, useToast, Modal, ModalOverlay,
    ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
    useDisclosure, FormControl, FormLabel, Select, Wrap, WrapItem,
    InputGroup, InputLeftElement, Flex, Spacer,
} from '@chakra-ui/react'
import { FiHeart, FiMessageSquare, FiPlus, FiTrash2, FiEdit2, FiSearch, FiArrowLeft, FiSend } from 'react-icons/fi'
import { motion } from 'framer-motion'

const MotionBox = motion(Box)

const RAW_BASE =
    import.meta.env["VITE_API_URL"] ||
    import.meta.env["VITE_X_7ea54382_7b12_4f3d_9c3a_1e4d5f6a7b8c"] ||
    "http://localhost:8000/api/v1"

const toBase = (raw) => {
    const t = String(raw || "").replace(/\/+$/, "")
    if (!t) return "http://localhost:8000/api/v1"
    if (/\/api\/v1$/i.test(t)) return t
    if (/\/v1$/i.test(t)) return t.replace(/\/v1$/i, "/api/v1")
    return `${t}/api/v1`
}
const API_BASE = toBase(RAW_BASE)
const USERNAME = getUsername() || "guest"

const MOODS = ["hopeful", "anxious", "motivated", "struggling", "grateful", "overwhelmed", "calm", "excited"]
const MOOD_COLORS = {
    hopeful: "teal", anxious: "orange", motivated: "green", struggling: "red",
    grateful: "purple", overwhelmed: "yellow", calm: "blue", excited: "pink",
}

function timeAgo(dateStr) {
    if (!dateStr) return ""
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

function PostDetail({ post, currentUser, onBack, onLike, onDelete }) {
    const bg = useColorModeValue("white", "gray.800")
    const border = useColorModeValue("gray.200", "gray.700")
    const commentBg = useColorModeValue("gray.50", "gray.700")
    const liked = (post.likes || []).includes(currentUser)
    const [commentText, setCommentText] = useState('')
    const [comments, setComments] = useState(post.comments || [])
    const [submitting, setSubmitting] = useState(false)
    const toast = useToast()

    const submitComment = async () => {
        if (!commentText.trim()) return
        setSubmitting(true)
        try {
            const res = await fetch(`${API_BASE}/blog/posts/${post.id}/comments/${currentUser}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentText.trim() }),
            })
            if (!res.ok) throw new Error()
            const newComment = await res.json()
            setComments(prev => [...prev, newComment])
            setCommentText('')
        } catch {
            toast({ title: "Failed to post comment", status: "error", duration: 3000, isClosable: true })
        } finally {
            setSubmitting(false)
        }
    }

    const deleteComment = async (commentId) => {
        try {
            await fetch(`${API_BASE}/blog/comments/${currentUser}/${commentId}`, { method: 'DELETE' })
            setComments(prev => prev.filter(c => c.id !== commentId))
        } catch {
            toast({ title: "Failed to delete comment", status: "error", duration: 3000, isClosable: true })
        }
    }

    return (
        <VStack align="start" spacing={5} w="100%">
            <Button leftIcon={<FiArrowLeft />} variant="ghost" size="sm" onClick={onBack}>Back to Feed</Button>
            <Box bg={bg} borderRadius="xl" border="1px solid" borderColor={border} p={6} w="100%">
                <VStack align="start" spacing={4}>
                    <HStack w="100%" justify="space-between">
                        <HStack spacing={3}>
                            <Avatar size="md" name={post.username} />
                            <VStack align="start" spacing={0}>
                                <Text fontWeight="700">{post.username}</Text>
                                <Text fontSize="xs" color="gray.500">{timeAgo(post.created_at)}</Text>
                            </VStack>
                        </HStack>
                        {post.mood && <Badge colorScheme={MOOD_COLORS[post.mood] || "gray"} fontSize="sm">{post.mood}</Badge>}
                    </HStack>
                    <Heading size="md">{post.title}</Heading>
                    <Text whiteSpace="pre-wrap">{post.content}</Text>
                    {post.tags?.length > 0 && (
                        <Wrap>
                            {post.tags.map(t => <WrapItem key={t}><Tag colorScheme="teal"><TagLabel>#{t}</TagLabel></Tag></WrapItem>)}
                        </Wrap>
                    )}
                    <HStack>
                        <IconButton icon={<FiHeart />} size="sm" variant="ghost"
                            colorScheme={liked ? "red" : "gray"} color={liked ? "red.400" : undefined}
                            aria-label="Like" onClick={() => onLike(post.id)} />
                        <Text fontSize="sm" color="gray.500">{post.likes?.length || 0} likes</Text>
                        {post.username === currentUser && (
                            <IconButton icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red"
                                aria-label="Delete post" onClick={() => { onDelete(post.id); onBack() }} />
                        )}
                    </HStack>
                </VStack>
            </Box>

            <Heading size="sm" pl={1}>💬 Comments ({comments.length})</Heading>
            <VStack align="start" spacing={3} w="100%">
                {comments.map(c => (
                    <Box key={c.id} bg={commentBg} borderRadius="lg" p={4} w="100%">
                        <HStack justify="space-between">
                            <HStack spacing={2}>
                                <Avatar size="xs" name={c.username} />
                                <Text fontWeight="700" fontSize="sm">{c.username}</Text>
                                <Text fontSize="xs" color="gray.500">{timeAgo(c.created_at)}</Text>
                            </HStack>
                            {c.username === currentUser && (
                                <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" colorScheme="red"
                                    aria-label="Delete comment" onClick={() => deleteComment(c.id)} />
                            )}
                        </HStack>
                        <Text mt={2} fontSize="sm">{c.content}</Text>
                    </Box>
                ))}
            </VStack>
            <HStack w="100%" spacing={2}>
                <Textarea placeholder="Write a comment…" value={commentText} onChange={e => setCommentText(e.target.value)}
                    rows={2} resize="none" borderRadius="xl" />
                <IconButton icon={<FiSend />} colorScheme="teal" borderRadius="xl" aria-label="Post comment"
                    isLoading={submitting} onClick={submitComment} />
            </HStack>
        </VStack>
    )
}

function PostCard({ post, onOpen, onLike, onDelete, currentUser }) {
    const bg = useColorModeValue("white", "gray.800")
    const border = useColorModeValue("gray.200", "gray.700")
    const liked = (post.likes || []).includes(currentUser)

    return (
        <MotionBox
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            bg={bg} borderRadius="xl" border="1px solid" borderColor={border}
            p={5} w="100%" cursor="pointer" _hover={{ shadow: "md", borderColor: "teal.300" }}
            onClick={() => onOpen(post)}
        >
            <VStack align="start" spacing={3}>
                <HStack w="100%" justify="space-between">
                    <HStack spacing={3}>
                        <Avatar size="sm" name={post.username} />
                        <VStack align="start" spacing={0}>
                            <Text fontWeight="700" fontSize="sm">{post.username}</Text>
                            <Text fontSize="xs" color="gray.500">{timeAgo(post.created_at)}</Text>
                        </VStack>
                    </HStack>
                    {post.mood && <Badge colorScheme={MOOD_COLORS[post.mood] || "gray"}>{post.mood}</Badge>}
                </HStack>

                <Heading size="sm" noOfLines={2}>{post.title}</Heading>
                <Text fontSize="sm" color="gray.600" noOfLines={3}>{post.content}</Text>

                {post.tags?.length > 0 && (
                    <Wrap>
                        {post.tags.map(t => (
                            <WrapItem key={t}><Tag size="sm" colorScheme="teal"><TagLabel>#{t}</TagLabel></Tag></WrapItem>
                        ))}
                    </Wrap>
                )}

                <HStack w="100%" onClick={e => e.stopPropagation()}>
                    <HStack spacing={1}>
                        <IconButton
                            icon={<FiHeart />} size="sm" variant="ghost"
                            colorScheme={liked ? "red" : "gray"}
                            color={liked ? "red.400" : undefined}
                            aria-label="Like" onClick={() => onLike(post.id)}
                        />
                        <Text fontSize="sm" color="gray.500">{post.like_count}</Text>
                    </HStack>
                    <HStack spacing={1}>
                        <IconButton icon={<FiMessageSquare />} size="sm" variant="ghost" colorScheme="gray" aria-label="Comments" onClick={() => onOpen(post)} />
                        <Text fontSize="sm" color="gray.500">{post.comment_count}</Text>
                    </HStack>
                    <Spacer />
                    {post.username === currentUser && (
                        <IconButton icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red"
                            aria-label="Delete" onClick={() => onDelete(post.id)} />
                    )}
                </HStack>
            </VStack>
        </MotionBox>
    )
}



export function Blog() {
    const navigate = useNavigate()
    const bg = useColorModeValue("gray.50", "gray.900")
    const cardBg = useColorModeValue("white", "gray.800")
    const border = useColorModeValue("gray.200", "gray.700")
    const toast = useToast()
    const { isOpen, onOpen: openModal, onClose } = useDisclosure()

    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedPost, setSelectedPost] = useState(null)
    const [search, setSearch] = useState('')

    // New post form state
    const [form, setForm] = useState({ title: '', content: '', mood: '', tags: '' })
    const [submitting, setSubmitting] = useState(false)

    const fetchPosts = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/blog/posts?limit=100`)
            if (!res.ok) throw new Error()
            setPosts(await res.json())
        } catch {
            toast({ title: "Could not load posts", status: "error", duration: 3000, isClosable: true })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchPosts() }, [fetchPosts])

    const openPost = async (post) => {
        try {
            const res = await fetch(`${API_BASE}/blog/posts/${post.id}`)
            if (!res.ok) throw new Error()
            setSelectedPost(await res.json())
        } catch {
            setSelectedPost(post)
        }
    }

    const handleLike = async (postId) => {
        try {
            const res = await fetch(`${API_BASE}/blog/posts/${postId}/like/${USERNAME}`, { method: 'POST' })
            if (!res.ok) throw new Error()
            const updated = await res.json()
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updated } : p))
            if (selectedPost?.id === postId) setSelectedPost(prev => ({ ...prev, ...updated }))
        } catch {
            toast({ title: "Failed to like post", status: "error", duration: 2000, isClosable: true })
        }
    }

    const handleDelete = async (postId) => {
        try {
            await fetch(`${API_BASE}/blog/posts/${USERNAME}/${postId}`, { method: 'DELETE' })
            setPosts(prev => prev.filter(p => p.id !== postId))
            if (selectedPost?.id === postId) setSelectedPost(null)
            toast({ title: "Post deleted", status: "info", duration: 2000, isClosable: true })
        } catch {
            toast({ title: "Failed to delete post", status: "error", duration: 2000, isClosable: true })
        }
    }

    const handleCreate = async () => {
        if (!form.title.trim() || !form.content.trim()) {
            toast({ title: "Title and content are required", status: "warning", duration: 2000, isClosable: true })
            return
        }
        setSubmitting(true)
        try {
            const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
            const res = await fetch(`${API_BASE}/blog/posts/${USERNAME}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: form.title.trim(), content: form.content.trim(), mood: form.mood || null, tags }),
            })
            if (!res.ok) throw new Error()
            const newPost = await res.json()
            setPosts(prev => [newPost, ...prev])
            setForm({ title: '', content: '', mood: '', tags: '' })
            onClose()
            toast({ title: "Post shared! 🎉", status: "success", duration: 3000, isClosable: true })
        } catch {
            toast({ title: "Failed to create post", status: "error", duration: 3000, isClosable: true })
        } finally {
            setSubmitting(false)
        }
    }

    const filtered = posts.filter(p =>
        !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.content.toLowerCase().includes(search.toLowerCase()) ||
        p.username.toLowerCase().includes(search.toLowerCase()) ||
        (p.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <Box minH="100vh" bg={bg} py={8} px={{ base: 4, md: 8 }}>
            <Box maxW="720px" mx="auto">
                <HStack mb={6} justify="space-between" flexWrap="wrap" gap={3}>
                    <HStack spacing={3}>
                        <IconButton
                            icon={<FiArrowLeft />}
                            aria-label="Back to home"
                            variant="ghost"
                            colorScheme="teal"
                            borderRadius="xl"
                            onClick={() => navigate('/')}
                        />
                        <VStack align="start" spacing={0}>
                            <Heading size="lg">🌿 Community Blog</Heading>
                            <Text fontSize="sm" color="gray.500">Share your story. Support each other.</Text>
                        </VStack>
                    </HStack>
                    <Button leftIcon={<FiPlus />} colorScheme="teal" borderRadius="xl" onClick={openModal}>
                        Write a Post
                    </Button>
                </HStack>

                {!selectedPost && (
                    <InputGroup mb={5}>
                        <InputLeftElement pointerEvents="none"><FiSearch color="gray" /></InputLeftElement>
                        <Input placeholder="Search posts, tags, or users…" borderRadius="xl"
                            value={search} onChange={e => setSearch(e.target.value)} bg={cardBg} />
                    </InputGroup>
                )}

                {selectedPost ? (
                    <PostDetail
                        post={selectedPost} currentUser={USERNAME}
                        onBack={() => setSelectedPost(null)}
                        onLike={handleLike} onDelete={handleDelete}
                    />
                ) : loading ? (
                    <Flex justify="center" py={20}><Spinner size="xl" color="teal.400" /></Flex>
                ) : filtered.length === 0 ? (
                    <Box textAlign="center" py={20}>
                        <Text fontSize="lg" color="gray.500">No posts yet. Be the first to share! ✨</Text>
                    </Box>
                ) : (
                    <VStack spacing={4} align="stretch">
                        {filtered.map(p => (
                            <PostCard key={p.id} post={p} currentUser={USERNAME}
                                onOpen={openPost} onLike={handleLike} onDelete={handleDelete} />
                        ))}
                    </VStack>
                )}
            </Box>

            {/* Create Post Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="lg">
                <ModalOverlay backdropFilter="blur(6px)" />
                <ModalContent borderRadius="2xl">
                    <ModalHeader>✍️ Write a Post</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>Title</FormLabel>
                                <Input placeholder="What's on your mind?" borderRadius="xl"
                                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                            </FormControl>
                            <FormControl isRequired>
                                <FormLabel>Content</FormLabel>
                                <Textarea placeholder="Share your story, experience, or thoughts…"
                                    rows={6} borderRadius="xl" resize="vertical"
                                    value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
                            </FormControl>
                            <HStack w="100%" spacing={4}>
                                <FormControl>
                                    <FormLabel>Mood</FormLabel>
                                    <Select placeholder="How are you feeling?" borderRadius="xl"
                                        value={form.mood} onChange={e => setForm(f => ({ ...f, mood: e.target.value }))}>
                                        {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </Select>
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Tags</FormLabel>
                                    <Input placeholder="anxiety, sleep, growth…" borderRadius="xl"
                                        value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                                </FormControl>
                            </HStack>
                        </VStack>
                    </ModalBody>
                    <ModalFooter gap={2}>
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button colorScheme="teal" borderRadius="xl" isLoading={submitting} onClick={handleCreate}>
                            Publish
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    )
}
