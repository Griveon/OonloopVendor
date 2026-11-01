import { getOrderItemDetails, getSelectedVariant, OrderItem } from '../src/utils/orderItems';

const item: OrderItem = {
    product: 'product-id', variant: 'selected', name: 'Rice', quantity: 3, price: 40, total: 120,
};

it('shows the selected pack and photos from the rider API shape', () => {
    const details = getOrderItemDetails({ ...item, variantDetails: {
        unitValue: 500, unit: { name: 'Gram', symbol: 'g' },
        images: [{ url: 'variant.jpg' }], attributes: { size: 'Small' },
    }, images: [{ url: 'snapshot.jpg' }] });
    expect(details.packSize).toBe('500 g');
    expect(details.images).toEqual(['variant.jpg', 'snapshot.jpg']);
    expect(details.attributes).toEqual(['size: Small']);
});

it('matches the ordered variant instead of showing the first product variant', () => {
    const populated: OrderItem = { ...item, product: { name: 'Current name', variants: [
        { _id: 'other', unitValue: 1, unit: 'kg' },
        { _id: 'selected', unitValue: 250, unit: 'g' },
    ], images: ['product.jpg'] } };
    expect(getOrderItemDetails(populated)).toMatchObject({ name: 'Rice', packSize: '250 g', images: ['product.jpg'] });
    expect(getSelectedVariant({ ...populated, variant: 'deleted' })).toBeNull();
    expect(getSelectedVariant({ ...item, variant: undefined, product: { variants: [{ unit: 'kg' }] } })).toBeNull();
});

it('supports populated variants and deduplicates all available image shapes', () => {
    expect(getOrderItemDetails({ ...item,
        variant: { unitValue: 2, unit: { code: 'kg' }, images: ['photo.jpg', { uri: 'second.jpg' }] },
        images: [{ url: 'photo.jpg' }, { url: '' }],
    })).toMatchObject({ packSize: '2 kg', images: ['photo.jpg', 'second.jpg'] });
});

it('preserves ordered pack values and does not label an unknown raw unit id as weight', () => {
    expect(getOrderItemDetails({ ...item, unitValue: 100, unit: 'g',
        variantDetails: { unitValue: 500, unit: 'g' },
    }).packSize).toBe('100 g');
    expect(getOrderItemDetails({ ...item, variantDetails: {
        unitValue: 500, unit: '507f1f77bcf86cd799439011',
    } }).packSize).toBe('');
    expect(getOrderItemDetails({ ...item, product: null, variant: null }).images).toEqual([]);
});

it('resolves catalog unit ID and formats quantity + variants (e.g. 1 gram or 5 nos)', () => {
    // 69dd218d89e7db27db35d98a is the unit ID for gram from the vendor order catalog
    const amulCheese = getOrderItemDetails({
        ...item,
        name: 'Amul Cheese Premium',
        quantity: 3,
        product: {
            name: 'Amul Cheese Premium',
            variants: [{
                _id: '6a01f98764630345f8db8d3f',
                unit: '69dd218d89e7db27db35d98a',
                unitValue: 1,
            }],
        },
        variant: '6a01f98764630345f8db8d3f',
    });
    expect(amulCheese.packSize).toBe('1 gram');
    expect(amulCheese.variantLabel).toBe('1 gram');
    expect(amulCheese.quantityWithVariant).toBe('Qty: 3 (1 gram)');

    // 5 nos variant
    const eggItem = getOrderItemDetails({
        ...item,
        name: 'Egg',
        quantity: 2,
        variantDetails: {
            unitValue: 5,
            unit: 'nos',
        },
    });
    expect(eggItem.packSize).toBe('5 nos');
    expect(eggItem.variantLabel).toBe('5 nos');
    expect(eggItem.quantityWithVariant).toBe('Qty: 2 (5 nos)');

    // Pack size extracted from product name when variant has no unit
    const potatoItem = getOrderItemDetails({
        ...item,
        name: 'Sand Potato 1Kg',
        quantity: 1,
        variant: null,
    });
    expect(potatoItem.packSize).toBe('1Kg');
    expect(potatoItem.quantityWithVariant).toBe('Qty: 1 (1Kg)');
});

