import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useTranslation } from 'react-i18next';

import type { SortOrder } from '../../../api/types';

interface SortSelectProps {
  /** The chosen order, or an empty string for the default order. */
  value: SortOrder;
  onChange: (sort: SortOrder) => void;
  /** The id of the visible label of the control. */
  labelledBy: string;
}

/**
 * Chooses the order of the product list: the default order or by price.
 * It is MUI's select (not the browser's), which opens a list that works
 * with the keyboard and announces itself as a combobox.
 */
export function SortSelect({ value, onChange, labelledBy }: SortSelectProps) {
  const { t } = useTranslation();

  const options: { value: SortOrder; label: string }[] = [
    { value: '', label: t('sort.default') },
    { value: 'price_asc', label: t('sort.priceAsc') },
    { value: 'price_desc', label: t('sort.priceDesc') },
  ];

  return (
    <Select<SortOrder>
      size="small"
      value={value}
      // The default order is an empty value: show its name, not a blank.
      displayEmpty
      labelId={labelledBy}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
}
