import { unitRegistry } from './unitRegistry';

export type ProductImage = string | { url?: string; uri?: string; isPrimary?: boolean };
export type ProductUnit = string | { _id?: string; name?: string; symbol?: string; code?: string };

export interface ProductVariantDetails {
    _id?: string;
    unit?: ProductUnit | null;
    unitValue?: number | string;
    attributes?: Record<string, unknown>;
    images?: ProductImage[];
    sku?: string;
    productSpecification?: string;
}

export interface OrderProductDetails {
    _id?: string;
    name?: string;
    images?: ProductImage[];
    variants?: ProductVariantDetails[];
}

export interface OrderItem {
    product: string | OrderProductDetails | null;
    variant?: string | ProductVariantDetails | null;
    variantDetails?: ProductVariantDetails | null;
    name?: string;
    price: number;
    mrp?: number;
    quantity: number;
    images?: ProductImage[];
    total: number;
    unit?: ProductUnit | null;
    unitValue?: number | string;
}

export const getSelectedVariant = (item: OrderItem): ProductVariantDetails | null => {
    if (item.variantDetails) return item.variantDetails;
    if (!item.variant) return null;
    if (item.variant && typeof item.variant === 'object') return item.variant;
    const product = typeof item.product === 'object' ? item.product : null;
    // Never fall back to the first variant: it may be a different pack size.
    return product?.variants?.find(variant => variant._id === item.variant) ?? null;
};

const imageUrls = (images?: ProductImage[]) => (Array.isArray(images) ? images : [])
    .map(image => typeof image === 'string' ? image : image?.url || image?.uri || '')
    .map(url => url.trim()).filter(Boolean);

const extractPackSizeFromName = (name?: string): string => {
    if (!name) return '';
    const match = name.match(/\b(\d+(?:\.\d+)?\s*(?:kg|g|gm|gram|grams|ml|l|litre|liter|piece|pc|pcs|nos|no|pack|packet|box|bunch))\b/i);
    return match ? match[1].trim() : '';
};

export const getOrderItemDetails = (item: OrderItem) => {
    const product = typeof item.product === 'object' ? item.product : null;
    const variant = getSelectedVariant(item);
    const unit = item.unit ?? variant?.unit;
    const unitValue = item.unitValue ?? variant?.unitValue;
    const unitName = unitRegistry.resolveUnitName(unit);

    let packSize = unitName
        ? [unitValue, unitName].filter(value => value !== undefined && value !== null && value !== '').join(' ')
        : '';

    const name = item.name || product?.name || 'Product';

    if (!packSize) {
        packSize = extractPackSizeFromName(name);
    }

    const attributes = Object.entries(variant?.attributes ?? {})
        .filter(([, value]) => (typeof value === 'string' && value.trim()) || typeof value === 'number')
        .map(([key, value]) => `${key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ')}: ${value}`);

    const variantParts = [packSize, ...attributes].filter(Boolean);
    const variantLabel = variantParts.join(' · ');

    const qtyText = item.quantity !== undefined && item.quantity !== null
        ? `Qty: ${item.quantity}`
        : 'Qty: Unavailable';

    const quantityWithVariant = variantLabel
        ? `${qtyText} (${variantLabel})`
        : qtyText;

    return {
        name,
        packSize,
        attributes,
        variantLabel,
        quantityWithVariant,
        sku: variant?.sku,
        specification: variant?.productSpecification,
        images: [...new Set([
            ...imageUrls(variant?.images), ...imageUrls(item.images), ...imageUrls(product?.images),
        ])],
    };
};

