import { describe, expect, it } from 'vitest';

import { catalogueUrl, parseCatalogueQuery } from './catalogueUrl';
import { queryKey } from './queryKey';

function parse(queryString: string) {
  return parseCatalogueQuery(new URLSearchParams(queryString));
}

describe('parseCatalogueQuery', () => {
  it('reads the price range and ignores invalid bounds', () => {
    expect(parse('min_price=10&max_price=49.999')).toMatchObject({
      minPrice: 10,
      maxPrice: 50,
    });
    expect(parse('min_price=-1&max_price=abc')).toMatchObject({
      minPrice: null,
      maxPrice: null,
    });
    // The wrong way round is swapped rather than sent to the API.
    expect(parse('min_price=50&max_price=10')).toMatchObject({
      minPrice: 10,
      maxPrice: 50,
    });
  });

  it('uses the defaults when nothing is given', () => {
    expect(parse('')).toEqual({
      search: '',
      category: '',
      minPrice: null,
      maxPrice: null,
      sort: '',
      page: 1,
    });
  });

  it('reads search, category, order and page', () => {
    expect(
      parse('search=shirt&category=men%27s+clothing&sort=price_desc&page=3'),
    ).toEqual({
      search: 'shirt',
      category: "men's clothing",
      minPrice: null,
      maxPrice: null,
      sort: 'price_desc',
      page: 3,
    });
  });

  it.each(['cheapest', 'PRICE_ASC', '', 'price_asc;drop'])(
    'falls back to the default order for sort=%s',
    (sort) => {
      expect(parse(`sort=${sort}`).sort).toBe('');
    },
  );

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
    expect(
      catalogueUrl({
        search: '',
        category: '',
        minPrice: null,
        maxPrice: null,
        sort: '',
        page: 1,
      }),
    ).toBe('/products');
  });

  it('writes what parseCatalogueQuery reads back', () => {
    const query = {
      search: '100% cotton & more',
      category: "men's",
      minPrice: null,
      maxPrice: null,
      sort: 'price_asc',
      page: 2,
    } as const;

    const url = catalogueUrl(query);

    expect(parse(url.split('?')[1])).toEqual(query);
  });
});

describe('queryKey', () => {
  it('is the same for equal queries and different otherwise', () => {
    const query = {
      search: 'shirt',
      category: '',
      minPrice: null,
      maxPrice: null,
      sort: '',
      page: 1,
    } as const;

    expect(queryKey(query)).toBe(queryKey({ ...query }));
    expect(queryKey(query)).not.toBe(queryKey({ ...query, page: 2 }));
    // A page cached in one order must never be shown for another.
    expect(queryKey(query)).not.toBe(queryKey({ ...query, sort: 'price_asc' }));
    expect(queryKey(query)).not.toBe(queryKey({ ...query, minPrice: 10 }));
    expect(queryKey(query)).not.toBe(queryKey({ ...query, maxPrice: 10 }));
    expect(queryKey(query)).not.toBe(
      queryKey({
        search: '',
        category: 'shirt',
        minPrice: null,
        maxPrice: null,
        sort: '',
        page: 1,
      }),
    );
  });
});
