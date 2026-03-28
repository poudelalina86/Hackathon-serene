import { Route, Routes } from 'react-router-dom';
import { Account } from './pages/account';
import { Auth } from './pages/auth';
import { Admin } from './pages/admin';
import { Chat } from './pages/chat';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth/:pathname" element={<Auth />} />
            <Route path="/account/:pathname" element={<Account />} />
            <Route path="*" element={<div>404 - Not Found</div>} />
        </Routes>
    );
}
