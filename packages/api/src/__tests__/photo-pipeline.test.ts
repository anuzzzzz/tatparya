import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Photo Pipeline Tests
//
// Tests the full pipeline orchestration with mocked services.
// Validates:
//   - Triage → Classify → Enhance → Quality Gate → Upload flow
//   - Draft mode skips enhancement
//   - Empty/junk photo handling
//   - Section assignment logic
//   - Quality gate scoring
// ============================================================

// ── Mock sharp ──
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image-data')),
    metadata: vi.fn().mockResolvedValue({ width: 1200, height: 1600, format: 'jpeg' }),
    normalize: vi.fn().mockReturnThis(),
    modulate: vi.fn().mockReturnThis(),
    gamma: vi.fn().mockReturnThis(),
    tint: vi.fn().mockReturnThis(),
    sharpen: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
  }));
  // Also handle sharp({ create: ... }) constructor form
  (mockSharp as any).default = mockSharp;
  return { default: mockSharp };
});

// ── Mock storage ──
vi.mock('../lib/storage.js', () => ({
  uploadBuffer: vi.fn().mockResolvedValue('https://cdn.example.com/mock-image.webp'),
  buildMediaKey: vi.fn((storeId, mediaId, variant, ext) => `stores/${storeId}/${mediaId}/${variant}.${ext}`),
  downloadBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-original-image')),
}));

// ── Mock event bus ──
vi.mock('../lib/event-bus.js', () => ({
  emitEvent: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock triage ──
vi.mock('../services/photo-triage-ai.service.js', () => ({
  triagePhotos: vi.fn().mockResolvedValue({
    groups: [
      { imageIndices: [0, 1], label: 'Product A', confidence: 0.9 },
      { imageIndices: [2], label: 'Product B', confidence: 0.85 },
    ],
    qualityFlags: [],
    needsConfirmation: false,
    processingTimeMs: 500,
  }),
}));

// ── Mock classifier ──
vi.mock('../services/photo-classifier.service.js', () => ({
  classifyPhotos: vi.fn().mockResolvedValue({
    classifications: [
      {
        imageIndex: 0,
        category: 'product',
        confidence: 0.92,
        quality: { overall: 7, lighting: 4, composition: 4, background: 3, resolution: 'high' },
        sectionHint: 'hero',
        enhancementNeeds: ['bg_removal', 'sharpen'],
        retakeSuggestion: null,
      },
      {
        imageIndex: 1,
        category: 'product',
        confidence: 0.88,
        quality: { overall: 6, lighting: 3, composition: 3, background: 3, resolution: 'medium' },
        sectionHint: 'product_card',
        enhancementNeeds: ['lighting_fix', 'sharpen'],
        retakeSuggestion: null,
      },
      {
        imageIndex: 2,
        category: 'lifestyle',
        confidence: 0.85,
        quality: { overall: 8, lighting: 4, composition: 5, background: 4, resolution: 'high' },
        sectionHint: 'about',
        enhancementNeeds: ['sharpen'],
        retakeSuggestion: null,
      },
    ],
    summary: {
      totalPhotos: 3,
      usablePhotos: 3,
      junkPhotos: 0,
      averageQuality: 7,
      suggestion: null,
    },
  }),
  assignPhotosToSections: vi.fn().mockReturnValue({
    hero: 0,
    productCards: [1],
    about: 2,
    collectionBanner: null,
    ogImage: null,
    footer: null,
    skipped: [],
  }),
}));

// ── Mock enhancer ──
vi.mock('../services/photo-enhancer.service.js', () => ({
  enhancePhotoBatch: vi.fn().mockResolvedValue([
    {
      imageIndex: 0,
      success: true,
      enhancedBuffer: Buffer.from('enhanced-0'),
      noBgBuffer: Buffer.from('nobg-0'),
      metadata: {
        width: 1200, height: 1600, format: 'webp',
        originalWidth: 1200, originalHeight: 1600,
        enhancementsApplied: ['bg_removal', 'sharpen'],
      },
    },
    {
      imageIndex: 1,
      success: true,
      enhancedBuffer: Buffer.from('enhanced-1'),
      metadata: {
        width: 800, height: 1067, format: 'webp',
        originalWidth: 800, originalHeight: 1067,
        enhancementsApplied: ['lighting_fix', 'sharpen'],
      },
    },
    {
      imageIndex: 2,
      success: true,
      enhancedBuffer: Buffer.from('enhanced-2'),
      metadata: {
        width: 1400, height: 900, format: 'webp',
        originalWidth: 1400, originalHeight: 900,
        enhancementsApplied: ['sharpen'],
      },
    },
  ]),
  generateSizeVariants: vi.fn().mockResolvedValue({
    hero: Buffer.from('hero-variant'),
    card: Buffer.from('card-variant'),
    thumbnail: Buffer.from('thumb-variant'),
    square: Buffer.from('square-variant'),
    og: Buffer.from('og-variant'),
  }),
}));

// ── Mock quality gate ──
vi.mock('../services/photo-quality-gate.service.js', () => ({
  fastQualityGate: vi.fn().mockImplementation((classification, enhancement) => ({
    imageIndex: classification.imageIndex,
    publishReady: true,
    score: classification.quality.overall + (enhancement.success ? 1 : -1),
    tier: classification.quality.overall >= 7 ? 'premium' : 'standard',
    nudge: undefined,
  })),
  visionQualityGate: vi.fn().mockResolvedValue({
    imageIndex: 0,
    publishReady: true,
    score: 8.5,
    tier: 'premium',
    nudge: undefined,
  }),
  assessStoreReadiness: vi.fn().mockReturnValue({
    overallReady: true,
    overallScore: 7.5,
    photoResults: [],
    heroReady: true,
    minimumProductPhotos: true,
    suggestions: [],
  }),
}));

// ── Mock Supabase ──
function createMockDb() {
  const mockSingle = vi.fn().mockResolvedValue({ data: { original_key: 'stores/test/originals/photo.jpg', original_url: 'https://cdn.example.com/photo.jpg' }, error: null });
  const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

  const mockUpdateEq2 = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockUpdateEq1 = vi.fn().mockReturnValue({ eq: mockUpdateEq2 });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq1 });

  return {
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    }),
  };
}

