import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTranslation } from 'react-i18next';

import { categoryName } from '../../../i18n/categoryNames';

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
 * presses the focused one.
 */
export function CategoryFilter({
  categories,
  selected,
  onSelect,
  label,
}: CategoryFilterProps) {
  const { t, i18n } = useTranslation();

  const options = [
    { value: '', label: t('filter.all') },
    ...categories.map((category) => ({
      value: category,
      label: categoryName(category, i18n.language),
    })),
  ];

  return (
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
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
