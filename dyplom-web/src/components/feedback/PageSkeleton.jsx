import { Skeleton, Stack } from '@mui/material';

/**
 * Szkielet treści strony (nagłówek + blok).
 * @param {{ showTitle?: boolean; tableHeight?: number }} props
 */
export default function PageSkeleton({ showTitle = true, tableHeight = 220 }) {
  return (
    <Stack spacing={2}>
      {showTitle ? <Skeleton variant="text" width={280} height={40} sx={{ maxWidth: '100%' }} /> : null}
      <Skeleton variant="rectangular" height={tableHeight} sx={{ borderRadius: 1, maxWidth: '100%' }} />
    </Stack>
  );
}
