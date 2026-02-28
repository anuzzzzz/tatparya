// ============================================================
// Chat API Service
//
// Bridges classified intents to real tRPC calls.
// Each method corresponds to an intent action and returns
// structured data that the response generator turns into
// chat messages.
//
// Takes an authenticated tRPC client from the auth provider.
// ============================================================

type TrpcClient = any; // Will be properly typed when imported in use-chat

export interface ChatApiResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class ChatApiService {
  constructor(
    private trpc: TrpcClient,
    private storeId: string | null,
  ) {}

  setStoreId(id: string) {
    this.storeId = id;
  }

  private requireStore(): string {
    if (!this.storeId) {
      throw new Error('NO_STORE');
    }
    return this.storeId;
  }

  // ── Store Operations ─────────────────────────────────────

  async createStore(params: {
    name: string;
    vertical: string;
    description?: string;
  }): Promise<ChatApiResult> {
    try {
      // Use devCreate (no auth required) for testing
      const store = await this.trpc.store.devCreate.mutate({
        name: params.name,
        vertical: params.vertical,
        description: params.description,
      });

      this.storeId = store.id;
      return { success: true, data: store };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create store' };
    }
  }

  async getStore(): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const store = await this.trpc.store.get.query({ storeId });
      return { success: true, data: store };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async listStores(): Promise<ChatApiResult> {
    try {
      // Use devList (no auth required) for testing
      const stores = await this.trpc.store.devList.query();
      return { success: true, data: stores };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async updateStore(params: Record<string, unknown>): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const store = await this.trpc.store.update.mutate({ storeId, ...params });
      return { success: true, data: store };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getStoreLink(): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const store = await this.trpc.store.get.query({ storeId });
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      return {
        success: true,
        data: {
          slug: store.slug,
          url: `${baseUrl}/${store.slug}`,
          name: store.name,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Product Operations ───────────────────────────────────

  async listProducts(params?: {
    status?: string;
    search?: string;
  }): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const result = await this.trpc.product.list.query({
        storeId,
        status: params?.status,
        search: params?.search,
        pagination: { page: 1, limit: 20 },
      });
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async updateProduct(
    productId: string,
    updates: Record<string, unknown>,
  ): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      // Use devUpdate (no auth) for testing
      const product = await this.trpc.product.devUpdate.mutate({
        storeId,
        productId,
        ...updates,
      });
      return { success: true, data: product };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async publishProduct(productId: string): Promise<ChatApiResult> {
    return this.updateProduct(productId, { status: 'active' });
  }

  async deleteProduct(productId: string): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      await this.trpc.product.delete.mutate({ storeId, productId });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Catalog AI (the magic moment) ────────────────────────

  async generateFromPhotos(
    imageUrls: string[],
    vertical?: string,
  ): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();

      // Get store vertical if not provided
      let storeVertical = vertical;
      if (!storeVertical) {
        const store = await this.trpc.store.get.query({ storeId });
        storeVertical = store.vertical || 'general';
      }

      const result = await this.trpc.catalog.devGenerate.mutate({
        storeId,
        imageUrls,
        vertical: storeVertical,
        language: 'en',
      });

      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Media Upload ─────────────────────────────────────────

  async getUploadUrl(
    fileName: string,
    contentType: string,
    fileSizeBytes?: number,
  ): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const result = await this.trpc.media.devGetUploadUrl.mutate({
        storeId,
        fileName,
        contentType,
        fileSizeBytes,
      });
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async confirmUpload(mediaAssetId: string): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const result = await this.trpc.media.devConfirmUpload.mutate({
        storeId,
        mediaAssetId,
      });
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Order Operations ─────────────────────────────────────

  async listOrders(params?: {
    status?: string;
    period?: string;
  }): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();

      const dateRange = params?.period ? this.periodToDateRange(params.period) : undefined;

      const result = await this.trpc.order.list.query({
        storeId,
        status: params?.status,
        dateRange,
        pagination: { page: 1, limit: 20 },
      });
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getOrder(orderId: string): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const order = await this.trpc.order.get.query({ storeId, orderId });
      return { success: true, data: order };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    extras?: { trackingNumber?: string; notes?: string },
  ): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const order = await this.trpc.order.updateStatus.mutate({
        storeId,
        orderId,
        status,
        ...extras,
      });
      return { success: true, data: order };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getRevenue(period: string = 'today'): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const result = await this.trpc.order.revenue.query({
        storeId,
        period: period as 'today' | 'week' | 'month',
      });
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Category Operations ──────────────────────────────────

  async listCategories(): Promise<ChatApiResult> {
    try {
      const storeId = this.requireStore();
      const result = await this.trpc.category.getTree.query({ storeId });
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  private periodToDateRange(period: string): { from: string; to: string } | undefined {
    const now = new Date();
    const to = now.toISOString();

    switch (period) {
      case 'today': {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { from: start.toISOString(), to };
      }
      case 'week': {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { from: start.toISOString(), to };
      }
      case 'month': {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        return { from: start.toISOString(), to };
      }
      default:
        return undefined;
    }
  }
}
