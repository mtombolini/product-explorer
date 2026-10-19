import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatPrice, formatRating } from '../features/products/format';
import { installFakeApi, makeProduct } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';
import { categoryName } from './categoryNames';
import { i18n } from './i18n';
import { initialLanguage, SUPPORTED_LANGUAGES } from './languages';
import { en } from './locales/en';
import { es } from './locales/es';

afterEach(() => {
  vi.unstubAllGlobals();
});

const catalogue = [
  makeProduct(1, { title: 'Cotton shirt', category: "men's clothing" }),
  makeProduct(2, { title: 'Gold ring', category: 'jewelery' }),
];

/** Open the language menu in the header and pick a language by name. */
async function chooseLanguage(
  user: ReturnType<typeof renderApp>['user'],
  name: string,
): Promise<void> {
  await user.click(screen.getByRole('button', { name: /^(Language|Idioma):/ }));
  await user.click(await screen.findByRole('menuitemradio', { name }));
}

/** Every key of a message tree, as "section.key". */
function keysOf(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object'
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('language switcher', () => {
  it('shows the interface in Spanish and remembers the choice', async () => {
    installFakeApi(catalogue);
    const { user } = renderApp('/products');
    await screen.findByRole('heading', { name: 'Gold ring' });
    expect(screen.getByText('2 products')).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Language: English' }),
    ).toBeInTheDocument();
    await chooseLanguage(user, 'Español');

    // Interface copy, plurals and category names change...
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Productos' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 productos')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Buscar productos' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /^Ordenar por/ }),
    ).toHaveTextContent('Orden predeterminado');
    expect(screen.getByRole('button', { name: 'Joyería' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Idioma: Español' }),
    ).toBeInTheDocument();
    // ...the catalogue text does not, and says which language it is in.
    expect(screen.getByRole('heading', { name: 'Gold ring' })).toHaveAttribute(
      'lang',
      'en',
    );

    // The document and the next visit know the language.
    expect(document.documentElement.lang).toBe('es');
    expect(initialLanguage()).toBe('es');
    expect(document.title).toBe('Productos | Product Explorer');
  });

  it('uses the singular and the translated category in the summary', async () => {
    installFakeApi(catalogue);
    await i18n.changeLanguage('es');
    renderApp('/products?search=shirt&category=men%27s+clothing');

    expect(
      await screen.findByText('1 producto para "shirt" en Ropa de hombre'),
    ).toBeInTheDocument();
  });

  it('translates error and empty states', async () => {
    const api = installFakeApi(catalogue);
    api.isBroken = true;
    await i18n.changeLanguage('es');
    renderApp('/products');

    expect(
      await screen.findByText('No se pudieron cargar los productos'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'El servidor no pudo responder. Vuelve a intentarlo en un momento.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('keeps working after going back to English', async () => {
    installFakeApi(catalogue);
    const { user } = renderApp('/products');
    await screen.findByRole('heading', { name: 'Gold ring' });

    await chooseLanguage(user, 'Español');
    await screen.findByText('2 productos');
    await chooseLanguage(user, 'English');

    await waitFor(() =>
      expect(screen.getByText('2 products')).toBeInTheDocument(),
    );
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('translations', () => {
  it('has the same keys in every language', () => {
    expect(keysOf(es).sort()).toEqual(keysOf(en).sort());
  });

  it('registers every supported language', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(i18n.hasResourceBundle(language.code, 'translation')).toBe(true);
    }
  });

  it('ignores a stored language that is not supported', () => {
    window.localStorage.setItem('product-explorer.language', 'xx');

    expect(initialLanguage()).toBe('en');
  });
});

describe('language of a first visit', () => {
  /** A first visit: nothing stored, and these browser languages. */
  function browserPrefers(languages: string[]): void {
    // The test setup switches to English, which stores that choice.
    window.localStorage.clear();
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(languages);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('takes the first language of the browser that is supported', () => {
    browserPrefers(['fr-FR', 'es-CL', 'en']);

    expect(initialLanguage()).toBe('es');
  });

  it('falls back to English when the browser has none of them', () => {
    browserPrefers(['fr-FR', 'de']);

    expect(initialLanguage()).toBe('en');
  });

  it('prefers the language chosen on an earlier visit', () => {
    browserPrefers(['es-CL']);
    window.localStorage.setItem('product-explorer.language', 'en');

    expect(initialLanguage()).toBe('en');
  });
});

describe('formatting by language', () => {
  it('formats prices and ratings with the conventions of the language', () => {
    expect(formatPrice(109.95, 'en')).toBe('$109.95');
    // Spanish puts the symbol after the number, with a non-breaking space.
    expect(formatPrice(109.95, 'es')).toMatch(/^109,95\sUS\$$/);
    expect(formatRating(4, 'en')).toBe('4.0');
    expect(formatRating(3.9, 'es')).toBe('3,9');
  });

  it('translates known categories and keeps unknown ones readable', () => {
    expect(categoryName('jewelery', 'en')).toBe('Jewelery');
    expect(categoryName('jewelery', 'es')).toBe('Joyería');
    expect(categoryName('garden tools', 'es')).toBe('Garden tools');
  });
});

describe('language menu', () => {
  it('marks the current language and closes after a choice', async () => {
    installFakeApi(catalogue);
    const { user } = renderApp('/products');
    const button = screen.getByRole('button', { name: 'Language: English' });

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(
      await screen.findByRole('menuitemradio', { name: 'English' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('menuitemradio', { name: 'Español' }),
    ).toHaveAttribute('aria-checked', 'false');

    await user.click(screen.getByRole('menuitemradio', { name: 'Español' }));

    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Idioma: Español' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('catalogue text in the chosen language', () => {
  // Only the first product has a Spanish translation.
  const translations = {
    es: {
      1: { title: 'Camisa de algodón', description: 'Descripción en español' },
    },
  };

  it('asks for the list again in Spanish and shows the translated text', async () => {
    const api = installFakeApi(catalogue, translations);
    const { user } = renderApp('/products');
    await screen.findByRole('heading', { name: 'Cotton shirt' });

    await chooseLanguage(user, 'Español');

    expect(
      await screen.findByRole('heading', { name: 'Camisa de algodón' }),
    ).toHaveAttribute('lang', 'es');
    expect(
      screen.queryByRole('heading', { name: 'Cotton shirt' }),
    ).not.toBeInTheDocument();
    // A product without a translation keeps its text and says so.
    expect(screen.getByRole('heading', { name: 'Gold ring' })).toHaveAttribute(
      'lang',
      'en',
    );
    // One request per language; the categories are not asked again.
    expect(api.requestsTo('/api/products')).toEqual([
      '/api/products?page=1&page_size=12&lang=en',
      '/api/products?page=1&page_size=12&lang=es',
    ]);
    expect(api.requestsTo('/api/categories')).toHaveLength(1);
  });

  it('starts in the remembered language without asking in English first', async () => {
    const api = installFakeApi(catalogue, translations);
    await i18n.changeLanguage('es');
    renderApp('/product/1');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Camisa de algodón',
      }),
    ).toHaveAttribute('lang', 'es');
    expect(screen.getByText('Descripción en español')).toBeInTheDocument();
    expect(api.requests).toEqual(['/api/products/1?lang=es']);
  });

  it('reloads the open product when the language changes', async () => {
    const api = installFakeApi(catalogue, translations);
    const { user } = renderApp('/product/1');
    await screen.findByRole('heading', { level: 1, name: 'Cotton shirt' });

    await chooseLanguage(user, 'Español');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Camisa de algodón',
      }),
    ).toBeInTheDocument();
    expect(api.requests).toEqual([
      '/api/products/1?lang=en',
      '/api/products/1?lang=es',
    ]);
  });
});
