export type ManualDeliveryStatus =
    | "CREATED"
    | "ASSIGNED"
    | "ACCEPTED"
    | "PICKED_UP"
    | "OUT_FOR_DELIVERY"
    | "REACHED"
    | "DELIVERED"
    | "CANCELLED"
    | "FAILED";

export type DistanceCalculationMethod = "ROAD" | "STRAIGHT_LINE" | null;

export interface ManualDeliveryPricing {
    distanceKm?: number;
    deliveryFee: number;
    platformFee: number;
    deliveryGst?: number;
    platformGst?: number;
    totalDeliveryCharge?: number;
    totalPlatformCharge?: number;
    subtotal: number;
    gstRate?: number;
    gstAmount: number;
    totalAmount: number;
}

export interface ManualDeliveryCustomer {
    name: string;
    mobileNumber: string;
    countryCode: string;
    customerId?: string | null;
}

export interface ManualDeliveryAddress {
    vendorId?: string;
    vendorProfileId?: string;
    storeName?: string;
    contactName?: string;
    contactPhone?: string;
    addressLine1: string;
    addressLine2?: string;
    area?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
    formattedAddress?: string;
    mapLink?: string;
}

export interface ManualDeliveryPickupDefault extends ManualDeliveryAddress {
    isComplete: boolean;
    hasCoordinates: boolean;
    warnings: string[];
}

export interface ManualDeliveryDistance {
    valueKm: number | null;
    valueMeters: number | null;
    calculationMethod: DistanceCalculationMethod;
    provider?: string | null;
    calculatedAt?: string | null;
}

export interface ManualDeliveryDriverSnapshot {
    driverId: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
}

export interface ManualDeliveryStatusHistory {
    status: ManualDeliveryStatus;
    title: string;
    remark?: string;
    updatedBy?: string;
    updatedByRole?: "vendor" | "driver" | "admin" | "system";
    updatedAt: string;
}

export interface ManualDeliveryAssignmentHistory {
    driver: string;
    driverName?: string;
    action: "ASSIGNED" | "ACCEPTED" | "REJECTED" | "REASSIGNED" | "UNASSIGNED";
    assignedAt?: string;
    respondedAt?: string;
    reason?: string;
}

export interface ManualDelivery {
    _id: string;
    deliveryNumber: string;
    vendor: string;
    vendorProfile?: string;
    createdBy?: string;
    source: string;
    status: ManualDeliveryStatus;
    pickup: ManualDeliveryAddress;
    customer: ManualDeliveryCustomer;
    dropoff: ManualDeliveryAddress;
    customerNotes?: string;
    distance?: ManualDeliveryDistance | null;
    driver?: string | null;
    driverUser?: string | null;
    driverSnapshot?: ManualDeliveryDriverSnapshot | null;
    assignedAt?: string | null;
    acceptedAt?: string | null;
    pickedUpAt?: string | null;
    outForDeliveryAt?: string | null;
    reachedAt?: string | null;
    deliveredAt?: string | null;
    cancelledAt?: string | null;
    failedAt?: string | null;
    cancellationReason?: string | null;
    failureReason?: string | null;
    rejectionReason?: string | null;
    statusHistory: ManualDeliveryStatusHistory[];
    assignmentHistory: ManualDeliveryAssignmentHistory[];
    pricing?: ManualDeliveryPricing | null;
    paymentStatus?: "PENDING" | "PAID" | "FAILED" | string | null;
    paymentTransaction?: string | null;
    paidAt?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateManualDeliveryPayload {
    customer: {
        name: string;
        mobileNumber: string;
        countryCode?: string;
        customerId?: string | null;
    };
    dropoff: {
        addressLine1: string;
        addressLine2?: string;
        area?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
        landmark?: string;
        latitude?: number | null;
        longitude?: number | null;
        formattedAddress?: string;
        mapLink?: string;
    };
    customerNotes?: string;
    vendorId?: string;
}

export interface UpdateManualDeliveryPayload {
    customer?: Partial<ManualDeliveryCustomer>;
    dropoff?: Partial<ManualDeliveryAddress>;
    customerNotes?: string;
}

export interface CalculateDistancePayload {
    pickup?: {
        latitude: number;
        longitude: number;
    };
    dropoff: {
        latitude: number;
        longitude: number;
    };
}

export interface CalculateDistanceResult {
    valueKm?: number | null;
    distanceKm?: number | null;
    valueMeters?: number | null;
    distanceMeters?: number | null;
    calculationMethod?: DistanceCalculationMethod | null;
    provider?: string | null;
    calculatedAt?: string | null;
    pricing?: ManualDeliveryPricing | null;
}

export interface CreateManualDeliveryPaymentResponse {
    orderId: string;
    amount: number;
    currency: string;
    key: string;
    transactionId: string;
    demo?: boolean;
}

export interface VerifyManualDeliveryPaymentPayload {
    transactionId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

export interface VerifyManualDeliveryPaymentResponse {
    deliveryId: string;
}

export interface DriverStatusUpdatePayload {
    status: "PICKED_UP" | "OUT_FOR_DELIVERY" | "REACHED" | "DELIVERED" | "FAILED";
    remark?: string;
    failureReason?: string;
}

export interface DriverProfileItem {
    _id: string;
    user?: {
        _id: string;
        firstName?: string;
        lastName?: string;
        mobileNumber?: string;
    } | string;
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    profileStatus?: string;
    isVerified?: boolean;
}

export interface ManualDeliveryListMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
