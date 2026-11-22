export interface IOptimizedImage {
  url: string;
  width: number;
  height: number;
  format: string; // "webp"
  size: number;   // file size in bytes
}

export interface IProductImage {
  url: string;
  name?: string;
  alt?: string;
  isPrimary?: boolean;
  position?: number;
}

export interface IProductVariant {
  _id?: string;
  variantId?: string;
  attributes?: Record<string, any>;
  unit?: string | { _id?: string; name?: string; symbol?: string; code?: string };
  unitValue?: number | string;
  stock?: number | string;
  sku?: string;
  price?: number;
  mrp?: number;
  customerSellingPrice?: number;
  productHandling?: number;
  productHandlingCharges?: number;
  productSpecification?: string;
  images?: IProductImage[];
}

export interface IProductGST {
  gstRuleId?: string;
  hsnCode?: string;
  gstPercent?: number;
  gstAmount?: number;
  priceIncludingGST?: number;
}

export interface IProductAvailability {
  type: "always" | "scheduled";
  fromTime?: string;
  toTime?: string;
}

export interface IProduct {
  _id: string;
  vendorId?: string;
  name: string;
  description?: string;
  slug?: string;
  images: IProductImage[];
  videos?: any[];
  coverImage?: IOptimizedImage | null;
  detailImage?: IOptimizedImage | null;
  variants?: IProductVariant[];
  attributes?: Record<string, any>;
  stock?: number;
  mrp?: number;
  price?: number;
  customerSellingPrice?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  returnable?: boolean;
  minQty?: number;
  searchKeywords?: string[];
  productCategory?: string | any;
  category?: string | any;
  gst?: IProductGST;
  availability?: IProductAvailability;
  createdAt?: string;
  updatedAt?: string;
}
