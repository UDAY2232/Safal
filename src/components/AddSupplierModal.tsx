import React, { useState } from 'react';
import { X, Truck, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface AddSupplierModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('India');
  const [category, setCategory] = useState('Fresh Fruits Producer');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await api.createSupplier({
        name: name.trim(),
        contactPerson: contactPerson.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        country,
        category,
        paymentTerms,
        notes: notes.trim() || null,
      });

      onSuccess(`Supplier "${name}" created successfully`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="modal !w-[580px] max-w-[94vw] p-6">
        <div className="modal-header pb-3 border-b border-gray-100">
          <div>
            <span className="eyebrow flex items-center gap-1 text-emerald-700 font-bold">
              <Truck size={14} /> SUPPLIER REGISTRATION
            </span>
            <h2 className="text-lg font-bold text-gray-900 mt-1">Add New Fruit Supplier</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {error && <div className="my-2 p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>}

        <div className="py-3 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Supplier Company Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sahyadri Farms Cooperative"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Ramesh Kadam"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@supplier.com"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98..."
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Grapes & Pomegranates"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Physical / Depot Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Market yard, Cold Storage, City, State"
              className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Operational details, refrigerated truck capacity..."
              className="w-full p-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            Register Supplier <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

