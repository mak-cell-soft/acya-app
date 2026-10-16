import { useTenantStore } from '@/store/use-tenant-store';

export interface BrandingConfig {
  name?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  language?: string | null;
  currency?: string | null;
  status?: string | null;
}

/**
 * Validates whether a string is a valid 3- or 6-digit hex color (e.g. #3B82F6, #2563eb, #FFF)
 */
export function isValidHexColor(color: string | null | undefined): boolean {
  if (!color || typeof color !== 'string') return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color.trim());
}

/**
 * Validates a web URL (http://, https://, or relative /)
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Applies branding configuration:
 * 1. Updates CSS custom properties on document.documentElement for Tailwind v4 and theme variables
 * 2. Injects/updates the dynamic favicon <link rel="icon">
 * 3. Updates the global Zustand tenant store (triggers reactive re-renders in Sidebar, Auth, etc.)
 */
export function applyBranding(config: Partial<BrandingConfig>): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // 1. Primary Color
  if (config.primaryColor !== undefined) {
    if (config.primaryColor && isValidHexColor(config.primaryColor)) {
      const color = config.primaryColor.trim();
      root.style.setProperty('--primary', color);
      root.style.setProperty('--color-primary', color);
      root.style.setProperty('--corp-blue-600', color);
      root.style.setProperty('--color-corp-blue-600', color);
      root.style.setProperty('--ring', color);
      root.style.setProperty('--color-ring', color);
    } else if (config.primaryColor === '' || config.primaryColor === null) {
      // Revert to CSS default theme
      root.style.removeProperty('--primary');
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--corp-blue-600');
      root.style.removeProperty('--color-corp-blue-600');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--color-ring');
    }
  }

  // 2. Secondary Color
  if (config.secondaryColor !== undefined) {
    if (config.secondaryColor && isValidHexColor(config.secondaryColor)) {
      const color = config.secondaryColor.trim();
      root.style.setProperty('--secondary', color);
      root.style.setProperty('--color-secondary', color);
      root.style.setProperty('--sidebar-bg', color);
    } else if (config.secondaryColor === '' || config.secondaryColor === null) {
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--sidebar-bg');
    }
  }

  // 3. Dynamic Favicon
  if (config.faviconUrl !== undefined) {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0]?.appendChild(link);
    }

    if (config.faviconUrl && isValidUrl(config.faviconUrl)) {
      link.href = config.faviconUrl.trim();
    } else if (config.faviconUrl === '' || config.faviconUrl === null) {
      link.href = '/favicon.ico';
    }
  }

  // 4. Reactive State in Zustand Store
  useTenantStore.getState().setBranding(config);
}
