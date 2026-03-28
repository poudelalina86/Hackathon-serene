import { AccountView } from '@neondatabase/neon-js/auth/react';
import { isAuthConfigured } from '../lib/auth';

export function Account() {
    return (
        <div className="account-container">
            {isAuthConfigured ? (
                <AccountView />
            ) : (
                <div style={{ padding: 16 }}>
                    Account not configured. Set `VITE_NEON_AUTH_URL` to enable account view.
                </div>
            )}
        </div>
    );
}
