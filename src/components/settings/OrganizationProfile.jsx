import React, { useEffect, useMemo, useState } from "react";
import { Building2, Image, Palette, Shield, Upload } from "lucide-react";
import { toast } from "react-hot-toast";
import { getOrganizationSettings, updateOrganizationSettings } from "../../api/organizations";
import { useBranding } from "../../context/BrandingContext";

const emptyForm = {
  name: "",
  company_code: "",
  website: "",
  founded_year: "",
  address: "",
  contact_email: "",
  phone_number: "",
  cin: "",
  gstin: "",
  pf_number: "",
  late_grace_period_mins: "",
  display_ot: false,
  ot_round_off_enabled: false,
  ot_round_off_mins: "15",
  brand_color: "#EB4000",
  logo_url: "",
  favicon_url: "",
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

const normalizeHexColor = (value) => {
  if (!value) return "";
  const raw = value.trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(raw)) return "";
  return `#${raw.toUpperCase()}`;
};

const isValidWebsite = (value) => {
  const input = String(value || "").trim();
  if (!input) return true;

  const normalized = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  try {
    const url = new URL(normalized);
    return Boolean(url.hostname) && url.hostname.includes(".") && !/\s/.test(input);
  } catch {
    return false;
  }
};

const isValidFoundedYear = (value) => {
  const input = String(value || "").trim();
  if (!input) return true;
  if (!/^\d{4}$/.test(input)) return false;

  const year = Number(input);
  const currentYear = new Date().getFullYear();
  return year >= 1800 && year <= currentYear;
};

const normalizePhoneDigits = (value) => String(value || "").replace(/\D/g, "");
const isValidIndiaMobile = (digits) => digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
const isValidEmail = (value) => /\S+@\S+\.\S+/.test(String(value || "").trim());

const parseStoredPhone = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  const m = s.match(/^(\+\d{1,4})-(.+)$/);
  if (m) return normalizePhoneDigits(m[2]).slice(0, 10);
  return normalizePhoneDigits(s).slice(0, 10);
};

const formatPhoneForApi = (digits) => (digits ? `+91-${digits}` : "");

const toBool = (value, fallback = false) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return fallback;
};

