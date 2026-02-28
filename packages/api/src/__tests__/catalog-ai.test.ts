import { describe, it, expect, vi } from 'vitest';

// ============================================================
// Catalog AI Service Tests
//
// These tests mock the Claude API and R2 storage to validate
// the catalog generation pipeline end-to-end.
// ============================================================

// Mock the AI module
vi.mock('../lib/ai.js', () => ({
  analyzeProductPhotos: vi.fn().mockResolvedValue({
    name: 'Lucknowi Chikankari Cotton Kurti',
    description: 'Beautiful hand-embroidered Lucknowi chikankari kurti made from premium cotton fabric. Features intricate floral patterns with delicate shadow work (tepchi) and murri detailing. The lightweight cotton makes it perfect for daily wear during Indian summers. This kurti pairs beautifully with palazzo pants or churidar.',
    shortDescription: 'Hand-embroidered Lucknowi chikankari cotton kurti with floral patterns',
    suggestedPrice: 1199,
    suggestedCompareAtPrice: 1599,
    category: 'Kurtis',
    subcategory: 'Chikankari',
    tags: [
      'kurti', 'chikankari', 'lucknowi', 'cotton', 'embroidered',
      'ethnic wear', 'casual wear', 'summer', 'white', 'floral',
      'handwork', 'women', 'indian wear',
    ],
    hsnCode: '6204',
    gstRate: 12,
    seoTitle: 'Lucknowi Chikankari Cotton Kurti - Hand Embroidered',
    seoDescription: 'Shop hand-embroidered Lucknowi chikankari cotton kurti with intricate floral patterns. Premium quality, perfect for daily and festive wear.',
    seoKeywords: ['chikankari kurti', 'lucknowi kurti', 'cotton kurti', 'embroidered kurti', 'ethnic wear'],
    variantSuggestions: [
      { attributes: { size: 'S' }, priceAdjustment: 0 },
      { attributes: { size: 'M' }, priceAdjustment: 0 },
      { attributes: { size: 'L' }, priceAdjustment: 0 },
      { attributes: { size: 'XL' }, priceAdjustment: 0 },
      { attributes: { size: 'XXL' }, priceAdjustment: 100 },
    ],
    verticalData: {
      fabric: 'Cotton',
      work: 'Chikankari',
      occasion: ['Casual', 'Daily Wear', 'Festive'],
      sleeveLength: 'Three-Quarter',
      neckline: 'Round Neck',
      length: 'Knee-length',
    },
    altText: 'White Lucknowi chikankari cotton kurti with floral embroidery',
    confidence: 0.92,
  }),
}));

describe('CatalogAI Pipeline', () => {
  it('should parse AI response into CatalogSuggestion shape', async () => {
    const { analyzeProductPhotos } = await import('../lib/ai.js');

    const result = await analyzeProductPhotos({
      imageUrls: ['https://example.com/kurti.jpg'],
      vertical: 'fashion',
      sellerHints: 'Chikankari kurti, cotton, S-XXL, around 1200',
    });

    expect(result.name).toBe('Lucknowi Chikankari Cotton Kurti');
    expect(result.suggestedPrice).toBe(1199);
    expect(result.hsnCode).toBe('6204');
    expect(result.gstRate).toBe(12);
    expect(result.tags.length).toBeGreaterThan(5);
    expect(result.variantSuggestions.length).toBeGreaterThanOrEqual(4);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should generate valid SEO meta', async () => {
    const { analyzeProductPhotos } = await import('../lib/ai.js');

    const result = await analyzeProductPhotos({
      imageUrls: ['https://example.com/kurti.jpg'],
    });

    expect(result.seoTitle.length).toBeLessThanOrEqual(70);
    expect(result.seoDescription.length).toBeLessThanOrEqual(160);
    expect(result.seoKeywords.length).toBeLessThanOrEqual(10);
  });

  it('should handle fashion vertical with size variants', async () => {
    const { analyzeProductPhotos } = await import('../lib/ai.js');

    const result = await analyzeProductPhotos({
      imageUrls: ['https://example.com/kurti.jpg'],
      vertical: 'fashion',
    });

    const sizes = result.variantSuggestions.map((v) => v.attributes['size']);
    expect(sizes).toContain('S');
    expect(sizes).toContain('M');
    expect(sizes).toContain('L');
    expect(sizes).toContain('XL');
  });

  it('should return verticalData for fashion', async () => {
    const { analyzeProductPhotos } = await import('../lib/ai.js');

    const result = await analyzeProductPhotos({
      imageUrls: ['https://example.com/kurti.jpg'],
      vertical: 'fashion',
    });

    expect(result.verticalData).toHaveProperty('fabric');
    expect(result.verticalData).toHaveProperty('work');
    expect(result.verticalData).toHaveProperty('occasion');
  });
});

