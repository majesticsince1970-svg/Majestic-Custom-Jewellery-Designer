import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DesignRequest, ProductType } from '../types';
import { Search, Filter, Calendar, Sparkles, ChevronRight, CircleDot, ArrowRight, Loader2, Gem } from 'lucide-react';

export const History: React.FC = () => {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('design_requests')
        .select('*, profiles(full_name, role), design_variations(id, status, image_path)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    // Filter product
    if (productFilter !== 'all' && r.product_type !== productFilter) {
      return false;
    }
    // Search by name or staff
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const nameMatch =
        (r.name_en && r.name_en.toLowerCase().includes(term)) ||
        (r.name_ar && r.name_ar.includes(term)) ||
        (r.name2_en && r.name2_en.toLowerCase().includes(term)) ||
        (r.notes && r.notes.toLowerCase().includes(term)) ||
        (r.profiles?.full_name && r.profiles.full_name.toLowerCase().includes(term));
      return nameMatch;
    }
    return true;
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-majestic-200 pb-6">
        <div>
          <span className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-majestic-100 text-majestic-900 border border-majestic-300">
            Showroom Archive
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 mt-2">
            Design Requests & History
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Browse, re-open, and download past jewellery concepts created across showroom counters.
          </p>
        </div>

        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-majestic-600 hover:bg-majestic-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all shrink-0 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" /> New Design Concept
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-majestic-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, staff or notes..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:border-majestic-500 text-xs outline-none font-medium"
          />
        </div>

        {/* Product Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'ring', 'pendant', 'locket', 'bracelet', 'earrings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setProductFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                productFilter === tab
                  ? 'bg-majestic-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab === 'all' ? 'All Products' : tab}
            </button>
          ))}
        </div>

      </div>

      {/* Request Table / Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-majestic-600" />
          <p className="text-xs text-stone-500">Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white py-16 px-6 rounded-3xl border border-stone-200 text-center space-y-3">
          <Gem className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="text-base font-serif font-bold text-stone-800">
            No design requests found
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchTerm || productFilter !== 'all'
              ? 'Try modifying your search query or product filter.'
              : 'Launch your first bespoke jewellery concept in the atelier.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-majestic-600 text-white text-xs font-semibold shadow-xs hover:bg-majestic-700"
          >
            Create First Concept
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRequests.map((req) => {
            const finishedVars = req.design_variations?.filter((v) => v.status === 'done').length || 0;
            const totalVars = req.design_variations?.length || 5;

            return (
              <Link
                key={req.id}
                to={`/results/${req.id}`}
                className="group bg-white p-5 rounded-2xl border border-stone-200 hover:border-majestic-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-majestic-100 text-majestic-900 border border-majestic-200">
                      {req.product_type}
                    </span>
                    <span className="text-[11px] text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-stone-900 group-hover:text-majestic-800 transition-colors">
                    {req.include_name
                      ? `${req.name_en || req.name_ar} ${req.name2_en ? `& ${req.name2_en}` : ''}`
                      : `${req.product_type.toUpperCase()} Bespoke`}
                  </h3>

                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                    {req.product_style || 'Curated 5 styles'} · {req.allowed_golds?.join(', ') || 'Gold'}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{finishedVars}/{totalVars} concepts ready</span>
                  </div>

                  <span className="text-majestic-700 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Open <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
};
