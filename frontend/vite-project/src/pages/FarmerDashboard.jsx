import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'

// ─── Constants ───
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const CROPS = [
    { name: 'Tomato', emoji: '🍅', key: 'tomato' },
    { name: 'Onion', emoji: '🧅', key: 'onion' },
    { name: 'Potato', emoji: '🥔', key: 'potato' },
    { name: 'Wheat', emoji: '🌾', key: 'wheat' },
    { name: 'Rice', emoji: '🍚', key: 'rice' },
    { name: 'Chilli', emoji: '🌶️', key: 'chilli' },
    { name: 'Carrot', emoji: '🥕', key: 'carrot' },
    { name: 'Brinjal', emoji: '🍆', key: 'brinjal' },
    { name: 'Cabbage', emoji: '🥬', key: 'cabbage' },
    { name: 'Banana', emoji: '🍌', key: 'banana' },
    { name: 'Mango', emoji: '🥭', key: 'mango' },
    { name: 'Sugarcane', emoji: '🎋', key: 'sugarcane' },
]

// ─── Custom Map Icons ───
const farmIcon = new L.DivIcon({
    html: '<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">🏡</div>',
    className: 'custom-icon', iconSize: [36, 36], iconAnchor: [18, 36],
})
const mandiIcon = new L.DivIcon({
    html: '<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">🏪</div>',
    className: 'custom-icon', iconSize: [30, 30], iconAnchor: [15, 30],
})
const bestMandiIcon = new L.DivIcon({
    html: '<div style="font-size:28px;filter:drop-shadow(0 2px 8px rgba(34,197,94,.6))">⭐</div>',
    className: 'custom-icon', iconSize: [36, 36], iconAnchor: [18, 36],
})

// ─── Helper: Move map when farm location changes ───
function MapUpdater({ center }) {
    const map = useMap()
    useEffect(() => { if (center) map.flyTo(center, 11) }, [center, map])
    return null
}

// ─── Voice Hook ───
function useVoice() {
    const [listening, setListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [supported, setSupported] = useState(false)
    const recognitionRef = useRef(null)

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SR) {
            setSupported(true)
            const rec = new SR()
            rec.continuous = false
            rec.interimResults = true
            rec.lang = 'en-IN'
            rec.onresult = (e) => {
                const t = Array.from(e.results).map(r => r[0].transcript).join('')
                setTranscript(t)
            }
            rec.onend = () => setListening(false)
            rec.onerror = () => setListening(false)
            recognitionRef.current = rec
        }
    }, [])

    const startListening = useCallback(() => {
        if (recognitionRef.current) {
            setTranscript('')
            recognitionRef.current.start()
            setListening(true)
        }
    }, [])

    const stopListening = useCallback(() => {
        if (recognitionRef.current) recognitionRef.current.stop()
        setListening(false)
    }, [])

    const speak = useCallback((text) => {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'hi-IN'
        u.rate = 0.9
        window.speechSynthesis.speak(u)
    }, [])

    return { listening, transcript, supported, startListening, stopListening, speak }
}


