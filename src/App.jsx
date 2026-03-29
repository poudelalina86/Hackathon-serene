import { Navigate, Route, Routes } from 'react-router-dom';
import { Account } from './pages/account';
import { Auth } from './pages/auth';
import { Admin } from './pages/admin';
import { Chat } from './pages/chat';
import { Blog } from './pages/blog';
import { isLoggedIn } from './lib/session';

/** Redirect to /login when the user is not authenticated. */
function ProtectedRoute({ element }) {
    return isLoggedIn() ? element : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute element={<Chat />} />} />
            <Route path="/blog" element={<ProtectedRoute element={<Blog />} />} />
            <Route path="/admin" element={<ProtectedRoute element={<Admin />} />} />
            <Route path="/auth/:pathname" element={<Auth />} />
            <Route path="/account/:pathname" element={<ProtectedRoute element={<Account />} />} />
            <Route path="*" element={<div>404 - Not Found</div>} />
        </Routes>
    );
}
