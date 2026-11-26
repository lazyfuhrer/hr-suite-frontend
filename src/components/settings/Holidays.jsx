import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { createHolidays, deleteHoliday, getHolidays } from '../../api/settings';
import DeleteConfirmModal from '../common/DeleteConfirmModal';

const currentYear = new Date().getFullYear();

const makeEmptyItem = () => ({
  fromDate: '',
  toDate: '',
  title: '',
});

const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

const formatIsoDate = (value) =>
  new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const AddHolidayModal = ({ onClose, onSaved }) => {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [items, setItems] = useState([makeEmptyItem()]);
  const [saving, setSaving] = useState(false);

  const minDate = `${selectedYear}-01-01`;
  const maxDate = `${selectedYear}-12-31`;

  const updateItem = (index, patch) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, makeEmptyItem()]);
  };

  const handleSave = async () => {
    const normalizedItems = items.map((item) => {
      const fromDate = item.fromDate;
      const toDate = item.toDate || item.fromDate;
      return {
        from_date: fromDate,
        to_date: toDate,
        title: item.title.trim(),
      };
    });

    const invalidItem = normalizedItems.find(
      (item) => !item.from_date || !item.to_date || !item.title || item.to_date < item.from_date,
    );
    if (invalidItem) {
      toast.error('Please fill valid date range and title for all holiday items');
      return;
    }

    try {
      setSaving(true);
      await createHolidays({ items: normalizedItems });
      toast.success('Holiday saved successfully');
      onSaved();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save holidays');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-2xl rounded-3xl border-2 border-gray-200 bg-white p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-gray-900">Add Holidays</h4>
          <select
            value={selectedYear}
            onChange={(e) => {
              const year = Number(e.target.value);
              setSelectedYear(year);
              setItems([makeEmptyItem()]);
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-[#EB4000]"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-2xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    From <span className="text-[var(--brand-primary)] ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={item.fromDate}
                    onChange={(e) => {
                      const fromDate = e.target.value;
                      updateItem(index, {
                        fromDate,
                        toDate:
                          item.toDate && item.toDate < fromDate
                            ? fromDate
                            : item.toDate || fromDate,
                      });
                    }}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#EB4000]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    To <span className="text-[var(--brand-primary)] ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    min={item.fromDate || minDate}
                    max={maxDate}
                    value={item.toDate}
                    onChange={(e) => updateItem(index, { toDate: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#EB4000]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    Reason / Title <span className="text-[var(--brand-primary)] ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateItem(index, { title: e.target.value })}
                    placeholder="e.g. Holi"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#EB4000]"
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                  title="Remove holiday item"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-4 text-sm font-bold text-[#EB4000] hover:text-[#d43800]"
        >
          + Add Items
        </button>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-300 px-7 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-[#EB4000] px-7 py-2.5 text-sm font-semibold text-white hover:bg-[#d43800] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Holiday'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Holidays = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const rows = useMemo(
    () =>
      [...items].sort((a, b) => {
        const byDate = String(a.from_date || '').localeCompare(String(b.from_date || ''));
        return byDate !== 0 ? byDate : String(a.title || '').localeCompare(String(b.title || ''));
      }),
    [items],
  );

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await getHolidays();
      setItems(res?.items || []);
    } catch {
      toast.error('Failed to fetch holidays');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    try {
      await deleteHoliday(deleteTarget.id);
      setItems((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success('Holiday deleted');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete holiday');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#F0F0F0] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1A1A1A]">Holidays</h3>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#EB4000] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d43800]"
        >
          Add New Holiday
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Date</th>
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Title</th>
              <th className="p-3 px-4 text-right text-sm font-semibold text-[#666]">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-400">
                  No holidays found.
                </td>
              </tr>
            ) : (
              rows.map((holiday) => (
                <tr key={holiday.id} className="border-b border-[#FAFAFA]">
                  <td className="py-3 font-medium text-[#333]">
                    {holiday.from_date === holiday.to_date
                      ? formatIsoDate(holiday.from_date)
                      : `${formatIsoDate(holiday.from_date)} - ${formatIsoDate(holiday.to_date)}`}
                  </td>
                  <td className="py-3 text-[#555]">{holiday.title}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: holiday.id, name: holiday.title })}
                      className="inline-flex items-center justify-end rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                      title="Delete holiday"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <AddHolidayModal
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            fetchHolidays();
          }}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Delete holiday?"
        itemName={deleteTarget?.name}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Holidays;
