import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { getNotificationSettings, updateNotificationSettings } from "../../api/notifications";

const emptyForm = {
  enabled_before_shift_start: false,
  enabled_after_shift_start_no_checkin: false,
  enabled_before_shift_end: false,
  enabled_after_shift_end_no_checkout: false,
  enabled_before_break_start: false,
  enabled_before_break_end: false,
  enabled_break_exceeded: false,
  enabled_location_request_notifications: false,
  enabled_birthday_notifications: false,
  enabled_work_anniversary_notifications: false,
  enabled_holiday_notifications: false,
  enabled_leave_submitted_notifications: false,
  enabled_leave_status_notifications: false,
  enabled_occasion_self_notifications: false,

  before_shift_start_mins: 0,
  after_shift_start_no_checkin_mins: 0,
  before_shift_end_mins: 0,
  after_shift_end_no_checkout_mins: 0,
  before_break_start_mins: 0,
  before_break_end_mins: 0,
  break_exceeded_mins: 0,
  location_request_interval_hours: 0,
};

const BOOL_KEYS = new Set(
  Object.keys(emptyForm).filter((key) => key.startsWith("enabled_"))
);

const toBool = (v, fallback = false) => {
  if (v === null || v === undefined) return fallback;
  return Boolean(v);
};

const toInt = (v, fallback = 0) => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const ToggleSwitch = ({ checked, onToggle, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-disabled={disabled ? "true" : "false"}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
        checked ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]" : "bg-gray-200 border-gray-200"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""} flex-shrink-0`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
};

const NotificationsSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);

  const shiftBreakRules = [
    { enabledKey: "enabled_before_shift_start", minsKey: "before_shift_start_mins", label: "Before shift start" },
    {
      enabledKey: "enabled_after_shift_start_no_checkin",
      minsKey: "after_shift_start_no_checkin_mins",
      label: "After shift start (no check-in)",
    },
    { enabledKey: "enabled_before_shift_end", minsKey: "before_shift_end_mins", label: "Before shift end" },
    {
      enabledKey: "enabled_after_shift_end_no_checkout",
      minsKey: "after_shift_end_no_checkout_mins",
      label: "After shift end (no check-out)",
    },
    { enabledKey: "enabled_before_break_start", minsKey: "before_break_start_mins", label: "Before break start" },
    { enabledKey: "enabled_before_break_end", minsKey: "before_break_end_mins", label: "Before break end" },
    { enabledKey: "enabled_break_exceeded", minsKey: "break_exceeded_mins", label: "Break exceeded" },
    {
      enabledKey: "enabled_location_request_notifications",
      minsKey: "location_request_interval_hours",
      label: "Location request",
      unitLabel: "Hours",
      min: 1,
      max: 168,
    },
  ];

  const employeeLeaveRules = [
    { key: "enabled_birthday_notifications", label: "Birthday notifications" },
    { key: "enabled_work_anniversary_notifications", label: "Work anniversary notifications" },
    { key: "enabled_holiday_notifications", label: "Holiday notifications" },
    { key: "enabled_leave_submitted_notifications", label: "Leave submitted" },
    { key: "enabled_leave_status_notifications", label: "Leave status updates" },
    { key: "enabled_occasion_self_notifications", label: "Occasion (self)" },
  ];

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getNotificationSettings();
      const data = res?.data || res || {};

      const next = {
        enabled_before_shift_start: toBool(data.enabled_before_shift_start),
        enabled_after_shift_start_no_checkin: toBool(data.enabled_after_shift_start_no_checkin),
        enabled_before_shift_end: toBool(data.enabled_before_shift_end),
        enabled_after_shift_end_no_checkout: toBool(data.enabled_after_shift_end_no_checkout),
        enabled_before_break_start: toBool(data.enabled_before_break_start),
        enabled_before_break_end: toBool(data.enabled_before_break_end),
        enabled_break_exceeded: toBool(data.enabled_break_exceeded),
        enabled_location_request_notifications: toBool(data.enabled_location_request_notifications),
        enabled_birthday_notifications: toBool(data.enabled_birthday_notifications),
        enabled_work_anniversary_notifications: toBool(data.enabled_work_anniversary_notifications),
        enabled_holiday_notifications: toBool(data.enabled_holiday_notifications),
        enabled_leave_submitted_notifications: toBool(data.enabled_leave_submitted_notifications),
        enabled_leave_status_notifications: toBool(data.enabled_leave_status_notifications),
        enabled_occasion_self_notifications: toBool(data.enabled_occasion_self_notifications),

        before_shift_start_mins: toInt(data.before_shift_start_mins, 0),
        after_shift_start_no_checkin_mins: toInt(data.after_shift_start_no_checkin_mins, 0),
        before_shift_end_mins: toInt(data.before_shift_end_mins, 0),
        after_shift_end_no_checkout_mins: toInt(data.after_shift_end_no_checkout_mins, 0),
        before_break_start_mins: toInt(data.before_break_start_mins, 0),
        before_break_end_mins: toInt(data.before_break_end_mins, 0),
        break_exceeded_mins: toInt(data.break_exceeded_mins, 0),
        location_request_interval_hours: toInt(data.location_request_interval_hours, 0),
      };

      setForm(next);
      setInitialForm(next);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleReset = () => {
    setForm(initialForm);
  };

  const handleToggleKey = (key) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMinutesChange = (key) => (e) => {
    const raw = e.target.value;
    setForm((prev) => ({ ...prev, [key]: raw === "" ? "" : Number(raw) }));
  };

  const validateMinutes = () => {
    for (const rule of shiftBreakRules) {
      const isEnabled = Boolean(form[rule.enabledKey]);
      if (!isEnabled) continue;

      const n = toInt(form[rule.minsKey], null);
      const min = rule.min ?? 0;
      const max = rule.max ?? 999;
      if (n === null || n < min || n > max) {
        const unit = rule.unitLabel === "Hours" ? "hours" : "minutes";
        return {
          ok: false,
          message:
            rule.unitLabel === "Hours"
              ? `Location request interval hours must be between ${min} and ${max}`
              : `${rule.minsKey.replace(/_/g, " ")} must be between ${min} and ${max} ${unit}`,
        };
      }
    }
    return { ok: true };
  };

  const handleSave = async () => {
    const validation = validateMinutes();
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    const payload = {};
    for (const key of Object.keys(form)) {
      const next = BOOL_KEYS.has(key) ? toBool(form[key]) : toInt(form[key], 0);
      const prev = BOOL_KEYS.has(key) ? toBool(initialForm[key]) : toInt(initialForm[key], 0);
      if (next !== prev) payload[key] = next;
    }

    if (Object.keys(payload).length === 0) {
      toast("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const res = await updateNotificationSettings(payload);
      toast.success(res?.message || "Notification settings updated successfully");
      const updated = res?.data;
      if (updated && typeof updated === "object") {
        const next = {
          ...form,
          enabled_before_shift_start: toBool(updated.enabled_before_shift_start),
          enabled_after_shift_start_no_checkin: toBool(updated.enabled_after_shift_start_no_checkin),
          enabled_before_shift_end: toBool(updated.enabled_before_shift_end),
          enabled_after_shift_end_no_checkout: toBool(updated.enabled_after_shift_end_no_checkout),
          enabled_before_break_start: toBool(updated.enabled_before_break_start),
          enabled_before_break_end: toBool(updated.enabled_before_break_end),
          enabled_break_exceeded: toBool(updated.enabled_break_exceeded),
          enabled_location_request_notifications: toBool(updated.enabled_location_request_notifications),
          enabled_birthday_notifications: toBool(updated.enabled_birthday_notifications),
          enabled_work_anniversary_notifications: toBool(updated.enabled_work_anniversary_notifications),
          enabled_holiday_notifications: toBool(updated.enabled_holiday_notifications),
          enabled_leave_submitted_notifications: toBool(updated.enabled_leave_submitted_notifications),
          enabled_leave_status_notifications: toBool(updated.enabled_leave_status_notifications),
          enabled_occasion_self_notifications: toBool(updated.enabled_occasion_self_notifications),

          before_shift_start_mins: toInt(updated.before_shift_start_mins, 0),
          after_shift_start_no_checkin_mins: toInt(updated.after_shift_start_no_checkin_mins, 0),
          before_shift_end_mins: toInt(updated.before_shift_end_mins, 0),
          after_shift_end_no_checkout_mins: toInt(updated.after_shift_end_no_checkout_mins, 0),
          before_break_start_mins: toInt(updated.before_break_start_mins, 0),
          before_break_end_mins: toInt(updated.before_break_end_mins, 0),
          break_exceeded_mins: toInt(updated.break_exceeded_mins, 0),
          location_request_interval_hours: toInt(updated.location_request_interval_hours, 0),
        };
        setForm(next);
        setInitialForm(next);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update notification settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#F0F0F0] p-6 text-sm text-gray-500">
        Loading notification settings...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Notifications</h3>
          <p className="text-sm text-gray-500 mt-1">Configure notification triggers and reminders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-8 py-3 bg-[#FBD9CC] text-[#6B2D0F] text-sm font-semibold rounded-xl border-none cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-[#EB4000] text-white text-sm font-semibold rounded-xl border-none cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="border border-gray-100 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Shift & Break Notifications</h4>

          <div className="space-y-3">
            {shiftBreakRules.map((rule) => {
              const enabled = Boolean(form[rule.enabledKey]);
              return (
                <div key={rule.enabledKey} className="flex items-center justify-between gap-4">
                  {/* Shift the left group down slightly to visually align with the minutes input center.
                      (Runtime-measured deltaInputToggleCenterY was consistently ~7.5px.) */}
                  <div className="flex items-center gap-3 relative top-[7.5px]">
                    <ToggleSwitch
                      checked={enabled}
                      disabled={saving || loading}
                      onToggle={() => handleToggleKey(rule.enabledKey)}
                    />
                    <span
                      className="text-sm font-medium text-gray-800 whitespace-nowrap leading-none"
                    >
                      {rule.label}
                    </span>
                  </div>

                  <div className="min-w-[160px]">
                    <label
                      className="text-[10px] font-semibold text-[#64748B] block leading-none"
                    >
                      {rule.unitLabel || "Minutes"}
                    </label>
                    <input
                      type="number"
                      min={rule.min ?? 0}
                      max={rule.max ?? 999}
                      value={form[rule.minsKey]}
                      onChange={handleMinutesChange(rule.minsKey)}
                      disabled={!enabled || saving}
                      className="w-full border border-[#CBD5E1] rounded-xl px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border border-gray-100 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Employee & Leave Notifications</h4>

          <div className="space-y-3">
            {employeeLeaveRules.map((rule) => (
              <div key={rule.key} className="flex items-center justify-between gap-4">
                <span
                  className="text-sm font-medium text-gray-800 whitespace-nowrap leading-none"
                >
                  {rule.label}
                </span>
                <ToggleSwitch
                  checked={Boolean(form[rule.key])}
                  disabled={saving || loading}
                  onToggle={() => handleToggleKey(rule.key)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsSettings;

