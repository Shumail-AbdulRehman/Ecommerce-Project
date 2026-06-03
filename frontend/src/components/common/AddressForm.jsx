/**
 * AddressForm.jsx — Pakistan delivery address form
 * Path: frontend/src/components/common/AddressForm.jsx
 *
 * Used in ProfilePage (modal) and CheckoutPage (inline)
 */

import { useState } from 'react';
import { Loader, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PAKISTAN_REGIONS = [
  "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan",
  "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Jammu and Kashmir",
];

const emptyForm = {
  country: 'Pakistan',
  name: '',
  phone: '',
  zip: '',
  flat: '',
  area: '',
  landmark: '',
  city: '',
  state: '',
  is_default: false,
};

/**
 * @param {object}   address    - existing address for edit, null for new
 * @param {function} onSave     - called after successful save with saved address data
 * @param {function} onCancel   - called when cancel clicked
 * @param {boolean}  showCancel - show cancel button (default true)
 * @param {string}   submitLabel - button label override
 */
export default function AddressForm({ address, onSave, onCancel, showCancel = true, submitLabel }) {
  const isEdit = !!address?.id;
  const noAutofill = {
    autoComplete: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    'data-lpignore': 'true',
    'data-form-type': 'other',
  };

  const [form, setForm] = useState({
    country:    address?.country    || 'Pakistan',
    name:       address?.name       || '',
    phone:      address?.phone      || '',
    zip:        address?.zip        || '',
    flat:       address?.flat       || '',
    area:       address?.area       || '',
    landmark:   address?.landmark   || '',
    city:       address?.city       || '',
    state:      address?.state      || '',
    is_default: address?.is_default ? true : false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Full name is required';
    if (!form.phone.trim()) e.phone = 'Mobile number is required';
    if (!form.zip.trim())   e.zip   = 'Postal code is required';
    if (!form.flat.trim())  e.flat  = 'Flat / House no. is required';
    if (!form.area.trim())  e.area  = 'Area / Street is required';
    if (!form.city.trim())  e.city  = 'Town / City is required';
    if (!form.state)        e.state = 'Please select a state';
    if (form.phone && !/^\d{10,11}$/.test(form.phone.replace(/[\s\-\+]/g, '')))
      e.phone = 'Enter a valid 10-11 digit mobile number';
    if (form.zip && !/^\d{5}$/.test(form.zip))
      e.zip = 'Enter a valid 5-digit postal code';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      let saved;
      if (isEdit) {
        const { data } = await api.put(`/addresses/${address.id}`, form);
        saved = data;
        toast.success('Address updated!');
      } else {
        const { data } = await api.post('/addresses', form);
        saved = data;
        toast.success('Address added!');
      }
      onSave(saved);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const inp = (field) =>
    `w-full border rounded-md px-3 py-2.5 text-sm outline-none transition-all
     focus:ring-2 focus:ring-blue-400 focus:border-blue-400
     ${errors[field]
       ? 'border-red-400 bg-red-50'
       : 'border-gray-300 bg-white hover:border-gray-400'
     }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" data-form-type="other">

      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Country/Region</label>
        <select className={inp('country')} value={form.country} onChange={e => set('country', e.target.value)} autoComplete="off">
          <option value="Pakistan">Pakistan</option>
        </select>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full name (First and Last name)</label>
        <input className={inp('name')} placeholder="Ali Khan" {...noAutofill}
          value={form.name} onChange={e => set('name', e.target.value)} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* Mobile */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>
        <input className={inp('phone')} placeholder="03001234567" maxLength={11} inputMode="numeric" {...noAutofill}
          value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} />
        <p className="text-xs text-gray-400 mt-1">May be used to assist delivery</p>
        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
      </div>

      {/* Postal code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Postal code</label>
        <input className={inp('zip')} placeholder="54000" maxLength={5} inputMode="numeric" {...noAutofill}
          value={form.zip} onChange={e => set('zip', e.target.value.replace(/\D/g, ''))} />
        {errors.zip && <p className="text-xs text-red-500 mt-1">{errors.zip}</p>}
      </div>

      {/* Flat / House no. */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Flat, House no., Building, Company, Apartment
        </label>
        <input className={inp('flat')} placeholder="e.g. House 12, Block B" {...noAutofill}
          value={form.flat} onChange={e => set('flat', e.target.value)} />
        {errors.flat && <p className="text-xs text-red-500 mt-1">{errors.flat}</p>}
      </div>

      {/* Area / Street */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Area, Street, Sector, Village</label>
        <input className={inp('area')} placeholder="e.g. Gulberg III, Main Boulevard" {...noAutofill}
          value={form.area} onChange={e => set('area', e.target.value)} />
        {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
      </div>

      {/* Landmark */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Landmark <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input className={inp('landmark')} placeholder="E.g. near Liberty Market" {...noAutofill}
          value={form.landmark} onChange={e => set('landmark', e.target.value)} />
      </div>

      {/* City + State */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Town/City</label>
          <input className={inp('city')} placeholder="Lahore" {...noAutofill}
            value={form.city} onChange={e => set('city', e.target.value)} />
          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Province/Region</label>
          <select className={inp('state')} value={form.state} onChange={e => set('state', e.target.value)} autoComplete="off">
            <option value="">Choose a province or region</option>
            {PAKISTAN_REGIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
        </div>
      </div>

      {/* Default checkbox */}
      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" id="is_default" checked={form.is_default}
          onChange={e => set('is_default', e.target.checked)}
          className="w-4 h-4 accent-ink-900 cursor-pointer" />
        <label htmlFor="is_default" className="text-sm text-gray-700 cursor-pointer">
          Make this my default address
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        {showCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        )}
        <button type="submit" disabled={loading}
          className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading
            ? <><Loader size={14} className="animate-spin" /> Saving...</>
            : submitLabel || (isEdit ? 'Update address' : 'Add address')
          }
        </button>
      </div>
    </form>
  );
}