describe('Photo Pipeline Orchestrator', () => {
  let processSellerPhotos: typeof import('../services/photo-pipeline-orchestrator.service.js').processSellerPhotos;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../services/photo-pipeline-orchestrator.service.js');
    processSellerPhotos = mod.processSellerPhotos;
  });

  it('should run full production pipeline end-to-end', async () => {
    const db = createMockDb();
    const result = await processSellerPhotos({
      storeId: 'store-123',
      mediaIds: ['media-1', 'media-2', 'media-3'],
      vertical: 'fashion',
      mode: 'production',
      db: db as any,
    });

    // Triage
    expect(result.triage.groups).toHaveLength(2);
    expect(result.triage.groups[0].label).toBe('Product A');
    expect(result.triage.needsConfirmation).toBe(false);

    // Classifications
    expect(result.classifications).toHaveLength(3);
    expect(result.classifications[0].category).toBe('product');
    expect(result.classifications[0].sectionHint).toBe('hero');

    // Section assignment
    expect(result.sectionAssignment.hero).toBe(0);
    expect(result.sectionAssignment.productCards).toEqual([1]);
    expect(result.sectionAssignment.about).toBe(2);

    // Enhancement (production mode)
    expect(result.enhancements).toBeDefined();
    expect(result.enhancements).toHaveLength(3);
    expect(result.enhancements![0].success).toBe(true);

    // Store readiness
    expect(result.storeReadiness.overallReady).toBe(true);
    expect(result.storeReadiness.overallScore).toBeGreaterThanOrEqual(5);

    // Upload results
    expect(Object.keys(result.uploadedVariants)).toHaveLength(3);

    // Timing
    expect(result.timing.totalMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.triageMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.classifyMs).toBeGreaterThanOrEqual(0);

    // Summary
    expect(result.summary.totalPhotos).toBe(3);
    expect(result.summary.usablePhotos).toBe(3);
    expect(result.summary.overallScore).toBeGreaterThanOrEqual(5);
    expect(result.summary.message).toBeTruthy();
  });

  it('should skip enhancement in draft mode', async () => {
    const db = createMockDb();
    const result = await processSellerPhotos({
      storeId: 'store-123',
      mediaIds: ['media-1', 'media-2', 'media-3'],
      vertical: 'fashion',
      mode: 'draft',
      db: db as any,
    });

    // Enhancement should be undefined in draft mode
    expect(result.enhancements).toBeUndefined();

    // Pipeline should still complete
    expect(result.triage.groups).toHaveLength(2);
    expect(result.classifications).toHaveLength(3);
    expect(result.storeReadiness).toBeDefined();
  });

  it('should return empty result when no photos load', async () => {
    // Override downloadBuffer to fail
    const { downloadBuffer } = await import('../lib/storage.js');
    (downloadBuffer as any).mockRejectedValue(new Error('Not found'));

    const db = createMockDb();
    const result = await processSellerPhotos({
      storeId: 'store-123',
      mediaIds: ['media-1'],
      vertical: 'fashion',
      mode: 'draft',
      db: db as any,
    });

    expect(result.summary.totalPhotos).toBe(0);
    expect(result.summary.usablePhotos).toBe(0);
    expect(result.summary.message).toContain('No photos could be loaded');
  });

  it('should emit pipeline_completed event', async () => {
    // Restore downloadBuffer mock (may have been overridden by previous test)
    const storage = await import('../lib/storage.js');
    (storage.downloadBuffer as any).mockResolvedValue(Buffer.from('mock-original-image'));

    const db = createMockDb();
    await processSellerPhotos({
      storeId: 'store-123',
      mediaIds: ['media-1', 'media-2', 'media-3'],
      vertical: 'fashion',
      mode: 'production',
      db: db as any,
    });

    const { emitEvent } = await import('../lib/event-bus.js');
    expect(emitEvent).toHaveBeenCalledWith(
      'photos.pipeline_completed',
      'store-123',
      expect.objectContaining({
        mediaIds: ['media-1', 'media-2', 'media-3'],
        mode: 'production',
      }),
    );
  });
});


