import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { ShieldAlert, AlertCircle, Clock, Database, RefreshCw } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    setError('');
    try {
      const res = await api.get('/admin/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch system audit logs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-teal-400" />
            <span>Security Audit Log ledger</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Chronological system activity logs, authentication audits, and record updates.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="py-2 px-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Logs table */}
      <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No recorded system logs.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <th className="px-6 py-4">Log ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Operator ID</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Log Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-mono">#LOG-{log.id}</td>
                    <td className="px-6 py-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        <span>{formatTimestamp(log.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-300">
                      {log.user_id ? `User Account ID: ${log.user_id}` : 'System Agent'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-[11px] leading-relaxed max-w-md break-all">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
