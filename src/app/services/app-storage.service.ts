import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
    providedIn: 'root'
})
export class AppStorageService {

    set<T>(key: string, value: T): void {
        Preferences.set({
            key: key,
            value: JSON.stringify(value),
        });
    }

    async get<T>(key: string, defaultValue?: T): Promise<T> {
        try {
            const { value } = await Preferences.get({ key });
            if (value) {
                const parsedValue = JSON.parse(value) as T;
                // If parsedValue is an array, return a shallow copy to ensure extensibility
                if (Array.isArray(parsedValue)) {
                    return [...parsedValue] as unknown as T;
                }
                return parsedValue;
            } else {
                // If defaultValue is an array, return a shallow copy
                if (Array.isArray(defaultValue)) {
                    return [...defaultValue] as unknown as T;
                }
                return defaultValue as T;
            }
        } catch {
            if (Array.isArray(defaultValue)) {
                return [...defaultValue] as unknown as T;
            }
            return defaultValue as T;
        }
    }

    remove(key: string): void {
        Preferences.remove({ key: key });
    }

    /**
   * Clear localstorage.
   * @returns {void}
   */
  clear(): void {
    Preferences.clear();
  }
}