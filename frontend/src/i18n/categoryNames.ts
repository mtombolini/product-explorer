/**
 * Categories are keys, the same in every language: the API filters by
 * them and never translates them (D-046). The interface gives the ones
 * we know a translated name here; any other category is shown as it
 * comes, in sentence case.
 */
const CATEGORY_NAMES: Record<string, Record<string, string>> = {
  es: {
    electronics: 'Electrónica',
    jewelery: 'Joyería',
    "men's clothing": 'Ropa de hombre',
    "women's clothing": 'Ropa de mujer',
  },
};

/** "men's clothing" -> "Men's clothing" */
function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The name of a category in the given interface language. */
export function categoryName(category: string, language: string): string {
  return CATEGORY_NAMES[language]?.[category] ?? sentenceCase(category);
}
