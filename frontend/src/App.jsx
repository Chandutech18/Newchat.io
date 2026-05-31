import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const { user } = useSelector((state) => state.auth);

  return (
    <Router>
      <div className="App font-sans antialiased bg-gray-50 text-gray-900 min-h-screen">
        <Routes>
          <Route path="/" element={user ? <ChatPage /> : <Navigate to="/login" />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
          <Route path="/u/:username" element={<ProfilePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
