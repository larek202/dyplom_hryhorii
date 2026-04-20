import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { formatEventStreetLine } from '../../utils/eventAddress.js';

function formatEventDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Kompaktowa karta na liście obok mapy — klik całej karty (poza linkiem) wybiera wydarzenie.
 * @param {{ event: object; selected?: boolean; onSelect: () => void }} props
 */
export default function MapEventListCard({ event, selected = false, onSelect }) {
  const id = event._id || event.id;
  const urls = Array.isArray(event.images)
    ? event.images.map((u) => String(u || '').trim()).filter(Boolean)
    : [];
  let coverIdx = Number(event.coverImageIndex);
  if (!Number.isFinite(coverIdx) || coverIdx < 0) coverIdx = 0;
  if (urls.length) coverIdx = Math.min(Math.floor(coverIdx), urls.length - 1);
  const imageUrl = urls.length ? urls[coverIdx] : undefined;
  const title = (event.title || '').trim() || 'Bez tytułu';
  const city = (event.city || '').trim() || '—';
  const street = formatEventStreetLine(event);
  const dateStr = formatEventDateShort(event.date);
  const detailPath = `/events/${id}`;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        border: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? (t) => alpha(t.palette.primary.main, 0.04) : 'background.paper',
        boxShadow: selected
          ? (t) => `0 4px 16px ${alpha(t.palette.primary.main, 0.15)}`
          : (t) => `0 1px 3px ${alpha(t.palette.common.black, 0.06)}`,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
        overflow: 'hidden',
      }}
    >
      <CardActionArea
        onClick={onSelect}
        sx={{
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          py: 0,
          '&:hover .mm-map-card-title': { color: 'primary.main' },
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 1.5,
            width: '100%',
            '&:last-child': { pb: 1.5 },
          }}
        >
          <Box
            sx={{
              width: 88,
              height: 68,
              flexShrink: 0,
              borderRadius: 1.5,
              overflow: 'hidden',
              bgcolor: 'grey.100',
              background: (t) =>
                imageUrl
                  ? undefined
                  : `linear-gradient(145deg, ${alpha(t.palette.primary.light, 0.2)} 0%, ${t.palette.grey[200]} 100%)`,
            }}
          >
            {imageUrl ? (
              <Box component="img" src={imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                }}
              >
                Brak
              </Box>
            )}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              className="mm-map-card-title"
              component={RouterLink}
              to={detailPath}
              onClick={(e) => e.stopPropagation()}
              variant="subtitle2"
              fontWeight={700}
              color="text.primary"
              sx={{
                letterSpacing: '-0.02em',
                lineHeight: 1.35,
                textDecoration: 'none',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mb: 0.25,
              }}
            >
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.4 }}>
              {city}
              {street ? ` · ${street}` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mt: 0.25, display: 'block' }}>
              {dateStr}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
