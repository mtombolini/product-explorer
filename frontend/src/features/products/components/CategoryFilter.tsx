import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { categoryName } from '../../../i18n/categoryNames';
import { CategoryIcon } from './CategoryIcon';

interface CategoryFilterProps {
  categories: string[];
  /** The chosen category, or an empty string for "All". */
  selected: string;
  onSelect: (category: string) => void;
  /** The accessible name of the group, for example "Category". */
  label: string;
}

/**
 * The category filter: a row of joined buttons, one per category plus
 * "All", with exactly one pressed. Each is a real button that tells
 * screen readers whether it is pressed. MUI's group is one Tab stop: the
 * arrow keys, Home and End move between the buttons, and Enter or Space
 * presses the focused one. The row can be wider than a phone screen and
 * then scrolls sideways, so the pressed button is brought into view.
 */
export function CategoryFilter({
  categories,
  selected,
  onSelect,
  label,
}: CategoryFilterProps) {
  const { t, i18n } = useTranslation();
  const rowRef = useRef<HTMLDivElement>(null);

  // A category that comes from the address (a link, a reload) can be a
  // button outside the visible part of the row. The categories are in
  // the list because the buttons only exist once they have loaded.
  // Only the row moves: scrollIntoView would move the page as well and
  // lose the position restored when coming back from a product.
  useEffect(() => {
    const row = rowRef.current;
    const pressed = row?.querySelector('[aria-pressed="true"]');
    if (!row || !pressed) return;
    const visible = row.getBoundingClientRect();
    const button = pressed.getBoundingClientRect();
    if (button.left < visible.left) {
      row.scrollLeft -= visible.left - button.left;
    } else if (button.right > visible.right) {
      row.scrollLeft += button.right - visible.right;
    }
  }, [selected, categories]);

  const options = [
    { value: '', label: t('filter.all') },
    ...categories.map((category) => ({
      value: category,
      label: categoryName(category, i18n.language),
    })),
  ];

  return (
    <Box
      ref={rowRef}
      sx={{
        overflowX: 'auto',
        // Room for the focus ring, which the scroll box would cut.
        p: 0.75,
        m: -0.75,
      }}
    >
      <ToggleButtonGroup
        exclusive
        value={selected}
        aria-label={label}
        onChange={(_event, value: string | null) => {
          // Clicking the pressed button gives null: one stays pressed.
          if (value !== null) onSelect(value);
        }}
      >
        {options.map((option) => (
          <ToggleButton
            key={option.value}
            value={option.value}
            sx={{ gap: 0.75 }}
          >
            <CategoryIcon category={option.value} />
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
