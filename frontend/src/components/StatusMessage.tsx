import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { layout } from '../app/theme';

interface StatusMessageProps {
  title: string;
  description: string;
  /** Label of the optional action button. */
  actionLabel?: string;
  onAction?: () => void;
  /**
   * "error" is announced immediately by screen readers (role alert);
   * "info" waits for a pause (role status).
   */
  tone?: 'info' | 'error';
}

/**
 * A plain message with an optional action. Used for the empty and error
 * states of the catalogue and the product page.
 */
export function StatusMessage({
  title,
  description,
  actionLabel,
  onAction,
  tone = 'info',
}: StatusMessageProps) {
  return (
    <Box
      role={tone === 'error' ? 'alert' : 'status'}
      sx={{
        py: { xs: 6, md: 8 },
        px: 2,
        maxWidth: layout.readingWidth,
        mx: 'auto',
        textAlign: 'center',
      }}
    >
      <Typography component="h2" variant="h2" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">{description}</Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 3 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
