import { describe, expect, it } from 'vitest';

import { catalogueUrl, parseCatalogueQuery } from './catalogueUrl';
import { queryKey } from './queryKey';

function parse(queryString: string) {
  return parseCatalogueQuery(new URLSearchParams(queryString));
}

describe('parseCatalogueQuery', () => {
  it('uses the defaults when nothing is given', () => {
    expect(parse('')).toEqual({ search: '', category: '', page: 1 });
  });

  it('reads search, category and page', () => {
    expect(parse('search=shirt&category=men%27s+clothing&page=3')).toEqual({
      search: 'shirt',
      category: "men's clothing",
      page: 3,
    });
  });

  it.each(['0', '-2', '1.5', 'abc', '', '1000001'])(
    'falls back to page 1 for page=%s',
    (page) => {
      expect(parse(`page=${page}`).page).toBe(1);
    },
  );

  it('trims the filters and limits their length', () => {
    const long = 'a'.repeat(150);

    expect(parse('search=++shirt++').search).toBe('shirt');
    expect(parse(`search=${long}`).search).toHaveLength(100);
  });
});

describe('catalogueUrl', () => {
  it('leaves the default values out of the address', () => {
    expect(catalogueUrl({ search: '', category: '', page: 1 })).toBe(
      '/products',
    );
  });

  it('writes what parseCatalogueQuery reads back', () => {
    const query = { search: '100% cotton & more', category: "men's", page: 2 };

    const url = catalogueUrl(query);

    expect(parse(url.split('?')[1])).toEqual(query);
  });
});

describe('queryKey', () => {
  it('is the same for equal queries and different otherwise', () => {
    const query = { search: 'shirt', category: '', page: 1 };

    expect(queryKey(query)).toBe(queryKey({ ...query }));
    expect(queryKey(query)).not.toBe(queryKey({ ...query, page: 2 }));
    expect(queryKey(query)).not.toBe(
      queryKey({ search: '', category: 'shirt', page: 1 }),
    );
  });
});
