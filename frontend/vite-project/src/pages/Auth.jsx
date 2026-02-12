import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Phone, MapPin, Globe, ChevronRight, Loader } from 'lucide-react';
import api from '../services/api';

// --- Role-Based Theme Configuration ---
const ROLE_THEMES = {
    farmer: {
        primary: '#22c55e',
        secondary: '#10b981',
        light: '#4ade80',
        gradientFrom: '#22c55e',
        gradientTo: '#10b981',
        glow: 'rgba(34, 197, 94, 0.2)',
        name: 'Farmer'
    },
    mandi_owner: {
        primary: '#f97316',
        secondary: '#f59e0b',
        light: '#fb923c',
        gradientFrom: '#f97316',
        gradientTo: '#f59e0b',
        glow: 'rgba(249, 115, 22, 0.2)',
        name: 'Mandi'
    },
    retailer: {
        primary: '#14b8a6',
        secondary: '#06b6d4',
        light: '#2dd4bf',
        gradientFrom: '#14b8a6',
        gradientTo: '#06b6d4',
        glow: 'rgba(20, 184, 166, 0.2)',
        name: 'Retail'
    }
};

// --- Components ---
const GlassInput = ({ icon: Icon, theme, ...props }) => (
    <div className="relative group mb-4">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-slate-400 transition-colors duration-300" />
        </div>
        <input
            {...props}
            className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-slate-700/50 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 backdrop-blur-xl transition-all duration-300 hover:bg-white/10"
            style={{ '--tw-ring-color': theme.glow }}
        />
    </div>
);

const GlassSelect = ({ icon: Icon, children, theme, ...props }) => (
    <div className="relative group mb-4 w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {Icon && <Icon className="h-5 w-5 text-slate-400 transition-colors duration-300" />}
        </div>
        <select
            {...props}
            className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-slate-700/50 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 backdrop-blur-xl transition-all duration-300 appearance-none hover:bg-white/10 cursor-pointer"
        >
            {children}
        </select>
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <ChevronRight className="h-4 w-4 text-slate-500 rotate-90" />
        </div>
    </div>
);

const PrimaryButton = ({ children, isLoading, theme, ...props }) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm tracking-wide border shadow-lg flex items-center justify-center gap-2 transition-all duration-300"
        style={{
            background: `linear-gradient(to right, ${theme.gradientFrom}, ${theme.gradientTo})`,
            borderColor: `${theme.primary}40`,
            boxShadow: `0 0 20px ${theme.glow}`,
        }}
        disabled={isLoading}
        {...props}
    >
        {isLoading && <Loader className="animate-spin h-4 w-4" />}
        {children}
    </motion.button>
);

const ParticleBackground = ({ theme }) => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#11243E]" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ backgroundColor: theme.glow }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[100px]" style={{ backgroundColor: theme.glow, opacity: 0.5 }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                    backgroundColor: theme.glow,
                    width: Math.random() * 4 + 1 + 'px',
                    height: Math.random() * 4 + 1 + 'px',
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                }}
                animate={{ y: [0, -100, 0], opacity: [0, 1, 0] }}
                transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: "linear" }}
            />
        ))}
    </div>
);

