import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import { formatCategory } from '../format';

interface CategoryFilterProps {
  categories: string[];
  /** The chosen category, or an empty string for "All". */
  selected: string;
  onSelect: (category: string) => void;
}

/**
 * The category filter: one chip per category plus "All". Exactly one is
 * pressed at a time. Each chip is a button, so it works with Tab, Enter
 * and Space, and tells screen readers whether it is pressed.
 */
export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  const options = [
    { value: '', label: 'All' },
    ...categories.map((category) => ({
      value: category,
      label: formatCategory(category),
    })),
  ];

  return (
    <Box
      role="group"
      aria-label="Filter by category"
      sx={{
        display: 'flex',
        gap: 1,
        // Small screens: one row that scrolls sideways. Wider: wrap.
        flexWrap: { xs: 'nowrap', md: 'wrap' },
        overflowX: { xs: 'auto', md: 'visible' },
        // Room for the focus ring, which the scroll box would cut off.
        p: 0.5,
        m: -0.5,
      }}
    >
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Chip
            key={option.value}
            label={option.label}
            clickable
            aria-pressed={isSelected}
            color={isSelected ? 'primary' : 'default'}
            variant={isSelected ? 'filled' : 'outlined'}
            onClick={() => onSelect(option.value)}
            sx={{ flexShrink: 0 }}
          />
        );
      })}
    </Box>
  );
}
