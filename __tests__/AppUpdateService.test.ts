import { AppState, NativeEventEmitter, Platform } from "react-native";
import { AppUpdateService, InstallStatus, PlayUpdateInfo, UpdateAvailability, UpdateType } from "../src/services/AppUpdateService";

const mockStatusListeners = new Set<(state: unknown) => void>();
const mockLifecycleListeners = new Set<(state: string) => void>();
jest.mock("react-native", () => ({
    Platform: { OS: "android" },
    NativeModules: {},
    Linking: { openURL: jest.fn() },
    AppState: { currentState: "active", addEventListener: jest.fn((_name, listener) => {
        mockLifecycleListeners.add(listener);
        return { remove: () => mockLifecycleListeners.delete(listener) };
    }) },
    NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: jest.fn((_name, listener) => {
            mockStatusListeners.add(listener);
            return { remove: () => mockStatusListeners.delete(listener) };
        }),
    })),
}));
jest.mock("react-native-device-info", () => ({ getBundleId: () => "com.oonloopvendor.merchant" }));

const available: PlayUpdateInfo = {
    updateAvailability: UpdateAvailability.AVAILABLE, installStatus: InstallStatus.UNKNOWN,
    availableVersionCode: 39, flexibleAllowed: true, immediateAllowed: true,
    updatePriority: 5, clientVersionStalenessDays: 30, bytesDownloaded: 0, totalBytesToDownload: 100,
};
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const resume = async () => {
    AppState.currentState = "background";
    mockLifecycleListeners.forEach(listener => listener("background"));
    AppState.currentState = "active";
    mockLifecycleListeners.forEach(listener => listener("active"));
    await flush();
};
const emit = (installStatus: InstallStatus) => mockStatusListeners.forEach(listener => listener({
    installStatus, bytesDownloaded: 75, totalBytesToDownload: 100,
}));

