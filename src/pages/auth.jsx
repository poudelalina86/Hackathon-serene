import { AuthView } from '@neondatabase/neon-js/auth/react';
import { isAuthConfigured } from '../lib/auth';

export function Auth() {
    return (
        <div className="auth-container">
            {isAuthConfigured ? (
                <AuthView />
            ) : (
                <div style={{ padding: 16 }}>
                    Auth not configured. Set `VITE_NEON_AUTH_URL` to enable login.
                </div>
            )}
        </div>
    );
}
