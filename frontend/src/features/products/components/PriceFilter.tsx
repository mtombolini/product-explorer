import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { formatPrice } from '../format';

/** The price range of the list: each bound is optional. */
export interface PriceRange {
  min: number | null;
  max: number | null;
}

interface PriceFilterProps {
  value: PriceRange;
  onChange: (range: PriceRange) => void;
}

/** "12,5" or "12.5" -> 12.5; empty -> null; anything else -> NaN. */
function parseAmount(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  return /^\d+(\.\d{0,2})?$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/**
 * A button that opens a small form with the lowest and the highest
 * price. The range only applies when the form is submitted, so typing
 * does not send a request per key. The button shows the active range.
 */
export function PriceFilter({ value, onChange }: PriceFilterProps) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [minText, setMinText] = useState('');
  const [maxText, setMaxText] = useState('');

  const min = parseAmount(minText);
  const max = parseAmount(maxText);
  const isInvalid =
    Number.isNaN(min) ||
    Number.isNaN(max) ||
    (min !== null && max !== null && min > max);

  const isActive = value.min !== null || value.max !== null;
  const format = (amount: number) => formatPrice(amount, i18n.language);
  let buttonLabel = t('price.title');
  if (value.min !== null && value.max !== null) {
    buttonLabel = `${format(value.min)} – ${format(value.max)}`;
  } else if (value.min !== null) {
    buttonLabel = t('price.from', { amount: format(value.min) });
  } else if (value.max !== null) {
    buttonLabel = t('price.upTo', { amount: format(value.max) });
  }

  function open(target: HTMLElement): void {
    // The fields start from the range that is applied now.
    setMinText(value.min === null ? '' : String(value.min));
    setMaxText(value.max === null ? '' : String(value.max));
    setAnchor(target);
  }

  function apply(event: FormEvent): void {
    event.preventDefault();
    if (isInvalid) return;
    onChange({ min, max });
    setAnchor(null);
  }

  function clear(): void {
    onChange({ min: null, max: null });
    setAnchor(null);
  }

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        endIcon={<ExpandMoreIcon />}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        // The accessible name says what the button is for, also when it
        // shows a range.
        aria-label={
          isActive ? `${t('price.title')}: ${buttonLabel}` : t('price.title')
        }
        onClick={(event) => open(event.currentTarget)}
        sx={{
          whiteSpace: 'nowrap',
          fontWeight: isActive ? 700 : 400,
          bgcolor: 'background.paper',
          borderColor: 'grey.600',
        }}
      >
        {buttonLabel}
      </Button>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { role: 'dialog', 'aria-labelledby': titleId },
        }}
      >
        <Box
          component="form"
          onSubmit={apply}
          noValidate
          sx={{ p: 2, display: 'grid', gap: 2, width: 280 }}
        >
          <Typography id={titleId} component="h2" variant="h3">
            {t('price.title')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label={t('price.min')}
              value={minText}
              onChange={(event) => setMinText(event.target.value)}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label={t('price.max')}
              value={maxText}
              onChange={(event) => setMaxText(event.target.value)}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </Box>
          {isInvalid && (
            <Typography role="alert" variant="body2" color="error">
              {t('price.invalid')}
            </Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={clear}>{t('price.clear')}</Button>
            <Button type="submit" variant="contained" disabled={isInvalid}>
              {t('price.apply')}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
