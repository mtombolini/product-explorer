import { useEffect } from 'react';

const APP_NAME = 'Product Explorer';

/** Set the browser tab title to "<page> | Product Explorer". */
export function useDocumentTitle(pageTitle: string): void {
  useEffect(() => {
    document.title = `${pageTitle} | ${APP_NAME}`;
  }, [pageTitle]);
}
