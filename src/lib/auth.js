import { createAuthClient } from '@neondatabase/neon-js/auth';

const getNeonAuthURL = () =>
    import.meta.env["VITE_NEON_AUTH_URL"] ||
    import.meta.env["VITE_X_d1c2b3a4_5e6f_4a7b_8c9d_0e1f2a3b4c5d"];

const neonAuthURL = getNeonAuthURL();

export const authClient = neonAuthURL ? createAuthClient(neonAuthURL) : null;
export const isAuthConfigured = Boolean(neonAuthURL);
