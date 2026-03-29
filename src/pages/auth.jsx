import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box, Button, Divider, FormControl, FormLabel, Heading,
    Input, InputGroup, InputRightElement, IconButton,
    Tab, TabList, TabPanel, TabPanels, Tabs,
    Text, VStack, useColorModeValue, useToast,
} from '@chakra-ui/react'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { setUser } from '../lib/session'

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

function PasswordInput({ value, onChange, placeholder = "Password" }) {
    const [show, setShow] = useState(false)
    return (
        <InputGroup>
            <Input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                borderRadius="xl"
            />
            <InputRightElement>
                <IconButton
                    size="sm" variant="ghost"
                    icon={show ? <FiEyeOff /> : <FiEye />}
                    aria-label="Toggle password"
                    onClick={() => setShow(s => !s)}
                />
            </InputRightElement>
        </InputGroup>
    )
}

export function Auth() {
    const navigate = useNavigate()
    const toast = useToast()
    const bg = useColorModeValue('gray.50', 'gray.900')
    const cardBg = useColorModeValue('white', 'gray.800')

    // Login form
    const [loginForm, setLoginForm] = useState({ username: '', password: '' })
    const [loginLoading, setLoginLoading] = useState(false)

    // Register form
    const [regForm, setRegForm] = useState({ username: '', password: '', confirm: '', name: '', email: '' })
    const [regLoading, setRegLoading] = useState(false)

    const handleLogin = async () => {
        if (!loginForm.username.trim() || !loginForm.password) {
            toast({ title: "Please enter username and password", status: "warning", duration: 2500, isClosable: true })
            return
        }
        setLoginLoading(true)
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginForm.username.trim().toLowerCase(), password: loginForm.password }),
            })
            if (res.status === 401) throw new Error("Invalid username or password.")
            if (!res.ok) throw new Error("Login failed. Please try again.")
            const user = await res.json()
            setUser(user)
            toast({ title: `Welcome back, ${user.username}! 👋`, status: "success", duration: 2000, isClosable: true })
            navigate('/')
        } catch (err) {
            toast({ title: err.message || "Login failed", status: "error", duration: 3000, isClosable: true })
        } finally {
            setLoginLoading(false)
        }
    }

    const handleRegister = async () => {
        if (!regForm.username.trim() || !regForm.password) {
            toast({ title: "Username and password are required", status: "warning", duration: 2500, isClosable: true })
            return
        }
        if (regForm.password !== regForm.confirm) {
            toast({ title: "Passwords do not match", status: "warning", duration: 2500, isClosable: true })
            return
        }
        if (regForm.password.length < 4) {
            toast({ title: "Password must be at least 4 characters", status: "warning", duration: 2500, isClosable: true })
            return
        }
        setRegLoading(true)
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: regForm.username.trim().toLowerCase(),
                    password: regForm.password,
                    name: regForm.name.trim() || null,
                    email: regForm.email.trim() || null,
                }),
            })
            if (res.status === 409) throw new Error("Username already taken. Try another.")
            if (!res.ok) throw new Error("Registration failed. Please try again.")
            const user = await res.json()
            setUser(user)
            toast({ title: `Account created! Welcome, ${user.username} 🎉`, status: "success", duration: 2500, isClosable: true })
            navigate('/')
        } catch (err) {
            toast({ title: err.message || "Registration failed", status: "error", duration: 3000, isClosable: true })
        } finally {
            setRegLoading(false)
        }
    }

    return (
        <Box minH="100vh" bg={bg} display="flex" alignItems="center" justifyContent="center" p={4}>
            <Box w="full" maxW="420px" bg={cardBg} borderRadius="2xl" shadow="xl" p={8}>
                <VStack spacing={1} mb={6}>
                    <Heading size="lg" fontWeight="900">🌿 Serene</Heading>
                    <Text fontSize="sm" color="gray.500">Your personal life coach</Text>
                </VStack>

                <Tabs isFitted colorScheme="teal" borderRadius="xl">
                    <TabList mb={6}>
                        <Tab fontWeight="700" borderRadius="xl">Sign In</Tab>
                        <Tab fontWeight="700" borderRadius="xl">Create Account</Tab>
                    </TabList>

                    <TabPanels>
                        {/* ── Login ── */}
                        <TabPanel p={0}>
                            <VStack spacing={4}>
                                <FormControl>
                                    <FormLabel fontWeight="700">Username</FormLabel>
                                    <Input placeholder="your_username" borderRadius="xl"
                                        value={loginForm.username}
                                        onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontWeight="700">Password</FormLabel>
                                    <PasswordInput
                                        value={loginForm.password}
                                        onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                                    />
                                </FormControl>
                                <Button w="full" colorScheme="teal" borderRadius="xl" fontWeight="800"
                                    isLoading={loginLoading} onClick={handleLogin}>
                                    Sign In
                                </Button>
                            </VStack>
                        </TabPanel>

                        {/* ── Register ── */}
                        <TabPanel p={0}>
                            <VStack spacing={4}>
                                <FormControl isRequired>
                                    <FormLabel fontWeight="700">Username</FormLabel>
                                    <Input placeholder="choose_a_username" borderRadius="xl"
                                        value={regForm.username}
                                        onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontWeight="700">Display Name <Text as="span" color="gray.400" fontWeight="400">(optional)</Text></FormLabel>
                                    <Input placeholder="Your Name" borderRadius="xl"
                                        value={regForm.name}
                                        onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontWeight="700">Email <Text as="span" color="gray.400" fontWeight="400">(optional)</Text></FormLabel>
                                    <Input type="email" placeholder="you@example.com" borderRadius="xl"
                                        value={regForm.email}
                                        onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                                    />
                                </FormControl>
                                <Divider />
                                <FormControl isRequired>
                                    <FormLabel fontWeight="700">Password</FormLabel>
                                    <PasswordInput
                                        value={regForm.password}
                                        onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                                        placeholder="Min. 4 characters"
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel fontWeight="700">Confirm Password</FormLabel>
                                    <PasswordInput
                                        value={regForm.confirm}
                                        onChange={e => setRegForm(f => ({ ...f, confirm: e.target.value }))}
                                        placeholder="Repeat password"
                                    />
                                </FormControl>
                                <Button w="full" colorScheme="teal" borderRadius="xl" fontWeight="800"
                                    isLoading={regLoading} onClick={handleRegister}>
                                    Create Account
                                </Button>
                            </VStack>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>
        </Box>
    )
}

