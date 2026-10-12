import type { Messages } from './en';

/** Spanish interface copy. Same keys as English, checked by the type. */
export const es: Messages = {
  layout: {
    skipToContent: 'Saltar al contenido principal',
    homeLink: 'Product Explorer, ir a productos',
    languageLabel: 'Idioma',
    footer:
      'Product Explorer es un proyecto de demostración. El catálogo se importó desde Fake Store API y se sirve desde nuestra propia base de datos.',
  },
  search: {
    label: 'Buscar productos',
    clear: 'Borrar búsqueda',
  },
  filter: {
    title: 'Categoría',
    all: 'Todas',
  },
  catalogue: {
    title: 'Productos',
    loading: 'Cargando productos…',
    summary_one: '{{count}} producto',
    summary_other: '{{count}} productos',
    summarySearch_one: '{{count}} producto para "{{search}}"',
    summarySearch_other: '{{count}} productos para "{{search}}"',
    summaryCategory_one: '{{count}} producto en {{category}}',
    summaryCategory_other: '{{count}} productos en {{category}}',
    summarySearchCategory_one:
      '{{count}} producto para "{{search}}" en {{category}}',
    summarySearchCategory_other:
      '{{count}} productos para "{{search}}" en {{category}}',
    errorTitle: 'No se pudieron cargar los productos',
    emptyTitle: 'El catálogo está vacío',
    emptyDescription:
      'Los productos aún no se han importado. Ejecuta la importación y vuelve a intentarlo.',
    noResultsTitle: 'No se encontraron productos',
    noResultsDescription:
      'Nada coincide con tu búsqueda y categoría. Prueba con otras palabras o borra los filtros.',
    clearFilters: 'Borrar filtros',
    pastEndTitle: 'Esta página no existe',
    pastEndDescription: 'Los resultados terminan en la página {{page}}.',
    firstPage: 'Ir a la primera página',
  },
  pagination: {
    label: 'Paginación',
    goToPage: 'Ir a la página {{page}}',
    currentPage: 'página {{page}}',
    previous: 'Ir a la página anterior',
    next: 'Ir a la página siguiente',
  },
  product: {
    title: 'Producto',
    back: 'Volver a productos',
    loading: 'Cargando producto',
    notFoundTitle: 'Producto no encontrado',
    notFoundDescription: 'Este producto no existe o ya no está en el catálogo.',
    errorTitle: 'No se pudo cargar el producto',
    topRated: 'Mejor valorado',
    noRatings: 'Aún sin valoraciones',
    ratingText_one: 'Valorado con {{rate}} de 5 por {{count}} cliente',
    ratingText_other: 'Valorado con {{rate}} de 5 por {{count}} clientes',
  },
  notFound: {
    title: 'Página no encontrada',
    description:
      'Esta dirección no corresponde a ninguna página. Revisa el enlace o vuelve al catálogo.',
    action: 'Ir a productos',
  },
  crash: {
    title: 'Algo salió mal',
    description: 'No se pudo mostrar la página. Recargarla suele solucionarlo.',
    action: 'Recargar la página',
  },
  errors: {
    network:
      'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.',
    server: 'El servidor no pudo responder. Vuelve a intentarlo en un momento.',
  },
  actions: {
    tryAgain: 'Reintentar',
  },
};
