import { IProduct, IProductImage } from "../types/product";

export const DEFAULT_PRODUCT_PLACEHOLDER =
  "https://via.placeholder.com/320x320?text=No+Image";

/**
 * Returns the best image URL for product cards, listings, search results, cart lines, and thumbnails.
 * Priority: coverImage.url -> isPrimary original image -> first gallery image -> placeholder.
 */
export function getProductCoverUrl(
  product?: Partial<IProduct> | null,
  fallback: string = DEFAULT_PRODUCT_PLACEHOLDER
): string {
  if (!product) return fallback;
  if (product.coverImage?.url) return product.coverImage.url;

  if (Array.isArray(product.images) && product.images.length > 0) {
    const primary = product.images.find(
      (img: any) => typeof img === "object" && img?.isPrimary
    );
    const primaryUrl =
      typeof primary === "string" ? primary : (primary as any)?.url;
    if (primaryUrl) return primaryUrl;

    const first = product.images[0];
    const firstUrl = typeof first === "string" ? first : (first as any)?.url;
    if (firstUrl) return firstUrl;
  }

  return fallback;
}

/**
 * Returns the best image URL for the main Product Detail Page (PDP) hero banner/zoom.
 * Priority: detailImage.url -> isPrimary original image -> first gallery image -> placeholder.
 */
export function getProductDetailUrl(
  product?: Partial<IProduct> | null,
  fallback: string = DEFAULT_PRODUCT_PLACEHOLDER
): string {
  if (!product) return fallback;
  if (product.detailImage?.url) return product.detailImage.url;

  if (Array.isArray(product.images) && product.images.length > 0) {
    const primary = product.images.find(
      (img: any) => typeof img === "object" && img?.isPrimary
    );
    const primaryUrl =
      typeof primary === "string" ? primary : (primary as any)?.url;
    if (primaryUrl) return primaryUrl;

    const first = product.images[0];
    const firstUrl = typeof first === "string" ? first : (first as any)?.url;
    if (firstUrl) return firstUrl;
  }

  return fallback;
}

/**
 * Helper to check whether a product has any valid image configured.
 */
export function hasProductImage(product?: Partial<IProduct> | null): boolean {
  if (!product) return false;
  if (product.coverImage?.url || product.detailImage?.url) return true;
  return Array.isArray(product.images) && product.images.length > 0;
}
