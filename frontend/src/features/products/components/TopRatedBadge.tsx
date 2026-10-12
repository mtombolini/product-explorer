import Box from '@mui/material/Box';

/**
 * The yellow accent of the interface: marks the best rated products.
 * Yellow is only a background here, always behind near-black text.
 */
export function TopRatedBadge() {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: 0.5,
        bgcolor: 'secondary.main',
        color: 'secondary.contrastText',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        lineHeight: 1.5,
      }}
    >
      Top rated
    </Box>
  );
}
