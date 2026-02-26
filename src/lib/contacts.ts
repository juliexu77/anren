import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';

export interface ContactEntry {
  name: string;
  phone?: string;
  email?: string;
}

/**
 * Fetch contacts using the best available method:
 * 1. Native Capacitor plugin (iOS/Android)
 * 2. Browser Contact Picker API (Chrome Android)
 * 3. Returns null if neither available
 */
export async function fetchDeviceContacts(): Promise<ContactEntry[] | null> {
  // Native path (Capacitor)
  if (Capacitor.isNativePlatform()) {
    const permission = await Contacts.requestPermissions();
    if (permission.contacts !== 'granted') {
      throw new Error('Contact permission denied');
    }

    const result = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
      },
    });

    return result.contacts
      .filter((c) => c.name?.display)
      .map((c) => ({
        name: c.name!.display!,
        phone: c.phones?.[0]?.number || undefined,
        email: c.emails?.[0]?.address || undefined,
      }));
  }

  // Browser Contact Picker API fallback
  if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
    const props = ['name', 'tel', 'email'];
    // @ts-ignore - Contact Picker API
    const results = await navigator.contacts.select(props, { multiple: true });
    return results.map((c: any) => ({
      name: c.name?.[0] || 'Unknown',
      phone: c.tel?.[0] || undefined,
      email: c.email?.[0] || undefined,
    }));
  }

  return null;
}

/**
 * Check if any contacts API is available
 */
export function hasContactsSupport(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) return true;
  return false;
}
