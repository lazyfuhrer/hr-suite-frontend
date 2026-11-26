import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Check, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { getSwitchableOrgs, switchOrgHandler } from "../../api/auth";
import { setCredentials } from "../../store/slices/authSlice";

const canSwitchOrganizations = (user) =>
  ["admin", "hr"].includes(String(user?.role || "").toLowerCase());

const getOrgInitials = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const OrgSwitcher = () => {
  const dispatch = useDispatch();
  const { user, refreshToken } = useSelector((state) => state.auth);

  const [organizations, setOrganizations] = useState([]);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMultipleOrgs, setHasMultipleOrgs] = useState(false);
  const [switchingOrgId, setSwitchingOrgId] = useState(null);

  const canSwitch = canSwitchOrganizations(user);

  useEffect(() => {
    if (!canSwitch) {
      setHasMultipleOrgs(false);
      setOrganizations([]);
      setCurrentOrgId(null);
      return;
    }

    let cancelled = false;

    const loadOrgs = async () => {
      setLoading(true);
      try {
        const data = await getSwitchableOrgs();
        if (cancelled) return;

        const orgs = data?.organizations || [];
        const currentId =
          data?.current_org_id ||
          orgs.find((o) => o.is_current)?.org_id ||
          null;

        setOrganizations(orgs);
        setCurrentOrgId(currentId);
        setHasMultipleOrgs(orgs.length > 1);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load switchable organizations", error);
          toast.error(
            error?.response?.data?.message || "Failed to load organizations"
          );
          setHasMultipleOrgs(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOrgs();

    return () => {
      cancelled = true;
    };
  }, [canSwitch, user?.org_id]);

  if (!canSwitch || !hasMultipleOrgs) return null;

  const handleSwitch = async (org) => {
    if (!org?.org_id || org.is_current || org.org_id === currentOrgId) return;
    if (switchingOrgId) return;

    const token = refreshToken || localStorage.getItem("refresh_token");
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    setSwitchingOrgId(org.org_id);
    try {
      const res = await switchOrgHandler({
        orgId: org.org_id,
        refreshToken: token,
      });
      const role = String(res?.user?.role || "").toLowerCase();

      if (role === "employee") {
        toast.error(
          "Employee accounts are not allowed to access this admin panel."
        );
        return;
      }

      dispatch(
        setCredentials({
          user: res.user,
          token: res.token,
          refreshToken: res.refresh_token,
        })
      );

      toast.success(`Switched to ${org.name}`);

      if (res.user?.must_change_password) {
        window.location.assign("/reset-password");
      } else {
        window.location.assign("/dashboard");
      }
    } catch (error) {
      console.error("Failed to switch organization", error);
      toast.error(
        error?.response?.data?.message || "Failed to switch organization"
      );
    } finally {
      setSwitchingOrgId(null);
    }
  };

  return (
    <div className="border-b border-gray-100">
      <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        Switch organization
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto custom-scrollbar pb-2">
          {organizations.map((org) => {
            const isCurrent = org.is_current || org.org_id === currentOrgId;
            const isSwitching = switchingOrgId === org.org_id;

            return (
              <button
                key={org.org_id}
                type="button"
                disabled={isCurrent || !!switchingOrgId}
                onClick={() => handleSwitch(org)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isCurrent
                    ? "bg-[#FFF4F0] cursor-default"
                    : "hover:bg-gray-50 disabled:opacity-60"
                }`}
              >
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {getOrgInitials(org.name)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {org.name}
                  </p>
                  {org.company_code && (
                    <p className="text-[10px] text-gray-400 font-medium truncate">
                      {org.company_code}
                    </p>
                  )}
                </div>

                {isSwitching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)] flex-shrink-0" />
                ) : isCurrent ? (
                  <Check className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrgSwitcher;
export { canSwitchOrganizations };
