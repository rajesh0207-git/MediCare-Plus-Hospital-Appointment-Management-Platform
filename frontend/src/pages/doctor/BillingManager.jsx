import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { CreditCard, Plus, CheckCircle2, Clock, AlertCircle, Sparkles, User, FileText } from 'lucide-react';

const BillingManager = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Bill Creation State
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: '',
    amount: '',
    tax: '15.00',
    discount: '0.00'
  });
  const [submittingBill, setSubmittingBill] = useState(false);

  const fetchBills = async () => {
    try {
      const res = await api.get('/billing/bills');
      setBills(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch billing statements database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.amount) {
      alert("Patient ID and Amount are required.");
      return;
    }

    setSubmittingBill(true);
    setError('');
    try {
      await api.post('/billing/bills', {
        patient_id: parseInt(formData.patient_id, 10),
        appointment_id: formData.appointment_id ? parseInt(formData.appointment_id, 10) : null,
        amount: parseFloat(formData.amount),
        tax: parseFloat(formData.tax),
        discount: parseFloat(formData.discount)
      });
      setBillModalOpen(false);
      setFormData({ patient_id: '', appointment_id: '', amount: '', tax: '15.00', discount: '0.00' });
      fetchBills(); // Refresh list
      alert("Billing invoice generated successfully.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to create invoice.");
    } finally {
      setSubmittingBill(false);
    }
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
            <CreditCard className="w-6 h-6 text-teal-400" />
            <span>Invoice Registry & billing Ledger</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Audit patient accounts, compile statements, and monitor collection rates.</p>
        </div>
        <button
          onClick={() => setBillModalOpen(true)}
          className="py-2 px-3.5 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-teal-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Invoice</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bills Ledger List */}
      <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {bills.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No medical statements issued yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Patient Profile ID</th>
                  <th className="px-6 py-4">Linked Appt ID</th>
                  <th className="px-6 py-4">Subtotal / Tax / Discount</th>
                  <th className="px-6 py-4">Total Settled</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="px-6 py-4 text-slate-200 font-bold">#INV-00{bill.id}</td>
                    <td className="px-6 py-4 text-slate-300 font-medium">Patient #{bill.patient_id}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {bill.appointment_id ? `Appt #${bill.appointment_id}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      ${bill.amount.toFixed(2)} / ${bill.tax.toFixed(2)} / -${bill.discount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-white font-extrabold text-sm">${bill.total_amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5">
                        {bill.payment_status === 'PAID' ? (
                          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>PAID</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Creation Modal */}
      {billModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm">Issue Medical Invoice</h3>
              <button 
                onClick={() => setBillModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Patient ID</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Appointment ID (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 4"
                    value={formData.appointment_id}
                    onChange={(e) => setFormData({ ...formData, appointment_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">Consultation Settle Fee ($)</label>
                <input
                  type="number"
                  placeholder="150.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Tax Surcharge ($)</label>
                  <input
                    type="number"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Discount Limit ($)</label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingBill}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
              >
                {submittingBill ? 'Issuing Statement...' : 'Issue Billing Invoice Statement'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingManager;
