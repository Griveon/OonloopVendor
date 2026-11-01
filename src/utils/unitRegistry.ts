import { useEffect, useState } from "react";

export interface UnitItem {
    _id: string;
    name: string;
    symbol?: string;
    code?: string;
}

const STORAGE_KEY = "@oonloop_cached_units_map";

const safeGetStorage = () => {
    try {
        const mod = require("@react-native-async-storage/async-storage");
        return mod?.default || mod;
    } catch (_) {
        return null;
    }
};

const safeGetItem = async (key: string): Promise<string | null> => {
    try {
        const storage = safeGetStorage();
        if (storage && typeof storage.getItem === "function") {
            return await storage.getItem(key);
        }
    } catch (_) {}
    return null;
};

const safeSetItem = async (key: string, value: string): Promise<void> => {
    try {
        const storage = safeGetStorage();
        if (storage && typeof storage.setItem === "function") {
            await storage.setItem(key, value);
        }
    } catch (_) {}
};

// Seed map with known or common units
const seedUnits: Record<string, UnitItem> = {
    // Unit ID for "gram" from the vendor order catalog
    "69dd218d89e7db27db35d98a": { _id: "69dd218d89e7db27db35d98a", name: "gram" },
};

class UnitRegistry {
    private cache: Map<string, UnitItem> = new Map();
    private listeners: Set<() => void> = new Set();
    private fetchPromise: Promise<void> | null = null;
    private initialized = false;

    constructor() {
        Object.entries(seedUnits).forEach(([id, unit]) => {
            this.cache.set(id.toLowerCase(), unit);
        });
        this.loadFromStorage();
    }

    private async loadFromStorage() {
        try {
            const raw = await safeGetItem(STORAGE_KEY);
            if (raw) {
                const parsed: Record<string, UnitItem> = JSON.parse(raw);
                Object.entries(parsed).forEach(([id, unit]) => {
                    this.cache.set(id.toLowerCase(), unit);
                });
                this.notify();
            }
        } catch (_) {
            // silent fallback
        } finally {
            this.initialized = true;
        }
    }

    private notify() {
        this.listeners.forEach((fn) => {
            try {
                fn();
            } catch (_) {}
        });
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    registerUnits(units: UnitItem[] | unknown[] | undefined | null) {
        if (!Array.isArray(units) || units.length === 0) return;
        let changed = false;
        const currentToSave: Record<string, UnitItem> = {};

        units.forEach((item: any) => {
            if (!item || !item._id) return;
            const id = String(item._id).toLowerCase();
            const unitObj: UnitItem = {
                _id: String(item._id),
                name: String(item.name || item.symbol || item.code || "").trim(),
                symbol: item.symbol ? String(item.symbol).trim() : undefined,
                code: item.code ? String(item.code).trim() : undefined,
            };
            this.cache.set(id, unitObj);
            changed = true;
        });

        if (changed) {
            this.cache.forEach((val, key) => {
                currentToSave[key] = val;
            });
            safeSetItem(STORAGE_KEY, JSON.stringify(currentToSave)).catch(() => {});
            this.notify();
        }
    }

    async fetchAndCacheUnits(): Promise<void> {
        if (this.fetchPromise) return this.fetchPromise;
        this.fetchPromise = (async () => {
            try {
                const apiMod = require("../constants/ApiClient");
                const endpointMod = require("../constants/ApiEndpoints");
                const getRequest = apiMod?.getRequest;
                const endpoint = endpointMod?.API_ENDPOINTS?.GETALLUNITS;
                if (!getRequest || !endpoint) return;

                const res = await getRequest(endpoint, undefined, true, false);
                const data = (res as any)?.data;
                if (Array.isArray(data)) {
                    this.registerUnits(data);
                }
            } catch (_) {
                // silent
            } finally {
                this.fetchPromise = null;
            }
        })();
        return this.fetchPromise;
    }

    getUnit(unitId: string): UnitItem | undefined {
        if (!unitId) return undefined;
        return this.cache.get(String(unitId).toLowerCase());
    }

    resolveUnitName(unit: any): string {
        if (!unit) return "";
        if (typeof unit === "object") {
            return String(unit.symbol || unit.name || unit.code || "").trim();
        }
        if (typeof unit === "string") {
            const trimmed = unit.trim();
            // If it is a 24-character hexadecimal ObjectId
            if (/^[a-f\d]{24}$/i.test(trimmed)) {
                const found = this.cache.get(trimmed.toLowerCase());
                if (found) {
                    return found.symbol || found.name || found.code || "";
                }
                // Try background fetch if not already in cache
                this.fetchAndCacheUnits().catch(() => {});
                return "";
            }
            return trimmed;
        }
        return "";
    }
}

export const unitRegistry = new UnitRegistry();

export const useUnitRegistry = () => {
    const [, setTick] = useState(0);

    useEffect(() => {
        const unsubscribe = unitRegistry.subscribe(() => {
            setTick((t) => t + 1);
        });
        return unsubscribe;
    }, []);

    return {
        resolveUnitName: (unit: any) => unitRegistry.resolveUnitName(unit),
        fetchAndCacheUnits: () => unitRegistry.fetchAndCacheUnits(),
    };
};