describe("Google Play app update lifecycle", () => {
    let service: AppUpdateService;
    let native: {
        getUpdateInfo: jest.Mock;
        startUpdate: jest.Mock;
        completeUpdate: jest.Mock;
        addListener: jest.Mock;
        removeListeners: jest.Mock;
    };
    beforeEach(() => {
        jest.clearAllMocks();
        mockStatusListeners.clear();
        mockLifecycleListeners.clear();
        Object.defineProperty(globalThis, "__DEV__", { value: false, writable: true });
        Platform.OS = "android";
        AppState.currentState = "active";
        native = {
            getUpdateInfo: jest.fn().mockResolvedValue(available),
            startUpdate: jest.fn().mockResolvedValue("accepted"),
            completeUpdate: jest.fn().mockResolvedValue(undefined),
            addListener: jest.fn(), removeListeners: jest.fn(),
        };
        service = new AppUpdateService(native);
    });
    afterEach(() => service.stop());

    it("lets Play decide availability and retains priority/staleness without forcing immediate", async () => {
        service.start();
        await flush();
        expect(service.getSnapshot().promptVisible).toBe(true);
        expect(service.getSnapshot().info?.clientVersionStalenessDays).toBe(30);
        await service.startUpdate();
        expect(native.startUpdate).toHaveBeenCalledWith(UpdateType.FLEXIBLE);
    });

    it.each([
        { updateAvailability: UpdateAvailability.NOT_AVAILABLE },
        { flexibleAllowed: false },
    ])("does not prompt when Play does not permit flexible updates: %j", async change => {
        native.getUpdateInfo.mockResolvedValue({ ...available, ...change });
        service.start();
        await flush();
        expect(service.getSnapshot().promptVisible).toBe(false);
        expect(native.startUpdate).not.toHaveBeenCalled();
    });

    it("Later suppresses repeat prompts across resumes and provider remounts", async () => {
        service.start();
        await flush();
        service.dismiss();
        await resume();
        service.stop();
        service.start();
        await flush();
        expect(service.getSnapshot().promptVisible).toBe(false);
        native.getUpdateInfo.mockResolvedValue({ ...available, availableVersionCode: 40 });
        await resume();
        expect(service.getSnapshot().promptVisible).toBe(true);
    });

    it("deduplicates checks and listener registration", async () => {
        let resolve!: (info: PlayUpdateInfo) => void;
        native.getUpdateInfo.mockReturnValue(new Promise(done => { resolve = done; }));
        service.start();
        service.start();
        void service.checkForUpdate();
        expect(native.getUpdateInfo).toHaveBeenCalledTimes(1);
        expect(NativeEventEmitter).toHaveBeenCalledTimes(1);
        resolve(available);
        await flush();
        expect(mockStatusListeners.size).toBe(1);
        service.stop();
        expect(mockStatusListeners.size).toBe(0);
        expect(mockLifecycleListeners.size).toBe(0);
    });

    it("does not launch two Play dialogs while consent is pending", async () => {
        let resolve!: (result: string) => void;
        native.startUpdate.mockReturnValue(new Promise(done => { resolve = done; }));
        service.start();
        await flush();
        const flow = service.startUpdate();
        void service.startUpdate();
        await resume();
        expect(native.startUpdate).toHaveBeenCalledTimes(1);
        resolve("canceled");
        await flow;
        await resume();
        expect(service.getSnapshot().promptVisible).toBe(false);
    });

    it.each([InstallStatus.PENDING, InstallStatus.DOWNLOADING, InstallStatus.DOWNLOADED,
        InstallStatus.INSTALLING])("recovers status %s without restarting a download", async installStatus => {
        native.getUpdateInfo.mockResolvedValue({ ...available, installStatus });
        service.start();
        await flush();
        expect(service.getSnapshot().installStatus).toBe(installStatus);
        expect(service.getSnapshot().promptVisible).toBe(false);
        await service.startUpdate();
        expect(native.startUpdate).not.toHaveBeenCalled();
    });

    it("recovers a background download on resume and completes only on explicit action", async () => {
        service.start();
        await flush();
        native.getUpdateInfo.mockResolvedValue({ ...available, installStatus: InstallStatus.DOWNLOADED });
        await resume();
        expect(service.getSnapshot().installStatus).toBe(InstallStatus.DOWNLOADED);
        expect(native.completeUpdate).not.toHaveBeenCalled();
        await Promise.all([service.completeUpdate(), service.completeUpdate()]);
        expect(native.completeUpdate).toHaveBeenCalledTimes(1);
    });

    it("keeps the restart action available after an installation failure", async () => {
        service.start();
        await flush();
        emit(InstallStatus.DOWNLOADED);
        native.completeUpdate.mockRejectedValueOnce(new Error("offline"));
        await service.completeUpdate();
        expect(service.getSnapshot().completing).toBe(false);
        expect(service.getSnapshot().installStatus).toBe(InstallStatus.DOWNLOADED);
        await service.completeUpdate();
        expect(native.completeUpdate).toHaveBeenCalledTimes(2);
    });

    it("does not complete twice after a repeated downloaded event", async () => {
        service.start();
        await flush();
        emit(InstallStatus.DOWNLOADED);
        await service.completeUpdate();
        emit(InstallStatus.DOWNLOADED);
        await service.completeUpdate();
        expect(native.completeUpdate).toHaveBeenCalledTimes(1);
    });

    it("handles a failed launch without a repeat prompt or a second tap launching again", async () => {
        native.startUpdate.mockRejectedValue(new Error("Activity destroyed"));
        service.start();
        await flush();
        await service.startUpdate();
        await flush();
        await service.startUpdate();
        await resume();
        expect(native.startUpdate).toHaveBeenCalledTimes(1);
        expect(service.getSnapshot().promptVisible).toBe(false);
    });

    it.each([InstallStatus.PENDING, InstallStatus.DOWNLOADING, InstallStatus.DOWNLOADED,
        InstallStatus.INSTALLING, InstallStatus.INSTALLED, InstallStatus.CANCELED, InstallStatus.FAILED])(
        "handles official listener state %s", async status => {
            service.start();
            await flush();
            emit(status);
            expect(service.getSnapshot().installStatus).toBe(status);
            expect(service.getSnapshot().bytesDownloaded).toBe(75);
            expect(service.getSnapshot().promptVisible).toBe(false);
        },
    );

    it("ignores stale query results after a newer download event", async () => {
        let resolve!: (info: PlayUpdateInfo) => void;
        native.getUpdateInfo.mockReturnValue(new Promise(done => { resolve = done; }));
        service.start();
        emit(InstallStatus.DOWNLOADED);
        resolve(available);
        await flush();
        expect(service.getSnapshot().installStatus).toBe(InstallStatus.DOWNLOADED);
        expect(service.getSnapshot().promptVisible).toBe(false);
    });

    it("rechecks when a foreground transition happened during a pending request", async () => {
        let resolve!: (info: PlayUpdateInfo) => void;
        native.getUpdateInfo.mockReturnValueOnce(new Promise(done => { resolve = done; }));
        service.start();
        await resume();
        resolve(available);
        await flush();
        expect(native.getUpdateInfo).toHaveBeenCalledTimes(2);
    });

    it("discards callbacks after disposal", async () => {
        let resolve!: (info: PlayUpdateInfo) => void;
        native.getUpdateInfo.mockReturnValue(new Promise(done => { resolve = done; }));
        service.start();
        service.stop();
        resolve(available);
        await flush();
        expect(service.getSnapshot().promptVisible).toBe(false);
    });

    it("recovers after a provider remount while Play consent is pending", async () => {
        let resolve!: (result: string) => void;
        native.startUpdate.mockReturnValue(new Promise(done => { resolve = done; }));
        service.start();
        await flush();
        const flow = service.startUpdate();
        service.stop();
        service.start();
        native.getUpdateInfo.mockResolvedValue({ ...available, installStatus: InstallStatus.DOWNLOADED });
        resolve("accepted");
        await flow;
        await flush();
        expect(service.getSnapshot().installStatus).toBe(InstallStatus.DOWNLOADED);
        expect(native.startUpdate).toHaveBeenCalledTimes(1);
    });

    it("resumes only an existing immediate flow without looping after cancellation", async () => {
        native.getUpdateInfo.mockResolvedValue({ ...available, updateAvailability: UpdateAvailability.IN_PROGRESS });
        native.startUpdate.mockResolvedValue("canceled");
        service.start();
        await flush();
        await resume();
        expect(native.startUpdate).toHaveBeenCalledTimes(1);
        expect(native.startUpdate).toHaveBeenCalledWith(UpdateType.IMMEDIATE);
    });

    it("ignores API failures and allows a later resume check", async () => {
        native.getUpdateInfo.mockRejectedValueOnce(new Error("Play unavailable"));
        service.start();
        await flush();
        expect(service.getSnapshot().promptVisible).toBe(false);
        await resume();
        expect(service.getSnapshot().promptVisible).toBe(true);
    });

    it("skips debug builds", () => {
        Object.defineProperty(globalThis, "__DEV__", { value: true });
        service.start();
        expect(native.getUpdateInfo).not.toHaveBeenCalled();
    });
    it("skips iOS", () => {
        Platform.OS = "ios";
        service.start();
        expect(native.getUpdateInfo).not.toHaveBeenCalled();
    });
    it("skips a missing native module", () => {
        service = new AppUpdateService(undefined);
        expect(() => service.start()).not.toThrow();
        expect(native.getUpdateInfo).not.toHaveBeenCalled();
    });
});
