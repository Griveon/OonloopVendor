import {
  getProductCoverUrl,
  getProductDetailUrl,
  hasProductImage,
  DEFAULT_PRODUCT_PLACEHOLDER,
} from '../src/utils/productImage';
import { IProduct } from '../src/types/product';

describe('productImage utility', () => {
  const mockProduct: IProduct = {
    _id: 'prod_123',
    name: 'Basmati Rice 5kg',
    coverImage: {
      url: 'https://media.oonloop.com/products/cover-320.webp',
      width: 320,
      height: 320,
      format: 'webp',
      size: 15420,
    },
    detailImage: {
      url: 'https://media.oonloop.com/products/detail-1200.webp',
      width: 1200,
      height: 1200,
      format: 'webp',
      size: 89400,
    },
    images: [
      {
        url: 'https://media.oonloop.com/products/raw-primary.jpg',
        isPrimary: true,
        position: 0,
      },
      {
        url: 'https://media.oonloop.com/products/raw-second.jpg',
        isPrimary: false,
        position: 1,
      },
    ],
  };

  describe('getProductCoverUrl', () => {
    it('returns coverImage.url when available', () => {
      const url = getProductCoverUrl(mockProduct);
      expect(url).toBe('https://media.oonloop.com/products/cover-320.webp');
    });

    it('falls back to isPrimary image url when coverImage is missing', () => {
      const productWithoutCover: IProduct = {
        ...mockProduct,
        coverImage: null,
      };
      const url = getProductCoverUrl(productWithoutCover);
      expect(url).toBe('https://media.oonloop.com/products/raw-primary.jpg');
    });

    it('falls back to the first gallery image url when neither coverImage nor isPrimary exists', () => {
      const productWithNoPrimary: IProduct = {
        ...mockProduct,
        coverImage: null,
        images: [
          { url: 'https://media.oonloop.com/products/gallery-0.jpg', isPrimary: false },
          { url: 'https://media.oonloop.com/products/gallery-1.jpg', isPrimary: false },
        ],
      };
      const url = getProductCoverUrl(productWithNoPrimary);
      expect(url).toBe('https://media.oonloop.com/products/gallery-0.jpg');
    });

    it('falls back to default placeholder when product has no images', () => {
      const emptyProduct: IProduct = {
        _id: 'empty_1',
        name: 'Empty Product',
        images: [],
        coverImage: null,
      };
      expect(getProductCoverUrl(emptyProduct)).toBe(DEFAULT_PRODUCT_PLACEHOLDER);
      expect(getProductCoverUrl(null)).toBe(DEFAULT_PRODUCT_PLACEHOLDER);
      expect(getProductCoverUrl(undefined)).toBe(DEFAULT_PRODUCT_PLACEHOLDER);
    });

    it('respects custom fallback url if provided', () => {
      const customFallback = 'https://custom.placeholder.com/none.png';
      expect(getProductCoverUrl(null, customFallback)).toBe(customFallback);
    });

    it('handles legacy image string array correctly', () => {
      const legacyProduct: any = {
        _id: 'legacy_1',
        name: 'Legacy Product',
        images: ['https://media.oonloop.com/products/legacy-0.jpg'],
      };
      expect(getProductCoverUrl(legacyProduct)).toBe('https://media.oonloop.com/products/legacy-0.jpg');
    });
  });

  describe('getProductDetailUrl', () => {
    it('returns detailImage.url when available', () => {
      const url = getProductDetailUrl(mockProduct);
      expect(url).toBe('https://media.oonloop.com/products/detail-1200.webp');
    });

    it('falls back to isPrimary image url when detailImage is missing', () => {
      const productWithoutDetail: IProduct = {
        ...mockProduct,
        detailImage: null,
      };
      const url = getProductDetailUrl(productWithoutDetail);
      expect(url).toBe('https://media.oonloop.com/products/raw-primary.jpg');
    });

    it('falls back to first image when no detailImage and no isPrimary', () => {
      const productWithoutDetailOrPrimary: IProduct = {
        ...mockProduct,
        detailImage: null,
        images: [{ url: 'https://media.oonloop.com/first.jpg' }],
      };
      expect(getProductDetailUrl(productWithoutDetailOrPrimary)).toBe('https://media.oonloop.com/first.jpg');
    });

    it('falls back to default placeholder when null or empty', () => {
      expect(getProductDetailUrl(null)).toBe(DEFAULT_PRODUCT_PLACEHOLDER);
    });
  });

  describe('hasProductImage', () => {
    it('returns true when coverImage or detailImage is present', () => {
      expect(hasProductImage(mockProduct)).toBe(true);
      expect(hasProductImage({ coverImage: { url: 'abc', width: 320, height: 320, format: 'webp', size: 100 } } as any)).toBe(true);
    });

    it('returns true when images array has at least one item', () => {
      expect(hasProductImage({ images: [{ url: 'abc' }] } as any)).toBe(true);
    });

    it('returns false when product is empty or null', () => {
      expect(hasProductImage(null)).toBe(false);
      expect(hasProductImage({ images: [] } as any)).toBe(false);
    });
  });
});
