import { ROLE_TRANSLATIONS, Roles } from "../../models/components/appuser";

/**
 * Gets the translation for a role from ROLE_TRANSLATIONS.
 * @param role - The role from the Roles enum.
 * @returns The translated string for the role or a default message if not found.
 */
export function getRoleTranslation(role: string): string {
    // Convert the string role to its corresponding numeric value
    const roleNumber = Roles[role as keyof typeof Roles];
    return ROLE_TRANSLATIONS[roleNumber] || 'Translation not available';
}