// ═══════════════════════════════════════════════════
//  MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════
export default function FarmerDashboard() {
    // Farm state
    const [farmLocation, setFarmLocation] = useState('')
    const [lat, setLat] = useState(12.9716)
    const [lng, setLng] = useState(77.5946)
    const [hectares, setHectares] = useState(2)
    const [selectedCrop, setSelectedCrop] = useState('tomato')
    const [setupDone, setSetupDone] = useState(false)

    // Map & data state
    const [mandis, setMandis] = useState([])
    const [selectedMandi, setSelectedMandi] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [weather, setWeather] = useState(null)
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(false)
    const [activePanel, setActivePanel] = useState('map') // map | analysis | weather

    // Voice
    const { listening, transcript, supported, startListening, stopListening, speak } = useVoice()
    const [voiceProcessing, setVoiceProcessing] = useState(false)
    const [lastVoiceResult, setLastVoiceResult] = useState(null)

    // ─── Geolocation ───
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLat(pos.coords.latitude)
                    setLng(pos.coords.longitude)
                },
                () => { /* default Bangalore */ }
            )
        }
    }, [])

    // ─── Load mandis when setup is done ───
    useEffect(() => {
        if (setupDone) fetchMandis()
    }, [setupDone, selectedCrop])

    const fetchMandis = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/farmer/mandis`, {
                params: { lat, lng, crop: selectedCrop }
            })
            setMandis(res.data.mandis || [])
        } catch {
            // Use mock data if backend is not running
            setMandis(generateMockMandis())
        }
    }

    const generateMockMandis = () => {
        const names = ['APMC Yeshwanthpur', 'KR Market', 'Binny Mill APMC', 'Chikkaballapur Mandi', 'Kolar Mandi', 'Tumkur APMC']
        return names.map((name, i) => ({
            id: i + 1, name,
            lat: lat + (Math.random() - 0.5) * 0.5,
            lng: lng + (Math.random() - 0.5) * 0.5,
            distance_km: Math.round(10 + Math.random() * 80),
            price_per_kg: Math.round(15 + Math.random() * 40),
            transport_cost: Math.round(200 + Math.random() * 1500),
            travel_time_min: Math.round(20 + Math.random() * 120),
            district: 'Karnataka'
        }))
    }

    // ─── Voice command processing ───
    useEffect(() => {
        if (!listening && transcript && transcript.length > 3) {
            processVoice(transcript)
        }
    }, [listening])

    const processVoice = async (text) => {
        setVoiceProcessing(true)
        try {
            const res = await axios.post(`${API_BASE}/api/farmer/voice`, {
                text, lat, lng, location: farmLocation
            })
            setLastVoiceResult(res.data)
            if (res.data.analysis) {
                setAnalysis(res.data.analysis)
                setAlerts(res.data.analysis.alerts || [])
                setActivePanel('analysis')
                // Speak the summary
                const spoken = res.data.analysis?.ai_recommendation?.spoken_summary
                if (spoken) speak(spoken)
            }
            if (res.data.weather) {
                setWeather(res.data.weather)
                setActivePanel('weather')
            }
        } catch {
            // Mock response
            setLastVoiceResult({ parsed_command: { action: 'sell', crop: 'tomato', quantity: 100 }, message: 'Backend offline — showing mock data' })
            speak('Backend is not connected. Showing mock data.')
        }
        setVoiceProcessing(false)
    }

    // ─── Full analysis ───
    const runAnalysis = async (crop, qty) => {
        setLoading(true)
        try {
            const res = await axios.post(`${API_BASE}/api/farmer/analyze`, {
                crop: crop || selectedCrop,
                quantity: qty || 100,
                lat, lng, location: farmLocation
            })
            setAnalysis(res.data)
            setAlerts(res.data.alerts || [])
            setActivePanel('analysis')
            const spoken = res.data?.ai_recommendation?.spoken_summary
            if (spoken) speak(spoken)
        } catch {
            setAnalysis(generateMockAnalysis(crop || selectedCrop, qty || 100))
            setActivePanel('analysis')
        }
        setLoading(false)
    }

    const fetchWeather = async () => {
        setLoading(true)
        try {
            const res = await axios.post(`${API_BASE}/api/farmer/weather`, { lat, lng, location: farmLocation })
            setWeather(res.data)
            setActivePanel('weather')
        } catch {
            setWeather({ summary: 'Partly cloudy, 28°C. Light rain expected tomorrow afternoon. Humidity 65%.', status: 'mock' })
            setActivePanel('weather')
        }
        setLoading(false)
    }

    const generateMockAnalysis = (crop, qty) => ({
        ai_recommendation: {
            recommendation: 'SELL_NOW',
            best_mandi: { name: mandis[0]?.name || 'APMC Yeshwanthpur', price_per_kg: 42, distance_km: 15, reason: 'Highest price with short distance' },
            scenarios: [
                { action: `Sell Now at ${mandis[0]?.name || 'APMC'}`, expected_revenue: qty * 42, transport_cost: 500, net_profit: qty * 42 - 500, risk_level: 'LOW', factors: ['Good current price', 'Low transport cost'] },
                { action: 'Wait 3 Days', expected_revenue: qty * 38, transport_cost: 500, net_profit: qty * 38 - 500, risk_level: 'MEDIUM', factors: ['Rain expected', 'Prices might drop'] },
                { action: 'Wait 1 Week', expected_revenue: qty * 50, transport_cost: 800, net_profit: qty * 50 - 800, risk_level: 'HIGH', factors: ['Festival demand', 'But weather uncertain'] },
            ],
            weather_impact: 'Light rain expected in 2 days. Could affect transport and cause price fluctuation.',
            price_trend: 'STABLE — Prices steady this week, slight increase expected before weekend.',
            urgent_alerts: [],
            spoken_summary: 'अभी बेचना अच्छा रहेगा। APMC में अच्छा दाम मिल रहा है।'
        },
        mandis: mandis.slice(0, 5),
        alerts: [
            { message: 'Recommendation: SELL_NOW', priority: 'info', timestamp: new Date().toISOString() }
        ],
        request: { crop, quantity: qty }
    })

    // ─── SETUP SCREEN ───
    if (!setupDone) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <Link to="/farmer" className="inline-flex items-center gap-2 mb-6 text-white/40 hover:text-white/70 transition-colors text-sm">
                            ← Back to Home
                        </Link>
                        <div className="text-5xl mb-4">🌾</div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">
                            Setup Your <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Farm</span>
                        </h1>
                        <p className="text-white/40 text-sm">Tell us about your farm to get started</p>
                    </div>

                    <div className="space-y-6">
                        {/* Location */}
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">📍 Farm Location</label>
                            <input
                                type="text"
                                value={farmLocation}
                                onChange={e => setFarmLocation(e.target.value)}
                                placeholder="e.g. Tumkur, Karnataka"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all"
                            />
                        </div>

                        {/* Lat/Lng */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Latitude</label>
                                <input type="number" step="0.0001" value={lat} onChange={e => setLat(+e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-green-500/50 focus:outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Longitude</label>
                                <input type="number" step="0.0001" value={lng} onChange={e => setLng(+e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-green-500/50 focus:outline-none transition-all" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Auto-detected from your device GPS
                        </div>

                        {/* Hectares */}
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">📐 Farm Area (Hectares)</label>
                            <input type="number" min="0.1" step="0.5" value={hectares} onChange={e => setHectares(+e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-green-500/50 focus:outline-none transition-all" />
                            <p className="text-white/30 text-xs mt-1">{(hectares * 2.471).toFixed(1)} acres</p>
                        </div>

                        {/* Crop Selection */}
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">🌱 Primary Crop</label>
                            <div className="grid grid-cols-4 gap-2">
                                {CROPS.map(c => (
                                    <button
                                        key={c.key}
                                        onClick={() => setSelectedCrop(c.key)}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs
                      ${selectedCrop === c.key
                                                ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-lg shadow-green-500/10'
                                                : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:border-white/20 hover:bg-white/5'}`}
                                    >
                                        <span className="text-xl">{c.emoji}</span>
                                        <span>{c.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={() => setSetupDone(true)}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-lg hover:shadow-2xl hover:shadow-green-500/25 transition-all active:scale-[0.98]"
                        >
                            🚀 Enter Dashboard
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ─── MAIN DASHBOARD ───
    const bestMandi = mandis.length > 0 ? mandis.reduce((a, b) => a.price_per_kg > b.price_per_kg ? a : b) : null

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* ─── TOP BAR ─── */}
            <nav className="sticky top-0 z-[1000] bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/farmer" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm">🌾</div>
                            <span className="text-sm font-semibold">FoodChain <span className="text-green-400">Farmer</span></span>
                        </Link>
                        <span className="text-white/20">|</span>
                        <span className="text-xs text-white/40">{farmLocation || `${lat.toFixed(2)}, ${lng.toFixed(2)}`}</span>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-semibold uppercase tracking-wider">
                            {CROPS.find(c => c.key === selectedCrop)?.emoji} {selectedCrop}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Alert badge */}
                        {alerts.length > 0 && (
                            <div className="relative">
                                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                    🔔
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center">{alerts.length}</span>
                                </button>
                            </div>
                        )}
                        {/* Google Translate placeholder */}
                        <div id="google_translate_element" className="scale-[0.8] origin-right"></div>
                    </div>
                </div>
            </nav>

            <div className="max-w-[1800px] mx-auto p-4">
                <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 80px)' }}>

                    {/* ═══ LEFT SIDEBAR — Voice + Quick Actions ═══ */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">

                        {/* Voice Input Card */}
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">🎙️ Voice Command</h3>

                            {/* Mic Button */}
                            <div className="flex flex-col items-center gap-3 mb-4">
                                <button
                                    onClick={listening ? stopListening : startListening}
                                    disabled={!supported || voiceProcessing}
                                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
                    ${listening
                                            ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] scale-110 animate-pulse'
                                            : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105'
                                        } ${voiceProcessing ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    <span className="text-3xl">{listening ? '⏹' : voiceProcessing ? '⏳' : '🎤'}</span>
                                </button>
                                <p className="text-xs text-white/40 text-center">
                                    {listening ? 'Listening... Speak now' : voiceProcessing ? 'Processing...' : 'Tap to speak'}
                                </p>
                                {!supported && <p className="text-xs text-red-400">Voice not supported in this browser</p>}
                            </div>

                            {/* Transcript */}
                            {transcript && (
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 mb-3">
                                    "{transcript}"
                                </div>
                            )}

                            {/* Voice Result */}
                            {lastVoiceResult?.parsed_command && (
                                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs space-y-1">
                                    <div className="text-green-400 font-semibold">✅ Understood</div>
                                    <div className="text-white/60">Action: <span className="text-white">{lastVoiceResult.parsed_command.action}</span></div>
                                    {lastVoiceResult.parsed_command.crop && <div className="text-white/60">Crop: <span className="text-white">{lastVoiceResult.parsed_command.crop}</span></div>}
                                    {lastVoiceResult.parsed_command.quantity && <div className="text-white/60">Qty: <span className="text-white">{lastVoiceResult.parsed_command.quantity} kg</span></div>}
                                </div>
                            )}

                            {/* Quick voice suggestions */}
                            <div className="mt-4 space-y-2">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider">Try saying:</p>
                                {['Sell 100kg tomato', 'Check weather', 'Check onion price'].map(s => (
                                    <button key={s} onClick={() => processVoice(s)}
                                        className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 hover:text-white hover:bg-white/[0.06] transition-all">
                                        🗣 "{s}"
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">⚡ Quick Actions</h3>
                            <div className="space-y-2">
                                <button onClick={() => runAnalysis(selectedCrop, 100)} disabled={loading}
                                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/20 text-sm text-green-400 font-medium hover:bg-green-500/30 transition-all text-left flex items-center gap-2">
                                    📊 Analyze Best Sell Options
                                </button>
                                <button onClick={fetchWeather} disabled={loading}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-all text-left flex items-center gap-2">
                                    🌦️ Check Weather
                                </button>
                                <button onClick={() => { setSetupDone(false); setAnalysis(null); setMandis([]); }}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-all text-left flex items-center gap-2">
                                    ⚙️ Change Farm Settings
                                </button>
                            </div>
                        </div>

                        {/* Alerts */}
                        {alerts.length > 0 && (
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">🔔 Alerts</h3>
                                <div className="space-y-2">
                                    {alerts.map((a, i) => (
                                        <div key={i} className={`p-3 rounded-xl border text-xs ${a.priority === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                                                a.priority === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' :
                                                    'bg-blue-500/10 border-blue-500/30 text-blue-300'
                                            }`}>
                                            <span className="mr-1">{a.priority === 'critical' ? '🔴' : a.priority === 'warning' ? '🟡' : '🟢'}</span>
                                            {a.message}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Farm Info Card */}
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">🏡 Farm Info</h3>
                            <div className="space-y-2 text-xs text-white/50">
                                <div className="flex justify-between"><span>Location</span><span className="text-white/80">{farmLocation || 'GPS'}</span></div>
                                <div className="flex justify-between"><span>Coordinates</span><span className="text-white/80">{lat.toFixed(4)}, {lng.toFixed(4)}</span></div>
                                <div className="flex justify-between"><span>Area</span><span className="text-white/80">{hectares} ha ({(hectares * 2.471).toFixed(1)} acres)</span></div>
                                <div className="flex justify-between"><span>Primary Crop</span><span className="text-white/80">{CROPS.find(c => c.key === selectedCrop)?.emoji} {selectedCrop}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ CENTER — MAP ═══ */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                        {/* Tab bar */}
                        <div className="flex gap-2">
                            {[
                                { key: 'map', label: '🗺️ Map', },
                                { key: 'analysis', label: '📊 Analysis' },
                                { key: 'weather', label: '🌦️ Weather' },
                            ].map(t => (
                                <button key={t.key} onClick={() => setActivePanel(t.key)}
                                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activePanel === t.key
                                            ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                                            : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white'}`}>
                                    {t.label}
                                </button>
                            ))}
                            {loading && <span className="flex items-center text-xs text-green-400 ml-2 animate-pulse">⏳ Loading...</span>}
                        </div>

                        {/* Map Panel */}
                        {activePanel === 'map' && (
                            <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.06] relative" style={{ minHeight: 400 }}>
                                <MapContainer center={[lat, lng]} zoom={11} style={{ height: '100%', width: '100%' }}
                                    zoomControl={false} attributionControl={false}>
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                    <MapUpdater center={[lat, lng]} />

                                    {/* Farm marker */}
                                    <Marker position={[lat, lng]} icon={farmIcon}>
                                        <Popup><b>🏡 Your Farm</b><br />{farmLocation}<br />{hectares} hectares</Popup>
                                    </Marker>
                                    <Circle center={[lat, lng]} radius={hectares * 100} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.1, weight: 1 }} />

                                    {/* Mandi markers */}
                                    {mandis.map(m => (
                                        <Marker key={m.id} position={[m.lat, m.lng]}
                                            icon={bestMandi && m.id === bestMandi.id ? bestMandiIcon : mandiIcon}
                                            eventHandlers={{ click: () => setSelectedMandi(m) }}>
                                            <Popup>
                                                <div style={{ color: '#0a0a0a', fontSize: 12 }}>
                                                    <b>{m.name}</b><br />
                                                    ₹{m.price_per_kg}/kg<br />
                                                    {m.distance_km} km away<br />
                                                    ~{m.travel_time_min} min
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}

                                    {/* Route to selected mandi */}
                                    {selectedMandi && (
                                        <Polyline positions={[[lat, lng], [selectedMandi.lat, selectedMandi.lng]]}
                                            pathOptions={{ color: '#22c55e', weight: 3, dashArray: '10, 8', opacity: 0.7 }} />
                                    )}
                                </MapContainer>

                                {/* Map overlay info */}
                                <div className="absolute bottom-4 left-4 right-4 z-[500] flex gap-2 flex-wrap">
                                    <div className="px-3 py-2 rounded-lg bg-[#0a0a0a]/80 backdrop-blur-lg border border-white/10 text-xs text-white/70">
                                        📍 {mandis.length} mandis found nearby
                                    </div>
                                    {bestMandi && (
                                        <div className="px-3 py-2 rounded-lg bg-green-500/20 backdrop-blur-lg border border-green-500/30 text-xs text-green-300">
                                            ⭐ Best: {bestMandi.name} — ₹{bestMandi.price_per_kg}/kg
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Analysis Panel */}
                        {activePanel === 'analysis' && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                                {analysis ? (
                                    <>
                                        {/* Recommendation Badge */}
                                        <div className={`p-5 rounded-2xl border ${analysis.ai_recommendation?.recommendation === 'SELL_NOW'
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-3xl">{analysis.ai_recommendation?.recommendation === 'SELL_NOW' ? '✅' : '⏳'}</span>
                                                <div>
                                                    <div className="text-lg font-bold">{analysis.ai_recommendation?.recommendation === 'SELL_NOW' ? 'Sell Now!' : 'Wait'}</div>
                                                    <div className="text-xs text-white/50">{analysis.request?.quantity}kg {analysis.request?.crop}</div>
                                                </div>
                                            </div>
                                            {analysis.ai_recommendation?.best_mandi && (
                                                <div className="mt-3 p-3 rounded-xl bg-white/5 text-sm">
                                                    <span className="text-white/50">Best Mandi: </span>
                                                    <span className="text-green-400 font-semibold">{analysis.ai_recommendation.best_mandi.name}</span>
                                                    <span className="text-white/50"> — ₹{analysis.ai_recommendation.best_mandi.price_per_kg}/kg</span>
                                                    <div className="text-xs text-white/40 mt-1">{analysis.ai_recommendation.best_mandi.reason}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Scenario Cards */}
                                        {analysis.ai_recommendation?.scenarios && (
                                            <div>
                                                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">📊 Trade-off Scenarios</h4>
                                                <div className="space-y-3">
                                                    {analysis.ai_recommendation.scenarios.map((s, i) => (
                                                        <div key={i} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-sm font-semibold">{s.action}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.risk_level === 'LOW' ? 'bg-green-500/20 text-green-400' :
                                                                        s.risk_level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                            'bg-red-500/20 text-red-400'}`}>
                                                                    {s.risk_level} RISK
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3 text-xs">
                                                                <div>
                                                                    <div className="text-white/40">Revenue</div>
                                                                    <div className="text-white font-semibold">₹{s.expected_revenue?.toLocaleString()}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-white/40">Transport</div>
                                                                    <div className="text-red-400">-₹{s.transport_cost?.toLocaleString()}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-white/40">Net Profit</div>
                                                                    <div className="text-green-400 font-bold">₹{s.net_profit?.toLocaleString()}</div>
                                                                </div>
                                                            </div>
                                                            {s.factors && (
                                                                <div className="mt-2 flex flex-wrap gap-1">
                                                                    {s.factors.map((f, j) => (
                                                                        <span key={j} className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/40">{f}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Weather Impact */}
                                        {analysis.ai_recommendation?.weather_impact && (
                                            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                                                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">🌦️ Weather Impact</h4>
                                                <p className="text-sm text-white/60">{analysis.ai_recommendation.weather_impact}</p>
                                            </div>
                                        )}

                                        {/* Price Trend */}
                                        {analysis.ai_recommendation?.price_trend && (
                                            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                                                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">📈 Price Trend</h4>
                                                <p className="text-sm text-white/60">{analysis.ai_recommendation.price_trend}</p>
                                            </div>
                                        )}

                                        {/* Market info */}
                                        {analysis.market_info?.summary && (
                                            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                                                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">📰 Market Intel</h4>
                                                <p className="text-sm text-white/60">{analysis.market_info.summary}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
                                        <div className="text-center">
                                            <div className="text-4xl mb-3">📊</div>
                                            <p>No analysis yet.</p>
                                            <p className="text-xs mt-1">Use voice or click "Analyze" to get started.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Weather Panel */}
                        {activePanel === 'weather' && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {weather ? (
                                    <div className="space-y-4">
                                        <div className="p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="text-4xl">🌤️</span>
                                                <div>
                                                    <h3 className="text-lg font-bold">Weather Report</h3>
                                                    <p className="text-xs text-white/40">{farmLocation || `${lat.toFixed(2)}, ${lng.toFixed(2)}`}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-white/70 leading-relaxed">{weather.summary}</p>
                                        </div>
                                        {weather.sources?.length > 0 && (
                                            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                                                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Sources</h4>
                                                {weather.sources.map((s, i) => (
                                                    <div key={i} className="mb-2 text-xs">
                                                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{s.title}</a>
                                                        <p className="text-white/30 mt-0.5">{s.snippet}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-white/30 text-sm h-64">
                                        <div className="text-center">
                                            <div className="text-4xl mb-3">🌦️</div>
                                            <p>Click "Check Weather" to load weather data</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ═══ RIGHT SIDEBAR — Mandi List ═══ */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">🏪 Nearby Mandis</h3>
                                <span className="text-[10px] text-white/30">{CROPS.find(c => c.key === selectedCrop)?.emoji} {selectedCrop} prices</span>
                            </div>

                            <div className="space-y-3">
                                {mandis.map((m, i) => (
                                    <button key={m.id}
                                        onClick={() => { setSelectedMandi(m); setActivePanel('map'); }}
                                        className={`w-full text-left p-4 rounded-xl border transition-all hover:-translate-y-0.5 ${selectedMandi?.id === m.id
                                                ? 'bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/5'
                                                : bestMandi?.id === m.id
                                                    ? 'bg-green-500/5 border-green-500/20'
                                                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                                            }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {bestMandi?.id === m.id && <span className="text-xs">⭐</span>}
                                                <span className="text-sm font-semibold">{m.name}</span>
                                            </div>
                                            <span className="text-lg font-black text-green-400">₹{m.price_per_kg}</span>
                                        </div>
                                        <div className="flex gap-4 text-xs text-white/40">
                                            <span>📏 {m.distance_km} km</span>
                                            <span>🕐 {m.travel_time_min} min</span>
                                            <span>🚛 ₹{m.transport_cost}</span>
                                        </div>
                                        {/* Net profit bar */}
                                        <div className="mt-2">
                                            <div className="flex justify-between text-[10px] text-white/30 mb-1">
                                                <span>Net for 100kg</span>
                                                <span className="text-green-400/70">₹{(m.price_per_kg * 100 - m.transport_cost).toLocaleString()}</span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                                                    style={{ width: `${Math.min(100, ((m.price_per_kg * 100 - m.transport_cost) / (bestMandi ? bestMandi.price_per_kg * 100 - bestMandi.transport_cost : 1)) * 100)}%` }} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sell Quick Panel */}
                        <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent p-5">
                            <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-4">💰 Quick Sell Analysis</h3>
                            <div className="flex gap-2 mb-3">
                                <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500/50">
                                    {CROPS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.name}</option>)}
                                </select>
                                <input type="number" defaultValue={100} id="qty-input" min={1}
                                    className="w-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500/50"
                                    placeholder="Kg" />
                            </div>
                            <button
                                onClick={() => {
                                    const qty = document.getElementById('qty-input')?.value || 100
                                    runAnalysis(selectedCrop, +qty)
                                }}
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-sm hover:shadow-lg hover:shadow-green-500/20 transition-all active:scale-[0.98] disabled:opacity-50">
                                {loading ? '⏳ Analyzing...' : '🔍 Find Best Deal'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Google Translate init script */}
            <script dangerouslySetInnerHTML={{
                __html: `
          function googleTranslateElementInit() {
            new google.translate.TranslateElement({pageLanguage: 'en', includedLanguages: 'hi,te,ta,kn,mr,bn,gu,pa,ml', layout: google.translate.TranslateElement.InlineLayout.SIMPLE}, 'google_translate_element');
          }
        `
            }} />
        </div>
    )
}
