import { Link as RouterLink } from 'react-router-dom';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Button } from '../../ui';
import { formatEventStreetLine } from '../../utils/eventAddress.js';
import { getAdditionalCategories, getPrimaryCategory } from '../../utils/eventCategories.js';

function formatEventDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventCard({
  event,
  onRemoveFromFavorites,
  removeFavoriteBusy = false,
  compact = false,
  favoriteBadge = false,
}) {
  const id = event._id || event.id;
  const urls = Array.isArray(event.images)
    ? event.images.map((u) => String(u || '').trim()).filter(Boolean)
    : [];
  let coverIdx = Number(event.coverImageIndex);
  if (!Number.isFinite(coverIdx) || coverIdx < 0) coverIdx = 0;
  if (urls.length) coverIdx = Math.min(Math.floor(coverIdx), urls.length - 1);
  const imageUrl = urls.length ? urls[coverIdx] : undefined;
  const title = (event.title || '').trim() || 'Bez tytułu';
  const city = (event.city || '').trim() || 'Nie podano miejsca';
  const streetLine = formatEventStreetLine(event);
  const dateStr = formatEventDate(event.date) || 'Nie podano daty';
  const detailPath = `/events/${id}`;
  const primaryCat = getPrimaryCategory(event);
  const firstExtra = getAdditionalCategories(event)[0];

  return (
    <Card
      component="article"
      elevation={0}
      className={`mm-event-card${compact ? ' mm-event-card--compact' : ''}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        '&:hover': {
          transform: compact ? 'translateY(-2px)' : 'translateY(-4px)',
          borderColor: alpha('#2563eb', 0.22),
          boxShadow: (t) =>
            `0 12px 24px -6px ${alpha(t.palette.common.black, 0.08)}, 0 24px 48px -12px ${alpha('#2563eb', 0.1)}`,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <Box
        className="mm-event-card__media"
        sx={{
          position: 'relative',
          height: compact ? 120 : 180,
          flexShrink: 0,
          overflow: 'hidden',
          bgcolor: 'grey.100',
          background: (t) =>
            `linear-gradient(155deg, ${alpha(t.palette.primary.light, 0.15)} 0%, ${t.palette.grey[100]} 48%, ${alpha(t.palette.primary.main, 0.06)} 100%)`,
        }}
      >
        {imageUrl ? (
          <Box
            component="img"
            src={imageUrl}
            alt=""
            loading="lazy"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              '.mm-event-card:hover &': { transform: 'scale(1.045)' },
              '@media (prefers-reduced-motion: reduce)': {
                '.mm-event-card:hover &': { transform: 'none' },
              },
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Brak zdjęcia
          </Box>
        )}
        {favoriteBadge ? (
          <Chip
            icon={<FavoriteIcon fontSize="small" />}
            label="Ulubione"
            size="small"
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              px: 1,
              py: 0.1,
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '-0.01em',
              bgcolor: '#fee2e2',
              color: '#dc2626',
              '& .MuiChip-icon': {
                ml: 0.25,
                color: '#dc2626',
              },
            }}
          />
        ) : null}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(12, 18, 34, 0.08) 0%, transparent 45%)',
            pointerEvents: 'none',
            transition: 'opacity 0.35s ease',
            '.mm-event-card:hover &': { opacity: 0.75 },
          }}
        />
      </Box>

      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          pt: compact ? 1.5 : 2,
          px: compact ? 1.5 : 2,
          pb: compact ? 1.5 : 2,
          borderTop: 1,
          borderColor: 'divider',
          background: (t) =>
            `linear-gradient(180deg, ${alpha(t.palette.grey[50], 0.95)} 0%, ${t.palette.background.paper} 32%)`,
        }}
      >
        <Typography
          variant={compact ? 'subtitle2' : 'subtitle1'}
          component="h3"
          sx={{
            fontWeight: 600,
            letterSpacing: '-0.028em',
            lineHeight: 1.42,
            mb: compact ? 0.5 : 1,
            transition: 'color 0.2s ease',
            ...(compact
              ? {
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }
              : {}),
            '.mm-event-card:hover &': { color: 'primary.main' },
          }}
        >
          {title}
        </Typography>
        {primaryCat || firstExtra ? (
          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{
              gap: 1.25,
              mb: compact ? 0.35 : 0.5,
              alignItems: 'center',
            }}
          >
            {primaryCat ? (
              <Chip
                label={primaryCat}
                size="small"
                color="primary"
                sx={{
                  height: 26,
                  fontSize: compact ? '0.75rem' : '0.78rem',
                  fontWeight: 700,
                  '& .MuiChip-label': { px: 1.25 },
                }}
              />
            ) : null}
            {firstExtra ? (
              <Chip
                label={firstExtra}
                size="small"
                variant="outlined"
                sx={{
                  height: 26,
                  fontSize: compact ? '0.75rem' : '0.78rem',
                  fontWeight: 600,
                  '& .MuiChip-label': { px: 1.25 },
                }}
              />
            ) : null}
          </Stack>
        ) : null}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 0.25, letterSpacing: '-0.012em', fontSize: compact ? '0.8125rem' : undefined }}
        >
          {city}
        </Typography>
        {streetLine ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 0.25, letterSpacing: '-0.012em', fontSize: compact ? '0.78rem' : undefined }}
          >
            {streetLine}
          </Typography>
        ) : null}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: compact ? 1.25 : 2, letterSpacing: '-0.012em', fontSize: compact ? '0.75rem' : undefined }}
        >
          {dateStr}
        </Typography>
        <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: compact ? 1 : 1.5 }}>
          <Button
            component={RouterLink}
            to={detailPath}
            variant="contained"
            color="primary"
            fullWidth
            size={compact ? 'small' : 'medium'}
          >
            Zobacz więcej
          </Button>
          {onRemoveFromFavorites ? (
          <Button
            type="button"
            variant="outlined"
            color="error"
            fullWidth
            size="small"
            disabled={removeFavoriteBusy}
            onClick={() => onRemoveFromFavorites(String(id))}
            startIcon={<DeleteOutlineOutlinedIcon fontSize="small" />}
            sx={{
              py: 0.6,
              fontSize: '0.78rem',
              textTransform: 'none',
            }}
          >
              Usuń z ulubionych
            </Button>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
