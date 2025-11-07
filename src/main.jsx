import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import './index.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Deposit from './components/Deposit.jsx';
import Register from './components/Register.jsx';
import Login from './components/login.jsx';
import Withdraw from './components/Withdraw.jsx';


createRoot(document.getElementById('root')).render(
 <TonConnectUIProvider manifestUrl={`${window.location.origin}/manifest.json`}>


      <Router>
        <Routes>
          <Route path="/user" element={<App />} />
          <Route path="/user/deposit" element={<Deposit />} />
          <Route path="/user/register" element={<Register />} />
          <Route path="/user/login" element={<Login />} />
          <Route path='/user/withdraw' element={<Withdraw />} />
        </Routes>
      </Router>

  </TonConnectUIProvider>
);
