import { action, Action } from 'easy-peasy';

export interface SiteSettings {
    name: string;
    locale: string;
    /** Versi panel dari `config('app.version')`; dipakai footer Store (brief-3). */
    version?: string;
    recaptcha: {
        enabled: boolean;
        siteKey: string;
    };
}

export interface SettingsStore {
    data?: SiteSettings;
    setSettings: Action<SettingsStore, SiteSettings>;
}

const settings: SettingsStore = {
    data: undefined,

    setSettings: action((state, payload) => {
        state.data = payload;
    }),
};

export default settings;
