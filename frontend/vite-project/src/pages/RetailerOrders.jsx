import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Plus, Package, TrendingUp, AlertTriangle, Clock,
    Eye, Edit, Trash2, Download, ChevronDown, X
} from 'lucide-react';
import api from '../services/api';

// Retailer theme colors (teal/cyan)
const THEME = {
    primary: '#14b8a6',
    secondary: '#06b6d4',
    light: '#2dd4bf',
    glow: 'rgba(20, 184, 166, 0.15)',
};

// Utility function for quantity-based styling
const getQuantityStyle = (quantity) => {
    if (quantity < 10) return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Low' };
    if (quantity <= 50) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', label: 'Moderate' };
    return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: 'Sufficient' };
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl"
        style={{
            background: `linear-gradient(135deg, ${THEME.primary}08, transparent)`,
        }}
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-slate-400 mb-1">{label}</p>
                <motion.p
                    className="text-3xl font-bold text-white"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: delay + 0.2 }}
                >
                    {value}
                </motion.p>
            </div>
            <div
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${THEME.primary}15` }}
            >
                <Icon className="w-6 h-6" style={{ color: THEME.primary }} />
            </div>
        </div>
        <div
            className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
            style={{ background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.secondary})` }}
        />
    </motion.div>
);

// Table Row Component
const TableRow = ({ item, index, onEdit, onDelete, onView }) => {
    const quantityStyle = getQuantityStyle(item.quantity);
    const status = quantityStyle.label;

    return (
        <motion.tr
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="border-b border-white/5 hover:bg-teal-500/5 transition-all duration-200"
        >
            <td className="px-6 py-4 text-sm text-slate-300">#{item.id}</td>
            <td className="px-6 py-4 text-sm text-white font-medium">Retailer {item.retailer_id}</td>
            <td className="px-6 py-4 text-sm text-white font-semibold">{item.item || item.name}</td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${quantityStyle.bg} ${quantityStyle.text} border ${quantityStyle.border}`}>
                    {item.quantity}
                </span>
            </td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${quantityStyle.bg} ${quantityStyle.text}`}>
                    {status}
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.1, boxShadow: `0 0 12px ${THEME.glow}` }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onView(item)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 transition-all"
                        title="View"
                    >
                        <Eye className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1, boxShadow: `0 0 12px ${THEME.glow}` }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onEdit(item)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 transition-all"
                        title="Edit"
                    >
                        <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1, boxShadow: '0 0 12px rgba(239, 68, 68, 0.2)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onDelete(item)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </motion.button>
                </div>
            </td>
        </motion.tr>
    );
};

