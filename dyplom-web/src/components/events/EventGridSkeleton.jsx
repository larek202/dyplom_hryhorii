import { Box, Skeleton } from '@mui/material';
import './events.css';

function EventCardSkeleton() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--mm-radius-card)',
        border: '1px solid var(--mm-border)',
        overflow: 'hidden',
        bgcolor: 'var(--mm-surface)',
        boxShadow: 'var(--mm-shadow-xs), var(--mm-shadow-sm)',
      }}
    >
      <Skeleton
        variant="rectangular"
        animation="wave"
        sx={{
          width: 1,
          aspectRatio: '16 / 10',
          transform: 'none',
          bgcolor: 'action.hover',
        }}
      />
      <Box
        sx={{
          p: 2,
          pb: 2.25,
          borderTop: '1px solid var(--mm-border-hairline)',
          bgcolor: 'var(--mm-bg-elevated)',
        }}
      >
        <Skeleton animation="wave" height={22} width="88%" sx={{ mb: 1.25, borderRadius: 1 }} />
        <Skeleton animation="wave" height={16} width="42%" sx={{ borderRadius: 1 }} />
      </Box>
    </Box>
  );
}

export default function EventGridSkeleton({ count = 6 }) {
  return (
    <div className="mm-event-grid" aria-busy="true" aria-label="Ładowanie wydarzeń">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
