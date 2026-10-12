import { vi } from 'vitest';

import { PAGE_SIZE } from '../api/products';
import type { Product } from '../api/types';

/** Build a product for a test. Pass only the fields the test cares about. */
export function makeProduct(id: number, overrides: Partial<Product> = {}) {
  const product: Product = {
    id,
    title: `Product ${id}`,
    description: `Description of product ${id}`,
    price: 10 + id,
    category: 'electronics',
    image_url: null,
    rating_rate: 4.1,
    rating_count: 25,
    ...overrides,
  };
  return product;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, code: string, message: string) {
  return jsonResponse({ error: { code, message, details: [] } }, status);
}

/**
 * Replace the global fetch with an in-memory copy of our API, so the
 * tests are fast, deterministic and never touch the network.
 *
 * It answers the three endpoints the application uses, with the same
 * search, category and pagination rules as the backend, and records the
 * address of every request so a test can assert what was (not) fetched.
 */
export function installFakeApi(products: Product[]) {
  const api = {
    /** Path and query of every request received, in order. */
    requests: [] as string[],
    /** Set to true to make every request fail with a 500. */
    isBroken: false,
    /** The requests whose path starts with the given text. */
    requestsTo(path: string): string[] {
      return api.requests.filter((url) => url.startsWith(path));
    },
  };

  function handle(input: RequestInfo | URL): Response {
    const url = new URL(String(input), 'http://localhost');
    api.requests.push(url.pathname + url.search);

    if (api.isBroken) {
      return errorResponse(500, 'internal_error', 'An unexpected error.');
    }

    if (url.pathname === '/api/categories') {
      const categories = [...new Set(products.map((p) => p.category))];
      return jsonResponse({ items: categories.sort() });
    }

    if (url.pathname === '/api/products') {
      const search = (url.searchParams.get('search') ?? '').toLowerCase();
      const category = url.searchParams.get('category') ?? '';
      const page = Number(url.searchParams.get('page') ?? 1);
      const matching = products.filter(
        (product) =>
          (!search || product.title.toLowerCase().includes(search)) &&
          (!category || product.category === category),
      );
      const start = (page - 1) * PAGE_SIZE;
      return jsonResponse({
        items: matching.slice(start, start + PAGE_SIZE),
        total: matching.length,
        page,
        page_size: PAGE_SIZE,
        total_pages: Math.ceil(matching.length / PAGE_SIZE),
      });
    }

    const match = /^\/api\/products\/(\d+)$/.exec(url.pathname);
    const product = match && products.find((p) => p.id === Number(match[1]));
    if (product) {
      return jsonResponse(product);
    }
    return errorResponse(404, 'product_not_found', 'Product was not found.');
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => handle(input)),
  );
  return api;
}
