/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getOrganizationSettings } from "../api/organizations";

const DEFAULT_BRAND_COLOR = "#EB4000";
const DEFAULT_COMPANY_NAME = "Shloka Solutions";
const DEFAULT_COMPANY_LOGO = "/shloka-arch-nobg.png";
const DEFAULT_FAVICON = "/shloka-arch-nobg.png";

const BrandingContext = createContext(null);

const normalizeHexColor = (color) => {
  if (!color || typeof color !== "string") return DEFAULT_BRAND_COLOR;
  const value = color.trim().replace(/^#/, "");
  const isShortHex = /^[0-9A-Fa-f]{3}$/.test(value);
  const isLongHex = /^[0-9A-Fa-f]{6}$/.test(value);
  if (!isShortHex && !isLongHex) return DEFAULT_BRAND_COLOR;
  if (isShortHex) {
    return `#${value
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase()}`;
  }
  return `#${value.toUpperCase()}`;
};

const hexToRgb = (hex) => {
  const color = normalizeHexColor(hex).replace("#", "");
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
};

const hexToRgbObject = (hex) => {
  const color = normalizeHexColor(hex).replace("#", "");
  return {
    r: parseInt(color.slice(0, 2), 16),
    g: parseInt(color.slice(2, 4), 16),
    b: parseInt(color.slice(4, 6), 16),
  };
};

const rgbObjectToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

const mixWithWhite = (hex, ratio) => {
  const { r, g, b } = hexToRgbObject(hex);
  const t = Math.max(0, Math.min(1, ratio));
  return rgbObjectToHex({
    r: r + (255 - r) * t,
    g: g + (255 - g) * t,
    b: b + (255 - b) * t,
  });
};

const darken = (hex, ratio) => {
  const { r, g, b } = hexToRgbObject(hex);
  const t = Math.max(0, Math.min(1, ratio));
  return rgbObjectToHex({
    r: r * (1 - t),
    g: g * (1 - t),
    b: b * (1 - t),
  });
};

const getStorageKey = (orgId) => `organization_branding_${orgId || "default"}`;

const readStoredBranding = (orgId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(orgId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStoredBranding = (orgId, branding) => {
  try {
    localStorage.setItem(getStorageKey(orgId), JSON.stringify(branding));
  } catch {
    // no-op
  }
};

const readBestStoredBranding = (orgId) => {
  const storedForOrg = readStoredBranding(orgId);
  if (storedForOrg) return storedForOrg;
  return readStoredBranding("default");
};

const getInitialBrandingFromStorage = () => {
  try {
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    const orgId = user?.org_id || "default";

    const storedForOrg = readStoredBranding(orgId);
    if (storedForOrg) return storedForOrg;

    const storedDefault = readStoredBranding("default");
    if (storedDefault) return storedDefault;
  } catch {
    // no-op
  }

  return buildBranding(null);
};

const buildBranding = (organization) => {
  if (!organization) {
    return {
      name: DEFAULT_COMPANY_NAME,
      logoUrl: DEFAULT_COMPANY_LOGO,
      faviconUrl: DEFAULT_FAVICON,
      brandColor: DEFAULT_BRAND_COLOR,
      organization: null,
    };
  }

  return {
    name: organization.name || DEFAULT_COMPANY_NAME,
    logoUrl: organization.logo_url || DEFAULT_COMPANY_LOGO,
    faviconUrl: organization.favicon_url || DEFAULT_FAVICON,
    brandColor: normalizeHexColor(organization.brand_color || DEFAULT_BRAND_COLOR),
    organization,
  };
};

const applyBrandingToDocument = (branding) => {
  const safeColor = normalizeHexColor(branding.brandColor);
  const brandStrong = darken(safeColor, 0.08);
  const brandSoft = mixWithWhite(safeColor, 0.82);
  const brandSoftAlt = mixWithWhite(safeColor, 0.9);
  const brandSoftBorder = mixWithWhite(safeColor, 0.72);

  const root = document.documentElement;
  root.style.setProperty("--brand-primary", safeColor);
  root.style.setProperty("--brand-primary-rgb", hexToRgb(safeColor));
  root.style.setProperty("--brand-strong", brandStrong);
  root.style.setProperty("--brand-strong-rgb", hexToRgb(brandStrong));
  root.style.setProperty("--brand-soft", brandSoft);
  root.style.setProperty("--brand-soft-rgb", hexToRgb(brandSoft));
  root.style.setProperty("--brand-soft-alt", brandSoftAlt);
  root.style.setProperty("--brand-soft-alt-rgb", hexToRgb(brandSoftAlt));
  root.style.setProperty("--brand-soft-border", brandSoftBorder);
  root.style.setProperty("--brand-soft-border-rgb", hexToRgb(brandSoftBorder));

  const title = branding.name || DEFAULT_COMPANY_NAME;
  document.title = `${title} | HR Management`;

  let favicon = document.querySelector("link[rel~='icon']");
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.setAttribute("rel", "icon");
    document.head.appendChild(favicon);
  }
  favicon.setAttribute("href", branding.faviconUrl || DEFAULT_FAVICON);
  favicon.setAttribute("type", "image/png");

  let themeColor = document.querySelector("meta[name='theme-color']");
  if (!themeColor) {
    themeColor = document.createElement("meta");
    themeColor.setAttribute("name", "theme-color");
    document.head.appendChild(themeColor);
  }
  themeColor.setAttribute("content", safeColor);
};

export const BrandingProvider = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const orgId = user?.org_id || null;

  const [branding, setBranding] = useState(getInitialBrandingFromStorage);

  const lastFetchedOrgRef = useRef(null);

  const setBrandingFromOrganization = useCallback(
    (organization) => {
      const nextBranding = buildBranding(organization);
      setBranding(nextBranding);
      writeStoredBranding(orgId || organization?.id || "default", nextBranding);
      writeStoredBranding("default", nextBranding);
    },
    [orgId]
  );

  const refreshBranding = useCallback(async () => {
    if (!isAuthenticated) return null;
    const response = await getOrganizationSettings();
    const organization = response?.data || null;
    if (organization) {
      setBrandingFromOrganization(organization);
    }
    return organization;
  }, [isAuthenticated, setBrandingFromOrganization]);

  useLayoutEffect(() => {
    applyBrandingToDocument(branding);
  }, [branding]);

  useEffect(() => {
    if (!isAuthenticated) {
      const defaultBranding = readBestStoredBranding("default") || buildBranding(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBranding(defaultBranding);
      return;
    }

    const stored = readBestStoredBranding(orgId || "default");
    if (stored) {
      setBranding(stored);
    }

    if (lastFetchedOrgRef.current === orgId) return;
    lastFetchedOrgRef.current = orgId;

    refreshBranding().catch(() => {
      // Ignore background branding fetch errors
    });
  }, [isAuthenticated, orgId, refreshBranding]);

  const value = useMemo(
    () => ({
      branding,
      setBrandingFromOrganization,
      refreshBranding,
      defaults: {
        DEFAULT_BRAND_COLOR,
        DEFAULT_COMPANY_NAME,
        DEFAULT_COMPANY_LOGO,
        DEFAULT_FAVICON,
      },
    }),
    [branding, setBrandingFromOrganization, refreshBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => useContext(BrandingContext);