// Mobile Card Component
const MobileCard = ({ item, onEdit, onDelete, onView }) => {
    const quantityStyle = getQuantityStyle(item.quantity);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-4 backdrop-blur-xl"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs text-slate-500 mb-1">Order #{item.id}</p>
                    <h3 className="text-lg font-bold text-white">{item.item || item.name}</h3>
                    <p className="text-sm text-slate-400">Retailer {item.retailer_id}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${quantityStyle.bg} ${quantityStyle.text}`}>
                    {quantityStyle.label}
                </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${quantityStyle.bg} ${quantityStyle.text} border ${quantityStyle.border}`}>
                    Qty: {item.quantity}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => onView(item)} className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                        <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(item)} className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                        <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item)} className="p-2 rounded-lg bg-red-500/10 text-red-400">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const RetailerOrders = () => {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Fetch data from API
    useEffect(() => {
        const fetchItems = async () => {
            try {
                setLoading(true);
                const response = await api.get('/retailer/items');
                setItems(response.data);
                setFilteredItems(response.data);
            } catch (error) {
                console.error('Error fetching items:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    // Search and filter logic
    useEffect(() => {
        let result = [...items];

        // Apply search
        if (searchQuery) {
            result = result.filter(item =>
                (item.item || item.name).toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply filter
        if (activeFilter === 'Low Stock') {
            result = result.filter(item => item.quantity < 10);
        } else if (activeFilter === 'High Quantity') {
            result = result.filter(item => item.quantity > 50);
        } else if (activeFilter === 'Recent') {
            result = result.sort((a, b) => b.id - a.id).slice(0, 10);
        }

        setFilteredItems(result);
    }, [searchQuery, activeFilter, items]);

    // Stats calculations
    const stats = {
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        lowStock: items.filter(item => item.quantity < 10).length,
        recentlyAdded: items.slice(-5).length,
    };

    // Action handlers (placeholders)
    const handleView = (item) => console.log('View:', item);
    const handleEdit = (item) => console.log('Edit:', item);
    const handleDelete = (item) => console.log('Delete:', item);
    const handleAddNew = () => console.log('Add new item');

    const filters = ['All', 'Low Stock', 'High Quantity', 'Recent'];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ backgroundColor: `${THEME.primary}10` }} />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px]" style={{ backgroundColor: `${THEME.secondary}08` }} />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Retailer Orders</h1>
                    <p className="text-slate-400 text-lg">Track and manage your inventory in real-time</p>
                </motion.div>

                {/* Action Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col md:flex-row gap-4 mb-8"
                >
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by item name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-teal-500/50 backdrop-blur-xl transition-all"
                            style={{ '--tw-ring-color': THEME.glow }}
                        />
                    </div>

                    {/* Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all backdrop-blur-xl"
                        >
                            <Filter className="w-5 h-5" />
                            <span>{activeFilter}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showFilterMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full mt-2 right-0 w-48 bg-slate-900/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl z-20"
                                >
                                    {filters.map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => { setActiveFilter(filter); setShowFilterMenu(false); }}
                                            className={`w-full px-4 py-3 text-left hover:bg-teal-500/10 transition-all ${activeFilter === filter ? 'bg-teal-500/20 text-teal-400' : 'text-slate-300'}`}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Add New Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white shadow-lg transition-all"
                        style={{
                            background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
                            boxShadow: `0 4px 20px ${THEME.glow}`,
                        }}
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline">Add New Item</span>
                        <span className="md:hidden">Add</span>
                    </motion.button>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard icon={Package} label="Total Items" value={stats.totalItems} delay={0.2} />
                    <StatCard icon={TrendingUp} label="Total Quantity" value={stats.totalQuantity} delay={0.25} />
                    <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} delay={0.3} />
                    <StatCard icon={Clock} label="Recently Added" value={stats.recentlyAdded} delay={0.35} />
                </div>

                {/* Active Filter Chip */}
                {activeFilter !== 'All' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 mb-4"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full text-sm text-teal-400">
                            <Filter className="w-4 h-4" />
                            {activeFilter}
                            <button onClick={() => setActiveFilter('All')} className="hover:bg-teal-500/20 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    </motion.div>
                )}

                {/* Table - Desktop */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="hidden md:block rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-xl"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 sticky top-0 backdrop-blur-xl z-10">
                                <tr className="border-b border-white/10">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Order ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Retailer Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Item Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                                Loading orders...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                            No items found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item, index) => (
                                        <TableRow
                                            key={item.id}
                                            item={item}
                                            index={index}
                                            onView={handleView}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Mobile Cards */}
                <div className="md:hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                Loading orders...
                            </div>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">No items found</div>
                    ) : (
                        filteredItems.map(item => (
                            <MobileCard
                                key={item.id}
                                item={item}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>

                {/* Export Button (Bottom Right) */}
                <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="fixed bottom-8 right-8 p-4 rounded-full shadow-2xl backdrop-blur-xl border border-white/10"
                    style={{
                        background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
                        boxShadow: `0 8px 32px ${THEME.glow}`,
                    }}
                    title="Export CSV"
                >
                    <Download className="w-6 h-6 text-white" />
                </motion.button>
            </div>
        </div>
    );
};

export default RetailerOrders;