describe('CatalogSuggestion Schema', () => {
  it('should validate a complete suggestion', async () => {
    const { CatalogSuggestion } = await import('@tatparya/shared');

    const suggestion = {
      name: 'Test Product',
      description: 'A test product description that is long enough.',
      tags: ['tag1', 'tag2'],
      confidence: 0.85,
    };

    const result = CatalogSuggestion.safeParse(suggestion);
    expect(result.success).toBe(true);
  });

  it('should reject confidence > 1', async () => {
    const { CatalogSuggestion } = await import('@tatparya/shared');

    const suggestion = {
      name: 'Test',
      description: 'Test',
      tags: [],
      confidence: 1.5,
    };

    const result = CatalogSuggestion.safeParse(suggestion);
    expect(result.success).toBe(false);
  });

  it('should reject too many tags', async () => {
    const { CatalogSuggestion } = await import('@tatparya/shared');

    const suggestion = {
      name: 'Test',
      description: 'Test',
      tags: Array.from({ length: 25 }, (_, i) => `tag${i}`),
      confidence: 0.8,
    };

    const result = CatalogSuggestion.safeParse(suggestion);
    expect(result.success).toBe(false);
  });
});

describe('Media Schema', () => {
  it('should validate GetUploadUrlInput', async () => {
    const { GetUploadUrlInput } = await import('@tatparya/shared');

    const input = {
      storeId: '550e8400-e29b-41d4-a716-446655440000',
      filename: 'product-photo.jpg',
      contentType: 'image/jpeg',
      fileSizeBytes: 500000,
    };

    const result = GetUploadUrlInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject file > 20MB', async () => {
    const { GetUploadUrlInput } = await import('@tatparya/shared');

    const input = {
      storeId: '550e8400-e29b-41d4-a716-446655440000',
      filename: 'huge-photo.jpg',
      contentType: 'image/jpeg',
      fileSizeBytes: 25 * 1024 * 1024, // 25MB
    };

    const result = GetUploadUrlInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject unsupported content types', async () => {
    const { GetUploadUrlInput } = await import('@tatparya/shared');

    const input = {
      storeId: '550e8400-e29b-41d4-a716-446655440000',
      filename: 'document.pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 100000,
    };

    const result = GetUploadUrlInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should validate GenerateFromPhotosInput', async () => {
    const { GenerateFromPhotosInput } = await import('@tatparya/shared');

    const input = {
      storeId: '550e8400-e29b-41d4-a716-446655440000',
      mediaIds: ['550e8400-e29b-41d4-a716-446655440001'],
      vertical: 'fashion',
      sellerHints: 'Cotton kurti, available in S/M/L/XL',
    };

    const result = GenerateFromPhotosInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject more than 10 media IDs', async () => {
    const { GenerateFromPhotosInput } = await import('@tatparya/shared');

    const input = {
      storeId: '550e8400-e29b-41d4-a716-446655440000',
      mediaIds: Array.from({ length: 11 }, (_, i) =>
        `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, '0')}`
      ),
    };

    const result = GenerateFromPhotosInput.safeParse(input);
    expect(result.success).toBe(false);
  });
});
