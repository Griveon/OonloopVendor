import {
    getRequest,
    postRequest,
    patchRequest,
} from "../constants/ApiClient";
import { API_ENDPOINTS } from "../constants/ApiEndpoints";
import type {
    ManualDelivery,
    ManualDeliveryPickupDefault,
    CreateManualDeliveryPayload,
    UpdateManualDeliveryPayload,
    CalculateDistancePayload,
    CalculateDistanceResult,
    DriverStatusUpdatePayload,
    DriverProfileItem,
    ManualDeliveryListMeta,
} from "../types/manualDelivery.types";

export interface PaginatedResponse<T> {
    success: boolean;
    message: string;
    data: T[];
    meta?: ManualDeliveryListMeta;
    error?: any;
}

export interface SingleResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: any;
    unauthorized?: boolean;
}

export const manualDeliveryApi = {
    // ─── Vendor Endpoints ────────────────────────────────────────────────────────

    /**
     * Fetch default registered store pickup address snapshot
     */
    getDefaultPickupAddress: async (): Promise<SingleResponse<ManualDeliveryPickupDefault>> => {
        return (await getRequest(API_ENDPOINTS.MANUAL_DELIVERY_PICKUP_DEFAULT)) as any;
    },

    /**
     * Preview road / straight-line distance between vendor store and dropoff coordinates
     */
    calculateDistance: async (
        payload: CalculateDistancePayload
    ): Promise<SingleResponse<CalculateDistanceResult>> => {
        const res: any = await postRequest(
            API_ENDPOINTS.MANUAL_DELIVERY_CALCULATE_DISTANCE,
            payload
        );
        if (res && res.data) {
            const km =
                typeof res.data.valueKm === "number"
                    ? res.data.valueKm
                    : typeof res.data.distanceKm === "number"
                    ? res.data.distanceKm
                    : null;
            const meters =
                typeof res.data.valueMeters === "number"
                    ? res.data.valueMeters
                    : typeof res.data.distanceMeters === "number"
                    ? res.data.distanceMeters
                    : null;
            res.data.valueKm = km;
            res.data.distanceKm = km;
            res.data.valueMeters = meters;
            res.data.distanceMeters = meters;
        }
        return res;
    },

    /**
     * Create manual delivery from phone call order
     */
    createManualDelivery: async (
        payload: CreateManualDeliveryPayload
    ): Promise<SingleResponse<ManualDelivery>> => {
        return (await postRequest(API_ENDPOINTS.MANUAL_DELIVERY_CREATE, payload)) as any;
    },

    /**
     * List manual deliveries with filters and pagination
     */
    getManualDeliveries: async (params?: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        customerMobile?: string;
        deliveryNumber?: string;
        startDate?: string;
        endDate?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<PaginatedResponse<ManualDelivery>> => {
        return (await getRequest(
            API_ENDPOINTS.MANUAL_DELIVERY_GET_ALL,
            params
        )) as any;
    },

    /**
     * Get single manual delivery details by ID
     */
    getManualDeliveryById: async (
        id: string
    ): Promise<SingleResponse<ManualDelivery>> => {
        return (await getRequest(
            `${API_ENDPOINTS.MANUAL_DELIVERY_GET_BY_ID}/${id}`
        )) as any;
    },

    /**
     * Update eligible manual delivery fields (when CREATED)
     */
    updateManualDelivery: async (
        id: string,
        payload: UpdateManualDeliveryPayload
    ): Promise<SingleResponse<ManualDelivery>> => {
        return (await patchRequest(
            `${API_ENDPOINTS.MANUAL_DELIVERY_UPDATE}/${id}`,
            payload
        )) as any;
    },

    /**
     * Assign eligible driver to delivery
     */
    assignDriver: async (
        deliveryId: string,
        driverId: string
    ): Promise<SingleResponse<ManualDelivery>> => {
        return (await postRequest(
            `${API_ENDPOINTS.MANUAL_DELIVERY_ASSIGN_DRIVER}/${deliveryId}/assign-driver`,
            { driverId }
        )) as any;
    },

    /**
     * Cancel manual delivery
     */
    cancelManualDelivery: async (
        deliveryId: string,
        reason?: string
    ): Promise<SingleResponse<ManualDelivery>> => {
        return (await postRequest(
            `${API_ENDPOINTS.MANUAL_DELIVERY_CANCEL}/${deliveryId}/cancel`,
            { reason: reason?.trim() || "Cancelled by vendor" }
        )) as any;
    },

    /**
     * List drivers available for assignment
     */
    getAvailableDrivers: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<PaginatedResponse<DriverProfileItem>> => {
        return (await getRequest(API_ENDPOINTS.DRIVERS_GET_ALL, params)) as any;
    },

    // ─── Driver Endpoints ────────────────────────────────────────────────────────

    /**
     * List deliveries assigned to authenticated driver
     */
    getDriverManualDeliveries: async (params?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<PaginatedResponse<ManualDelivery>> => {
        return (await getRequest(
            API_ENDPOINTS.DRIVER_MANUAL_DELIVERY_GET_ALL,
            params
        )) as any;
    },

    /**
     * Get single manual delivery details for authenticated driver
     */
    getDriverManualDeliveryById: async (
        id: string
    ): Promise<SingleResponse<ManualDelivery>> => {
        return (await getRequest(
            `${API_ENDPOINTS.DRIVER_MANUAL_DELIVERY_GET_BY_ID}/${id}`
        )) as any;
    },

    /**
     * Driver accepts delivery assignment
     */
    driverAccept: async (id: string): Promise<SingleResponse<ManualDelivery>> => {
        return (await postRequest(
            `${API_ENDPOINTS.DRIVER_MANUAL_DELIVERY_ACCEPT}/${id}/accept`,
            {}
        )) as any;
    },

    /**
     * Driver rejects delivery assignment
     */
    driverReject: async (
        id: string,
        reason?: string
    ): Promise<SingleResponse<ManualDelivery>> => {
        return (await postRequest(
            `${API_ENDPOINTS.DRIVER_MANUAL_DELIVERY_REJECT}/${id}/reject`,
            { reason: reason?.trim() || "Unable to complete delivery" }
        )) as any;
    },

    /**
     * Driver advances status milestones (PICKED_UP, OUT_FOR_DELIVERY, REACHED, DELIVERED, FAILED)
     */
    driverUpdateStatus: async (
        id: string,
        payload: DriverStatusUpdatePayload
    ): Promise<SingleResponse<ManualDelivery>> => {
        return (await patchRequest(
            `${API_ENDPOINTS.DRIVER_MANUAL_DELIVERY_STATUS_UPDATE.replace("/status", "")}/${id}/status`,
            payload
        )) as any;
    },
};