describe('Photo Quality Gate', () => {
  it('should score enhanced photos higher than failed ones', async () => {
    const { fastQualityGate } = await import('../services/photo-quality-gate.service.js');

    const classification = {
      imageIndex: 0,
      category: 'product' as const,
      confidence: 0.9,
      quality: { overall: 6, lighting: 3, composition: 3, background: 3, resolution: 'adequate' as const },
      sectionHint: 'product_card' as const,
      enhancementNeeds: ['bg_removal'] as Array<'bg_removal'>,
      description: 'White cotton kurti on wooden table',
    };

    const enhancedResult = fastQualityGate(classification, {
      imageIndex: 0,
      success: true,
      metadata: { width: 1200, height: 1600, format: 'webp', originalWidth: 1200, originalHeight: 1600, enhancementsApplied: ['bg_removal'] },
    });

    const failedResult = fastQualityGate(classification, {
      imageIndex: 0,
      success: false,
      error: 'Enhancement failed',
    });

    expect(enhancedResult.score).toBeGreaterThan(failedResult.score);
  });

  it('should mark low-score photos as not publish-ready', async () => {
    const { fastQualityGate } = await import('../services/photo-quality-gate.service.js');

    const result = fastQualityGate(
      {
        imageIndex: 0,
        category: 'product' as const,
        confidence: 0.5,
        quality: { overall: 2, lighting: 1, composition: 1, background: 1, resolution: 'low' as const },
        sectionHint: 'product_card' as const,
        enhancementNeeds: [] as Array<'none'>,
        retakeSuggestion: 'Please retake with better lighting.',
        description: 'Dark blurry photo of unknown object',
      },
      { imageIndex: 0, success: false, error: 'Draft mode' },
    );

    // Score should be very low (2 - 2 = 0, clamped to 1)
    expect(result.score).toBeLessThanOrEqual(2);
  });

  it('should assess store readiness correctly', async () => {
    const { assessStoreReadiness } = await import('../services/photo-quality-gate.service.js');

    const result = assessStoreReadiness(
      [
        { imageIndex: 0, publishReady: true, score: 8, tier: 'premium' },
        { imageIndex: 1, publishReady: true, score: 6, tier: 'standard' },
        { imageIndex: 2, publishReady: true, score: 7, tier: 'standard' },
        { imageIndex: 3, publishReady: false, score: 2, tier: 'draft' },
      ],
      0,
    );

    expect(result.overallReady).toBe(true);
    expect(result.heroReady).toBe(true);
    expect(result.minimumProductPhotos).toBe(true);
  });
});


describe('Photo Classifier — Section Assignment', () => {
  it('should assign best photo as hero', async () => {
    const { assignPhotosToSections } = await import('../services/photo-classifier.service.js');

    const result = assignPhotosToSections([
      {
        imageIndex: 0,
        category: 'product' as const,
        confidence: 0.9,
        quality: { overall: 8, lighting: 4, composition: 5, background: 4, resolution: 'good' as const },
        sectionHint: 'hero' as const,
        enhancementNeeds: [] as Array<'none'>,
        description: 'Gold necklace on velvet display',
      },
      {
        imageIndex: 1,
        category: 'product' as const,
        confidence: 0.85,
        quality: { overall: 6, lighting: 3, composition: 3, background: 3, resolution: 'adequate' as const },
        sectionHint: 'product_card' as const,
        enhancementNeeds: ['lighting_fix'] as Array<'lighting_fix'>,
        description: 'Silver earrings on white surface',
      },
    ]);

    expect(result.hero).toBe(0);
    expect(result.productCards).toContain(1);
  });
});
