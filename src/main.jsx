import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react'
import { ChakraProvider } from '@chakra-ui/react'
import App from './App'
import { authClient } from './lib/auth'
import { theme } from './theme'
import './index.css'
import '@neondatabase/neon-js/ui/css'

function Providers({ children }) {
    if (!authClient) {
        return children
    }

    return (
        <NeonAuthUIProvider emailOTP authClient={authClient}>
            {children}
        </NeonAuthUIProvider>
    )
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Providers>
            <BrowserRouter>
                <ChakraProvider theme={theme}>
                    <App />
                </ChakraProvider>
            </BrowserRouter>
        </Providers>
    </React.StrictMode>,
)
