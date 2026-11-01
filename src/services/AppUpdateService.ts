import { AppState, Linking, NativeEventEmitter, NativeModules, Platform } from "react-native";
import DeviceInfo from "react-native-device-info";

// Values from com.google.android.play.core.install.model (app-update 2.1.0).
export enum InstallStatus {
    UNKNOWN = 0, PENDING = 1, DOWNLOADING = 2, INSTALLING = 3,
    INSTALLED = 4, FAILED = 5, CANCELED = 6, DOWNLOADED = 11,
}
export enum UpdateAvailability { UNKNOWN = 0, NOT_AVAILABLE = 1, AVAILABLE = 2, IN_PROGRESS = 3 }
export enum UpdateType { FLEXIBLE = 0, IMMEDIATE = 1 }

export interface InstallState {
    installStatus: InstallStatus;
    bytesDownloaded: number;
    totalBytesToDownload: number;
}
export interface PlayUpdateInfo extends InstallState {
    updateAvailability: UpdateAvailability;
    availableVersionCode: number;
    flexibleAllowed: boolean;
    immediateAllowed: boolean;
    updatePriority: number;
    clientVersionStalenessDays: number | null;
}
interface PlayUpdateModule {
    getUpdateInfo(): Promise<PlayUpdateInfo>;
    startUpdate(type: UpdateType): Promise<"accepted" | "canceled" | "failed" | "in_progress">;
    completeUpdate(): Promise<void>;
    addListener(name: string): void;
    removeListeners(count: number): void;
}
export interface AppUpdateState extends InstallState {
    info: PlayUpdateInfo | null;
    promptVisible: boolean;
    completing: boolean;
}

const initialState: AppUpdateState = {
    info: null, promptVisible: false, completing: false,
    installStatus: InstallStatus.UNKNOWN, bytesDownloaded: 0, totalBytesToDownload: 0,
};
const log = (message: string, error?: unknown) => {
    if (__DEV__) console.log(`[AppUpdate] ${message}`, error ?? "");
};
const hasActiveInstall = (status: InstallStatus) => [
    InstallStatus.PENDING, InstallStatus.DOWNLOADING, InstallStatus.DOWNLOADED, InstallStatus.INSTALLING,
].includes(status);

// Policy extension point: Play priority/staleness are available, but do not force updates.
export const selectUpdateType = (_info: PlayUpdateInfo): UpdateType => UpdateType.FLEXIBLE;

export class AppUpdateService {
    private state = initialState;
    private observers = new Set<() => void>();
    private promptedVersions = new Set<number>();
    private resumedVersions = new Set<number>();
    private running = false;
    private generation = 0;
    private revision = 0;
    private foregroundRevision = 0;
    private checking = false;
    private flowStarted = false;
    private statusSubscription?: { remove(): void };
    private appStateSubscription?: { remove(): void };

    constructor(private readonly native: PlayUpdateModule | undefined = NativeModules.AppUpdate) {}

    getSnapshot = () => this.state;
    subscribe = (observer: () => void) => {
        this.observers.add(observer);
        return () => { this.observers.delete(observer); };
    };
    private publish(change: Partial<AppUpdateState>) {
        this.state = { ...this.state, ...change };
        this.observers.forEach(observer => observer());
    }
    private get active() { return this.running && AppState.currentState === "active"; }

    start = () => {
        if (this.running || Platform.OS !== "android" || __DEV__ || !this.native) return;
        this.running = true;
        const generation = ++this.generation;
        try {
            this.statusSubscription = new NativeEventEmitter(this.native).addListener(
                "AppUpdateStatus", (state: InstallState) => {
                    if (!this.running || generation !== this.generation) return;
                    ++this.revision; // A late query must not overwrite a newer install event.
                    this.publish({ ...state, promptVisible: false,
                        completing: [InstallStatus.DOWNLOADED, InstallStatus.INSTALLING]
                            .includes(state.installStatus) && this.state.completing });
                    log(`Install status ${state.installStatus}`);
                },
            );
            let previous = AppState.currentState;
            this.appStateSubscription = AppState.addEventListener("change", next => {
                ++this.foregroundRevision;
                const resumed = next === "active" && previous !== "active";
                previous = next;
                if (resumed) void this.checkForUpdate();
            });
            void this.checkForUpdate();
        } catch (error) {
            log("Update API unavailable", error);
            this.stop();
        }
    };

