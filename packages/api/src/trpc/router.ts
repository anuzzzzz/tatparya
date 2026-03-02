import { router } from './trpc.js';
import { healthRouter } from '../routers/health.router.js';
import { storeRouter } from '../routers/store.router.js';
import { productRouter } from '../routers/product.router.js';
import { categoryRouter } from '../routers/category.router.js';
import { orderRouter } from '../routers/order.router.js';
import { cartRouter } from '../routers/cart.router.js';
import { discountRouter } from '../routers/discount.router.js';
import { mediaRouter } from '../routers/media.router.js';
import { catalogRouter } from '../routers/catalog.router.js';
import { chatRouter } from '../routers/chat.router.js';

export const appRouter = router({
  health: healthRouter,
  store: storeRouter,
  product: productRouter,
  category: categoryRouter,
  order: orderRouter,
  cart: cartRouter,
  discount: discountRouter,
  media: mediaRouter,
  catalog: catalogRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