const OrganizationProfile = () => {
  const { setBrandingFromOrganization, defaults } = useBranding();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const fetchOrganizationSettings = async () => {
    setLoading(true);
    try {
      const response = await getOrganizationSettings();
      const data = response?.data || {};
      const nextForm = {
        name: data.name || "",
        company_code: data.company_code || "",
        website: data.website || "",
        founded_year: data.founded_year ? String(data.founded_year) : "",
        address: data.address || "",
        contact_email: data.contact_email || "",
        phone_number: parseStoredPhone(data.phone_number),
        cin: data.cin || "",
        gstin: data.gstin || "",
        pf_number: data.pf_number || "",
        late_grace_period_mins:
          data.late_grace_period_mins !== null && data.late_grace_period_mins !== undefined
            ? String(data.late_grace_period_mins)
            : "",
        display_ot: toBool(data.display_ot),
        ot_round_off_enabled: toBool(data.ot_round_off_enabled),
        ot_round_off_mins:
          data.ot_round_off_mins !== null && data.ot_round_off_mins !== undefined
            ? String(data.ot_round_off_mins)
            : "15",
        brand_color: normalizeHexColor(data.brand_color) || defaults.DEFAULT_BRAND_COLOR,
        logo_url: data.logo_url || "",
        favicon_url: data.favicon_url || "",
      };

      setForm(nextForm);
      setInitialForm(nextForm);
      setLogoFile(null);
      setFaviconFile(null);
      setRemoveLogo(false);
      setRemoveFavicon(false);
      setBrandingFromOrganization(data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch organization settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizationSettings();
    // Tab is conditionally rendered, so this runs when Organization Profile tab is selected.
  }, []);

  const logoPreview = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return form.logo_url || defaults.DEFAULT_COMPANY_LOGO;
  }, [logoFile, form.logo_url, defaults.DEFAULT_COMPANY_LOGO]);

  const faviconPreview = useMemo(() => {
    if (faviconFile) return URL.createObjectURL(faviconFile);
    return form.favicon_url || defaults.DEFAULT_FAVICON;
  }, [faviconFile, form.favicon_url, defaults.DEFAULT_FAVICON]);

  useEffect(() => {
    return () => {
      if (logoFile && logoPreview) URL.revokeObjectURL(logoPreview);
      if (faviconFile && faviconPreview) URL.revokeObjectURL(faviconPreview);
    };
  }, [logoFile, faviconFile, logoPreview, faviconPreview]);

  const handleInput = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmailChange = (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, contact_email: value }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next.contact_email;
      return next;
    });
  };

  const handlePhoneChange = (event) => {
    const digits = normalizePhoneDigits(event.target.value).slice(0, 10);
    setForm((prev) => ({ ...prev, phone_number: digits }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next.phone_number;
      return next;
    });
  };

  const handleColorTextChange = (event) => {
    setForm((prev) => ({ ...prev, brand_color: event.target.value }));
  };

  const handleColorPickerChange = (event) => {
    const value = normalizeHexColor(event.target.value) || defaults.DEFAULT_BRAND_COLOR;
    setForm((prev) => ({ ...prev, brand_color: value }));
  };

  const handleCancel = () => {
    setForm(initialForm);
    setLogoFile(null);
    setFaviconFile(null);
    setRemoveLogo(false);
    setRemoveFavicon(false);
    setValidationErrors({});
  };

  const handleLogoChange = (event) => {
    const next = event.target.files?.[0] || null;
    setLogoFile(next);
    if (next) {
      setRemoveLogo(false);
      setForm((prev) => ({ ...prev, logo_url: prev.logo_url || "" }));
    }
  };

  const handleFaviconChange = (event) => {
    const next = event.target.files?.[0] || null;
    setFaviconFile(next);
    if (next) {
      setRemoveFavicon(false);
      setForm((prev) => ({ ...prev, favicon_url: prev.favicon_url || "" }));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setRemoveLogo(true);
    setForm((prev) => ({ ...prev, logo_url: "" }));
  };

  const handleRemoveFavicon = () => {
    setFaviconFile(null);
    setRemoveFavicon(true);
    setForm((prev) => ({ ...prev, favicon_url: "" }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    if (!isValidWebsite(form.website)) {
      toast.error("Enter a valid website URL");
      return;
    }

    if (!isValidFoundedYear(form.founded_year)) {
      toast.error("Enter a valid founded year");
      return;
    }

    const graceRaw = String(form.late_grace_period_mins ?? "").trim();
    const graceValue = graceRaw === "" ? 0 : Number(graceRaw);
    if (!Number.isFinite(graceValue) || graceValue < 0 || graceValue > 60) {
      toast.error("Late grace period must be between 0 and 60 minutes");
      return;
    }

    const roundOffRaw = String(form.ot_round_off_mins ?? "").trim();
    const roundOffMinsValue = roundOffRaw === "" ? 15 : Number(roundOffRaw);
    if (!Number.isFinite(roundOffMinsValue) || roundOffMinsValue < 1 || roundOffMinsValue > 60) {
      toast.error("OT round off minutes must be between 1 and 60");
      return;
    }

    const email = form.contact_email.trim();
    const phoneDigits = normalizePhoneDigits(form.phone_number);
    const nextValidationErrors = {};

    if (email && !isValidEmail(email)) {
      nextValidationErrors.contact_email = "Enter a valid email address";
    }
    if (phoneDigits && !isValidIndiaMobile(phoneDigits)) {
      nextValidationErrors.phone_number = "Enter a valid 10-digit mobile number";
    }

    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      toast.error(Object.values(nextValidationErrors)[0]);
      return;
    }

    setValidationErrors({});

    const normalizedColor = normalizeHexColor(form.brand_color) || defaults.DEFAULT_BRAND_COLOR;
    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("website", form.website.trim());
    payload.append("founded_year", form.founded_year.trim());
    payload.append("address", form.address.trim());
    payload.append("contact_email", email);
    payload.append("phone_number", formatPhoneForApi(phoneDigits));
    payload.append("cin", form.cin.trim());
    payload.append("gstin", form.gstin.trim());
    payload.append("pf_number", form.pf_number.trim());
    payload.append("late_grace_period_mins", String(graceValue));
    payload.append("display_ot", form.display_ot ? "true" : "false");
    payload.append("ot_round_off_enabled", form.ot_round_off_enabled ? "true" : "false");
    payload.append("ot_round_off_mins", String(roundOffMinsValue));
    payload.append("brand_color", normalizedColor);

    if (logoFile) payload.append("logo", logoFile);
    if (faviconFile) payload.append("favicon", faviconFile);
    if (removeLogo && !logoFile) payload.append("remove_logo", "true");
    if (removeFavicon && !faviconFile) payload.append("remove_favicon", "true");

    setSaving(true);
    try {
      const response = await updateOrganizationSettings(payload);
      const updatedOrg = response?.data || null;
      if (updatedOrg) {
        const nextForm = {
          name: updatedOrg.name || "",
          company_code: updatedOrg.company_code || "",
          website: updatedOrg.website || "",
          founded_year: updatedOrg.founded_year ? String(updatedOrg.founded_year) : "",
          address: updatedOrg.address || "",
          contact_email: updatedOrg.contact_email || "",
          phone_number: parseStoredPhone(updatedOrg.phone_number),
          cin: updatedOrg.cin || "",
          gstin: updatedOrg.gstin || "",
          pf_number: updatedOrg.pf_number || "",
          late_grace_period_mins:
            updatedOrg.late_grace_period_mins !== null && updatedOrg.late_grace_period_mins !== undefined
              ? String(updatedOrg.late_grace_period_mins)
              : String(graceValue),
          display_ot:
            updatedOrg.display_ot !== null && updatedOrg.display_ot !== undefined
              ? toBool(updatedOrg.display_ot)
              : toBool(form.display_ot),
          ot_round_off_enabled:
            updatedOrg.ot_round_off_enabled !== null && updatedOrg.ot_round_off_enabled !== undefined
              ? toBool(updatedOrg.ot_round_off_enabled)
              : toBool(form.ot_round_off_enabled),
          ot_round_off_mins:
            updatedOrg.ot_round_off_mins !== null && updatedOrg.ot_round_off_mins !== undefined
              ? String(updatedOrg.ot_round_off_mins)
              : String(roundOffMinsValue),
          brand_color: normalizeHexColor(updatedOrg.brand_color) || normalizedColor,
          logo_url: updatedOrg.logo_url || "",
          favicon_url: updatedOrg.favicon_url || "",
        };
        setForm(nextForm);
        setInitialForm(nextForm);
        setBrandingFromOrganization(updatedOrg);
      }
      setLogoFile(null);
      setFaviconFile(null);
      setRemoveLogo(false);
      setRemoveFavicon(false);
      toast.success(response?.message || "Organization profile updated successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update organization profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#F0F0F0] p-6 text-sm text-gray-500">
        Loading organization settings...
      </div>
    );
  }

  const hasCustomLogo = Boolean(logoFile || form.logo_url);
  const hasCustomFavicon = Boolean(faviconFile || form.favicon_url);

  return (
    <div className="bg-[#FAFAFA] rounded-2xl border border-[#F0F0F0] p-6 flex flex-col gap-5">
      <div className="bg-white rounded-2xl border border-[#F0F0F0] p-6 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Company Profile</h3>
          <p className="text-sm text-gray-500 mt-1">Manage your branding, legal details, and contact info.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="px-8 py-3 bg-[#FBD9CC] text-[#6B2D0F] text-sm font-semibold rounded-xl border-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-[#EB4000] text-white text-sm font-semibold rounded-xl border-none cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-[#EDEDED] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Image size={18} className="text-[#EB4000]" />
            <h4 className="text-lg font-bold text-gray-900">Company Logo</h4>
          </div>
          <label className="border border-dashed border-[#D9E2EC] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer">
            <img src={logoPreview} alt="Company logo" className="w-20 h-20 object-contain rounded-lg mb-3" />
            <p className="text-sm font-semibold text-gray-800">Click to Upload Logo</p>
            <p className="text-xs text-gray-500">PNG, JPG up to 1MB</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
          </label>
          {hasCustomLogo && (
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="mt-3 w-full rounded-xl border border-[#F3C9B8] bg-[#FFF4EF] px-3 py-2 text-xs font-semibold text-[#8C3A16]"
            >
              Cancel Logo
            </button>
          )}
        </div>

        <div className="bg-white border border-[#EDEDED] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Upload size={18} className="text-[#EB4000]" />
            <h4 className="text-lg font-bold text-gray-900">Favicon</h4>
          </div>
          <label className="border border-dashed border-[#D9E2EC] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer">
            <img src={faviconPreview} alt="Favicon" className="w-12 h-12 object-contain rounded mb-3" />
            <p className="text-sm font-semibold text-gray-800">Click to Upload Favicon</p>
            <p className="text-xs text-gray-500">ICO, PNG up to 1MB</p>
            <input
              type="file"
              accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleFaviconChange}
            />
          </label>
          {hasCustomFavicon && (
            <button
              type="button"
              onClick={handleRemoveFavicon}
              className="mt-3 w-full rounded-xl border border-[#F3C9B8] bg-[#FFF4EF] px-3 py-2 text-xs font-semibold text-[#8C3A16]"
            >
              Cancel Favicon
            </button>
          )}
        </div>

        <div className="bg-white border border-[#EDEDED] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} className="text-[#EB4000]" />
            <h4 className="text-lg font-bold text-gray-900">Brand Theme</h4>
          </div>
          <label className="text-sm text-gray-600 font-semibold mb-2 block">Primary Color</label>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-[72px] h-[72px] rounded-xl border border-[#E5E7EB]"
              style={{ backgroundColor: normalizeHexColor(form.brand_color) || defaults.DEFAULT_BRAND_COLOR }}
            />
            <input
              type="text"
              value={form.brand_color}
              onChange={handleColorTextChange}
              placeholder="#EB4000"
              className="flex-1 border border-[#D1D5DB] rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none"
            />
          </div>
          <div className="relative w-full border border-dashed border-[#C7D2FE] rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2 cursor-pointer overflow-hidden">
            <Palette size={16} />
            Pick Color
            <input
              type="color"
              value={normalizeHexColor(form.brand_color) || defaults.DEFAULT_BRAND_COLOR}
              onChange={handleColorPickerChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Pick brand color"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#EDEDED] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-[#EB4000]" />
          <h4 className="text-lg font-bold text-gray-900">General Information</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">Company Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleInput}
              placeholder="Enter your company's legal name"
              className="w-full border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">Website</label>
            <input
              name="website"
              value={form.website}
              onChange={handleInput}
              placeholder="https://yourcompany.com"
              className="w-full border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">Founded Year</label>
            <input
              name="founded_year"
              value={form.founded_year}
              onChange={handleInput}
              placeholder="e.g. 2020"
              className="w-full border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">Company Code</label>
            <input
              value={form.company_code}
              disabled
              className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm bg-[#F8FAFC] text-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#EDEDED] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-[#EB4000]" />
          <h4 className="text-lg font-bold text-gray-900">Contact Information</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">Registered Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleInput}
              rows={3}
              placeholder="Enter your company's registered address"
              className="w-full border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">Email Address</label>
            <input
              type="email"
              name="contact_email"
              value={form.contact_email}
              onChange={handleEmailChange}
              placeholder="contact@company.com"
              className={`w-full border rounded-xl px-4 py-3 text-sm ${
                validationErrors.contact_email ? "border-red-300" : "border-[#CBD5E1]"
              }`}
            />
            {validationErrors.contact_email && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.contact_email}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">Phone Number</label>
            <div
              className={`flex items-center w-full border rounded-xl overflow-hidden bg-white ${
                validationErrors.phone_number ? "border-red-300" : "border-[#CBD5E1]"
              }`}
            >
              <span className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-[#CBD5E1] bg-[#F8FAFC]">
                +91
              </span>
              <input
                type="tel"
                value={form.phone_number}
                onChange={handlePhoneChange}
                placeholder="9876543210"
                className="flex-1 px-4 py-3 text-sm focus:outline-none"
              />
            </div>
            {validationErrors.phone_number && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.phone_number}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#EDEDED] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-[#EB4000]" />
          <h4 className="text-lg font-bold text-gray-900">Attendance Settings</h4>
        </div>
        <div className="flex flex-col gap-4">
          <div className="max-w-md">
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">Late Grace Period (Minutes)</label>
            <input
              type="number"
              name="late_grace_period_mins"
              min={0}
              max={60}
              value={form.late_grace_period_mins}
              onChange={handleInput}
              placeholder="0"
              className="w-full border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Allowed range: 0–60 minutes</p>
          </div>

          <div className="rounded-xl border border-[#CBD5E1] p-4 flex flex-col gap-4">
            <p className="text-sm font-bold text-gray-900">Overtime</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Hide Overtime</p>
                  <p className="text-xs text-gray-500 mt-1">When enabled, overtime is hidden across the admin panel.</p>
                </div>
                <ToggleSwitch
                  checked={Boolean(form.display_ot)}
                  disabled={saving || loading}
                  onToggle={() => setForm((prev) => ({ ...prev, display_ot: !prev.display_ot }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">OT Round Off</p>
                  <p className="text-xs text-gray-500 mt-1">Round overtime to the nearest interval when enabled.</p>
                </div>
                <ToggleSwitch
                  checked={Boolean(form.ot_round_off_enabled)}
                  disabled={saving || loading || form.display_ot}
                  onToggle={() =>
                    setForm((prev) => ({ ...prev, ot_round_off_enabled: !prev.ot_round_off_enabled }))
                  }
                />
              </div>
              <div className="md:col-span-2 max-w-md">
                <label className="text-sm font-semibold text-[#64748B] mb-1 block">Round Off Minutes</label>
                <input
                  type="number"
                  name="ot_round_off_mins"
                  min={1}
                  max={60}
                  value={form.ot_round_off_mins}
                  onChange={handleInput}
                  placeholder="15"
                  disabled={form.display_ot || !form.ot_round_off_enabled || saving || loading}
                  className="w-full border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Allowed range: 1–60 minutes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#EDEDED] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#EB4000]" />
            <h4 className="text-lg font-bold text-gray-900">Statutory Information</h4>
          </div>
          <span className="text-sm font-semibold text-[#EB4000]">Legal IDs</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">CIN</label>
            <input
              name="cin"
              value={form.cin}
              onChange={handleInput}
              placeholder="U12345XX1234XXX123456"
              className="w-full border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">GSTIN</label>
            <input
              name="gstin"
              value={form.gstin}
              onChange={handleInput}
              placeholder="12ABCDE1234F1Z5"
              className="w-full border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#64748B] mb-1 block">PF#</label>
            <input
              name="pf_number"
              value={form.pf_number}
              onChange={handleInput}
              placeholder="12ABCDE1234F1Z5"
              className="w-full border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#2563EB]">
          These legal identifiers will appear on generated payslips and official documents.
        </div>
      </div>
    </div>
  );
};

export default OrganizationProfile;