const Auth = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLogin, setIsLogin] = useState(location.pathname === '/login');

    useEffect(() => {
        setIsLogin(location.pathname === '/login');
    }, [location.pathname]);

    const toggleAuthMode = () => {
        const newMode = !isLogin;
        setIsLogin(newMode);
        navigate(newMode ? '/login' : '/register');
    };

    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [registerData, setRegisterData] = useState({
        username: '', password: '', role: 'farmer', contact: '',
        latitude: 0, longitude: 0, language: 'English',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationStatus, setLocationStatus] = useState('Detecting location...');

    const currentTheme = useMemo(() => ROLE_THEMES[registerData.role] || ROLE_THEMES.farmer, [registerData.role]);

    const handleLoginChange = (e) => setLoginData({ ...loginData, [e.target.name]: e.target.value });
    const handleRegisterChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });

    useEffect(() => {
        if (!isLogin && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setRegisterData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                    setLocationStatus('Location secured');
                },
                () => setLocationStatus('Location default (0,0)')
            );
        }
    }, [isLogin]);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/login', loginData);
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('user', JSON.stringify(res.data));
            const role = res.data.role;
            navigate(role === 'farmer' ? '/farmer' : role === 'mandi_owner' ? '/mandi' : role === 'retailer' ? '/retailer' : '/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/register', { ...registerData, latitude: parseFloat(registerData.latitude), longitude: parseFloat(registerData.longitude) });
            setIsLogin(true);
            navigate('/login');
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : (detail || 'Registration failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden bg-[#0F172A] text-slate-200">
            <ParticleBackground theme={currentTheme} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative w-full max-w-[1000px] h-[600px] bg-white/5 backdrop-blur-[20px] rounded-[30px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden flex"
            >
                <div className="absolute inset-0 flex">
                    <motion.div
                        initial={false}
                        animate={{ x: isLogin ? '0%' : '100%' }}
                        transition={{ type: "spring", stiffness: 200, damping: 30 }}
                        className="w-1/2 h-full absolute left-0 z-20 overflow-hidden bg-slate-900/50 backdrop-blur-md border-r border-white/5"
                    >
                        <div className="relative w-[200%] h-full flex left-0" style={{ transform: isLogin ? 'translateX(0%)' : 'translateX(-50%)', transition: 'transform 0.5s ease' }}>
                            <div className="w-1/2 h-full flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom right, ${currentTheme.primary}33, ${currentTheme.secondary}20)` }} />
                                <div className="relative z-10">
                                    <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">SupplyChain AI</h2>
                                    <p className="text-slate-300 mb-8 leading-relaxed">Empowering logistics with AI-driven insights.</p>
                                    <div className="w-24 h-1 rounded-full mx-auto opacity-50" style={{ backgroundColor: currentTheme.primary }} />
                                </div>
                            </div>
                            <div className="w-1/2 h-full flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom left, ${currentTheme.secondary}33, ${currentTheme.primary}20)` }} />
                                <div className="relative z-10">
                                    <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Join the Network</h2>
                                    <p className="text-slate-300 mb-8 leading-relaxed">Access advanced market insights and seamless trade execution.</p>
                                    <div className="w-24 h-1 rounded-full mx-auto opacity-50" style={{ backgroundColor: currentTheme.secondary }} />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <div className={`w-1/2 h-full absolute right-0 flex flex-col justify-center p-12 transition-opacity duration-500 ${isLogin ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                        <div className="max-w-xs mx-auto w-full">
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-slate-400 text-sm mb-8">Enter your credentials to access your dashboard.</p>
                            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">{error}</div>}
                            <form onSubmit={handleLoginSubmit}>
                                <GlassInput icon={User} theme={currentTheme} name="username" placeholder="Username" value={loginData.username} onChange={handleLoginChange} required />
                                <GlassInput icon={Lock} theme={currentTheme} type="password" name="password" placeholder="Password" value={loginData.password} onChange={handleLoginChange} required />
                                <div className="flex items-center justify-between mb-6 text-xs text-slate-400">
                                    <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300">
                                        <input type="checkbox" className="rounded border-slate-600 bg-slate-800 focus:ring-offset-0" style={{ color: currentTheme.primary }} />
                                        Remember me
                                    </label>
                                    <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: currentTheme.light }}>Forgot password?</a>
                                </div>
                                <PrimaryButton type="submit" theme={currentTheme} isLoading={loading}>Sign In</PrimaryButton>
                            </form>
                            <p className="mt-8 text-center text-xs text-slate-500">
                                Don't have an account? <button onClick={toggleAuthMode} className="font-medium ml-1 hover:opacity-80 transition-opacity" style={{ color: currentTheme.light }}>Create one</button>
                            </p>
                        </div>
                    </div>

                    <div className={`w-1/2 h-full absolute left-0 flex flex-col justify-center p-12 transition-opacity duration-500 ${!isLogin ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                        <div className="max-w-xs mx-auto w-full">
                            <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
                            <p className="text-slate-400 text-sm mb-6">Join the ecosystem today.</p>
                            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">{error}</div>}
                            <form onSubmit={handleRegisterSubmit} className="space-y-3">
                                <GlassInput icon={User} theme={currentTheme} name="username" placeholder="Username" value={registerData.username} onChange={handleRegisterChange} required />
                                <GlassInput icon={Lock} theme={currentTheme} type="password" name="password" placeholder="Password" value={registerData.password} onChange={handleRegisterChange} required />
                                <div className="flex gap-3">
                                    <GlassSelect icon={Globe} theme={currentTheme} name="role" value={registerData.role} onChange={handleRegisterChange}>
                                        <option value="farmer" className="bg-slate-800">Farmer</option>
                                        <option value="mandi_owner" className="bg-slate-800">Mandi</option>
                                        <option value="retailer" className="bg-slate-800">Retailer</option>
                                    </GlassSelect>
                                    <GlassSelect theme={currentTheme} name="language" value={registerData.language} onChange={handleRegisterChange}>
                                        <option value="English" className="bg-slate-800">EN</option>
                                        <option value="Hindi" className="bg-slate-800">HI</option>
                                        <option value="Kannada" className="bg-slate-800">KN</option>
                                    </GlassSelect>
                                </div>
                                <GlassInput icon={Phone} theme={currentTheme} name="contact" placeholder="Phone" value={registerData.contact} onChange={handleRegisterChange} />
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
                                    <MapPin className="h-3 w-3" style={{ color: currentTheme.primary }} /> {locationStatus}
                                </div>
                                <PrimaryButton type="submit" theme={currentTheme} isLoading={loading}>Create Account</PrimaryButton>
                            </form>
                            <p className="mt-6 text-center text-xs text-slate-500">
                                Already a member? <button onClick={toggleAuthMode} className="font-medium ml-1 hover:opacity-80 transition-opacity" style={{ color: currentTheme.light }}>Sign in</button>
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
