/**
 * Category names are catalogue data, not interface copy: the API returns
 * them in the language of the source. Until the backend serves translated
 * content, the categories we know are translated here; any other category
 * is shown as it comes, in sentence case.
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