    stop = () => {
        this.running = false;
        ++this.generation;
        this.statusSubscription?.remove();
        this.appStateSubscription?.remove();
        this.statusSubscription = undefined;
        this.appStateSubscription = undefined;
        this.publish({ promptVisible: false });
    };

    checkForUpdate = async (): Promise<void> => {
        if (!this.active || !this.native || this.checking || this.flowStarted) return;
        this.checking = true;
        const generation = this.generation;
        const revision = this.revision;
        const foregroundRevision = this.foregroundRevision;
        try {
            log("Checking Google Play...");
            const info = await this.native.getUpdateInfo();
            if (!this.active || generation !== this.generation || revision !== this.revision ||
                foregroundRevision !== this.foregroundRevision) return;
            this.publish({ info, installStatus: info.installStatus,
                bytesDownloaded: info.bytesDownloaded, totalBytesToDownload: info.totalBytesToDownload,
                completing: [InstallStatus.DOWNLOADED, InstallStatus.INSTALLING]
                    .includes(info.installStatus) && this.state.completing });

            // Recover only an immediate flow that Play says was already started.
            if (info.updateAvailability === UpdateAvailability.IN_PROGRESS && info.immediateAllowed) {
                this.publish({ promptVisible: false });
                if (!this.resumedVersions.has(info.availableVersionCode)) {
                    this.resumedVersions.add(info.availableVersionCode);
                    void this.startUpdate(UpdateType.IMMEDIATE, true);
                }
                return;
            }
            if (hasActiveInstall(info.installStatus)) {
                this.promptedVersions.add(info.availableVersionCode);
                this.publish({ promptVisible: false });
                return;
            }
            const type = selectUpdateType(info);
            const allowed = type === UpdateType.FLEXIBLE ? info.flexibleAllowed : info.immediateAllowed;
            if (info.updateAvailability === UpdateAvailability.AVAILABLE && allowed) {
                if (!this.promptedVersions.has(info.availableVersionCode)) {
                    this.promptedVersions.add(info.availableVersionCode);
                    this.publish({ promptVisible: true });
                    log("Update available");
                }
            } else {
                this.publish({ promptVisible: false });
                log("No eligible update available");
            }
        } catch (error) {
            log("Update API unavailable", error);
        } finally {
            this.checking = false;
            // A root remount may have occurred while the old request was pending.
            if (this.active && (generation !== this.generation ||
                foregroundRevision !== this.foregroundRevision)) void this.checkForUpdate();
        }
    };

    dismiss = () => { this.publish({ promptVisible: false }); };

    startUpdate = async (type = this.state.info ? selectUpdateType(this.state.info) : UpdateType.FLEXIBLE,
        recovering = false): Promise<void> => {
        if (!this.active || !this.native || this.flowStarted ||
            (!recovering && (!this.state.promptVisible || hasActiveInstall(this.state.installStatus)))) return;
        this.flowStarted = true;
        ++this.revision;
        this.publish({ promptVisible: false });
        try {
            const result = await this.native.startUpdate(type);
            log(`Update consent: ${result}`);
        } catch (error) {
            log("Unable to start update", error);
        } finally {
            this.flowStarted = false;
            if (this.active) void this.checkForUpdate();
        }
    };

    completeUpdate = async (): Promise<void> => {
        if (!this.active || !this.native || this.state.completing ||
            this.state.installStatus !== InstallStatus.DOWNLOADED) return;
        this.publish({ completing: true });
        try {
            log("Completing update");
            await this.native.completeUpdate();
            // Keep the action disabled until Play installs/restarts or reports a new state.
        } catch (error) {
            log("Unable to complete update", error);
            this.publish({ completing: false }); // Keep downloaded UI available for an explicit retry.
        }
    };
}

export const appUpdateService = new AppUpdateService();

/** Optional user-initiated listing navigation; never used to detect update availability. */
export const openPlayStore = async (): Promise<void> => {
    if (Platform.OS !== "android") return;
    try {
        const packageId = encodeURIComponent(DeviceInfo.getBundleId());
        if (!packageId) return;
        try {
            await Linking.openURL(`market://details?id=${packageId}`);
        } catch {
            await Linking.openURL(`https://play.google.com/store/apps/details?id=${packageId}`);
        }
    } catch (error) {
        log("Unable to open Google Play", error);
    }
};
