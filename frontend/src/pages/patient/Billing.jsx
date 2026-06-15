import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { CreditCard, FileDown, CheckCircle2, Clock, AlertCircle, Plus, Sparkles, Building, ShieldAlert } from 'lucide-react';

const Billing = () => {
  const [bills, setBills] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeBill, setActiveBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [transactionId, setTransactionId] = useState('');
  const [paying, setPaying] = useState(false);

  // Add Insurance State
  const [insuranceFormOpen, setInsuranceFormOpen] = useState(false);
  const [insuranceData, setInsuranceData] = useState({
    provider_name: '',
    policy_number: '',
    coverage_amount: ''
  });
  
  // Claim State
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimData, setClaimData] = useState({
    insurance_id: '',
    bill_id: '',
    claim_amount: '',
    remarks: ''
  });

  const fetchData = async () => {
    try {
      const [billsRes, insRes] = await Promise.all([
        api.get('/billing/bills'),
        api.get('/billing/insurance')
      ]);
      setBills(billsRes.data);
      setInsurances(insRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load billing history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenPayment = (bill) => {
    setActiveBill(bill);
    setTransactionId('TXN_' + Math.floor(1000000 + Math.random() * 9000000));
    setPaymentModalOpen(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!activeBill) return;

    setPaying(true);
    setError('');
    try {
      await api.post(`/billing/bills/${activeBill.id}/pay`, {
        payment_method: paymentMethod,
        transaction_id: transactionId
      });
      
      setPaymentModalOpen(false);
      fetchData(); // Reload list
      
      // Auto trigger PDF Download
      handleDownloadInvoice(activeBill.id);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Payment processing failed.");
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadInvoice = async (billId) => {
    try {
      // Trigger browser download by requesting binary file
      const response = await api.get(`/billing/bills/${billId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_bill_${billId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF receipt.");
    }
  };

  const handleAddInsurance = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/billing/insurance', {
        ...insuranceData,
        coverage_amount: parseFloat(insuranceData.coverage_amount)
      });
      setInsuranceFormOpen(false);
      setInsuranceData({ provider_name: '', policy_number: '', coverage_amount: '' });
      fetchData(); // Refresh to show the new policy
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to add insurance policy.");
    }
  };

  const handleOpenClaim = (bill) => {
    setClaimData({
      insurance_id: '',
      bill_id: bill.id.toString(),
      claim_amount: bill.total_amount.toString(),
      remarks: 'Standard consultation coverage claim'
    });
    setClaimModalOpen(true);
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Create a policy first if we don't have policies. Let's just warn or handle it if policy is missing.
      await api.post('/billing/insurance/claims', {
        insurance_id: parseInt(claimData.insurance_id, 10),
        bill_id: parseInt(claimData.bill_id, 10),
        claim_amount: parseFloat(claimData.claim_amount),
        remarks: claimData.remarks
      });
      setClaimModalOpen(false);
      alert("Insurance claim submitted successfully! Status: PENDING.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Claim submission failed. Make sure your insurance ID is correct.");
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-teal-400" />
            <span>Billing Control & Invoice Ledger</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Settle consultation fees, file insurance claims, and review invoices.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setInsuranceFormOpen(!insuranceFormOpen)}
            className="py-2 px-3.5 bg-slate-900 border border-slate-800 hover:border-teal-500/30 text-teal-400 hover:bg-slate-800/40 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Insurance</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Insurance Panel Form (Collapsible) */}
      {insuranceFormOpen && (
        <form onSubmit={handleAddInsurance} className="glass-panel border-teal-500/20 rounded-2xl p-5 max-w-lg space-y-4 animate-fade-in">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-400" />
            <span>Add Insurance Provider Details</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Provider (e.g. BlueCross)"
              value={insuranceData.provider_name}
              onChange={(e) => setInsuranceData({ ...insuranceData, provider_name: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
              required
            />
            <input
              type="text"
              placeholder="Policy Number"
              value={insuranceData.policy_number}
              onChange={(e) => setInsuranceData({ ...insuranceData, policy_number: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
              required
            />
            <input
              type="number"
              placeholder="Coverage Limit ($)"
              value={insuranceData.coverage_amount}
              onChange={(e) => setInsuranceData({ ...insuranceData, coverage_amount: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setInsuranceFormOpen(false)}
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-xs hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-1.5 px-3 bg-teal-500 text-slate-950 rounded-lg text-xs font-semibold hover:bg-teal-600"
            >
              Verify & Add
            </button>
          </div>
        </form>
      )}

      {/* Insurance Policies List */}
      {insurances.length > 0 && (
        <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl p-5 space-y-3">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-teal-400" />
            <span>Your Insurance Policies</span>
            <span className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-full font-semibold ml-auto">
              {insurances.length} {insurances.length === 1 ? 'Policy' : 'Policies'}
            </span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insurances.map((ins) => (
              <div key={ins.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <p className="text-white font-bold text-sm">{ins.provider_name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    ins.status === 'ACTIVE' || ins.status === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {ins.status}
                  </span>
                </div>
                <p className="text-slate-400 text-xs">Policy: <span className="text-slate-200 font-mono">{ins.policy_number}</span></p>
                <p className="text-slate-400 text-xs">Coverage: <span className="text-teal-400 font-bold">${ins.coverage_amount.toLocaleString()}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bills Ledger List */}
      <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {bills.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No billing statements found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Breakdown (Fee / Tax / Disc)</th>
                  <th className="px-6 py-4">Settle Date</th>
                  <th className="px-6 py-4">Payment Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="px-6 py-4 text-slate-200 font-bold">#INV-00{bill.id}</td>
                    <td className="px-6 py-4 text-white font-extrabold text-sm">${bill.total_amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-400">
                      ${bill.amount.toFixed(2)} / ${bill.tax.toFixed(2)} / -${bill.discount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {bill.payment_status === 'PAID' ? 'Settled' : 'Unsettled'}
                    </td>
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {bill.payment_status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleOpenClaim(bill)}
                              className="py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                            >
                              File Claim
                            </button>
                            <button
                              onClick={() => handleOpenPayment(bill)}
                              className="py-1.5 px-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-teal-500/10"
                            >
                              Pay Now
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDownloadInvoice(bill.id)}
                            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all flex items-center gap-1 border border-slate-700"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>Receipt PDF</span>
                          </button>
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

      {/* Simulated Payment Modal */}
      {paymentModalOpen && activeBill && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm">Secure Payment Gateway</h3>
              <button 
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-center">
              <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Total Amount Due</span>
              <p className="text-2xl font-extrabold text-teal-400">${activeBill.total_amount.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400">Statement Invoice #INV-00{activeBill.id}</p>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1" htmlFor="method">
                  Payment Method
                </label>
                <select
                  id="method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-xs"
                >
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="BANK">Direct Bank Transfer</option>
                  <option value="CASH">Cash Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1" htmlFor="txn">
                  Transaction / Autopay Reference ID
                </label>
                <input
                  id="txn"
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-xs font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={paying}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg hover:shadow-teal-500/15 focus:outline-none transition-all flex justify-center items-center gap-1.5"
              >
                {paying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Secure Gateway...</span>
                  </>
                ) : (
                  <span>Submit Payment & Download Receipt</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Insurance Claim Form Modal */}
      {claimModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm">File Insurance Claim</h3>
              <button 
                onClick={() => setClaimModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1" htmlFor="insuranceId">
                  Select Insurance Policy
                </label>
                <select
                  id="insuranceId"
                  value={claimData.insurance_id}
                  onChange={(e) => setClaimData({ ...claimData, insurance_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                >
                  <option value="">-- Select a policy --</option>
                  {insurances.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.provider_name} - {ins.policy_number} (${ins.coverage_amount.toLocaleString()})
                    </option>
                  ))}
                </select>
                {insurances.length === 0 && (
                  <p className="text-amber-400 text-[10px] mt-1">No insurance policies found. Please add one first.</p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1" htmlFor="claimAmount">
                  Claim Coverage Amount ($)
                </label>
                <input
                  id="claimAmount"
                  type="number"
                  value={claimData.claim_amount}
                  onChange={(e) => setClaimData({ ...claimData, claim_amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1" htmlFor="remarks">
                  Claim Remarks / Notes
                </label>
                <textarea
                  id="remarks"
                  rows="2"
                  value={claimData.remarks}
                  onChange={(e) => setClaimData({ ...claimData, remarks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
              >
                Submit Claim Statement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
