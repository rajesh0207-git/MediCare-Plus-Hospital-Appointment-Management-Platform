import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, Phone, MapPin, ShieldAlert, Heart, Calendar, AlertCircle, Save, Plus, Trash2 } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  
  // Profile Form State
  const [profileData, setProfileData] = useState({
    full_name: '',
    gender: 'Male',
    age: '',
    blood_group: 'O+',
    phone: '',
    address: ''
  });
  
  // Emergency Contacts State
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone: ''
  });

  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [profileRes, contactsRes] = await Promise.all([
        api.get('/patients/me'),
        api.get('/patients/me/emergency-contacts')
      ]);
      setProfileData({
        full_name: profileRes.data.full_name,
        gender: profileRes.data.gender || 'Male',
        age: profileRes.data.age || '',
        blood_group: profileRes.data.blood_group || 'O+',
        phone: profileRes.data.phone || '',
        address: profileRes.data.address || ''
      });
      setContacts(contactsRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load user profile details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/patients/me', {
        ...profileData,
        age: parseInt(profileData.age, 10)
      });
      setSuccess("Profile details updated successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.relationship || !newContact.phone) return;

    setAddingContact(true);
    setError('');
    try {
      await api.post('/patients/me/emergency-contacts', newContact);
      setNewContact({ name: '', relationship: '', phone: '' });
      // Reload contacts
      const contactsRes = await api.get('/patients/me/emergency-contacts');
      setContacts(contactsRes.data);
      alert("Emergency contact added successfully.");
    } catch (err) {
      console.error(err);
      setError("Failed to save emergency contact.");
    } finally {
      setAddingContact(false);
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
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-teal-400" />
          <span>Profile Settings & Security</span>
        </h2>
        <p className="text-slate-400 text-xs">Verify your registered details and maintain active emergency contact cards.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm flex items-center gap-2">
          <Save className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile details form (Col 2/3) */}
        <div className="md:col-span-2 glass-panel rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-white font-bold text-sm border-b border-slate-800 pb-3">Personal Information</h3>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    value={profileData.age}
                    onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Blood Group</label>
                  <select
                    value={profileData.blood_group}
                    onChange={(e) => setProfileData({ ...profileData, blood_group: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Gender</label>
                <select
                  value={profileData.gender}
                  onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1">Home Address</label>
              <textarea
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                rows="3.5"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={updatingProfile}
              className="py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/10"
            >
              {updatingProfile ? 'Saving Details...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Emergency Contacts Widget (Col 1/3) */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-white font-bold text-sm border-b border-slate-800 pb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Emergency Contacts</span>
            </h3>

            {/* Contacts list */}
            {contacts.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">No emergency contacts added yet.</p>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-white font-bold text-xs">{contact.name}</p>
                      <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                        {contact.relationship}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{contact.phone}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Contact Form */}
            <form onSubmit={handleAddContact} className="border-t border-slate-800 pt-4 space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Add New Contact</p>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500 w-full"
                  required
                />
                <input
                  type="text"
                  placeholder="Rel. (e.g. Spouse)"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500 w-full"
                  required
                />
              </div>

              <input
                type="tel"
                placeholder="Phone Number"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500 w-full"
                required
              />

              <button
                type="submit"
                disabled={addingContact}
                className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-teal-500/30 text-teal-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addingContact ? 'Adding...' : 'Add Contact'}</span>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
