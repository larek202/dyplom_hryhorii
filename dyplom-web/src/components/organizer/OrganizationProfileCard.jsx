import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Link as MuiLink,
  Stack,
  Typography,
} from '@mui/material';
import { organizationToForm } from '../../utils/organizationForm.js';
import { formatAddressBlock, withHttps } from '../../utils/organizationDisplay.js';

/**
 * @param {{ organization: Record<string, unknown> | null | undefined }}
 */
export default function OrganizationProfileCard({ organization }) {
  const org = organization;
  if (!org) return null;

  const flat = organizationToForm(org);
  const addressText = formatAddressBlock(org);
  const websiteHref = withHttps(org.website);
  const facebookHref = withHttps(org.facebook);
  const instagramHref = withHttps(org.instagram);
  const hasContact = Boolean(
    flat.contactEmail?.trim() || flat.contactPhone?.trim() || websiteHref,
  );
  const hasSocial = Boolean(facebookHref || instagramHref);

  const mapsQuery = addressText.replace(/\s*\n+\s*/g, ', ').replace(/,\s*,/g, ',').trim();
  const googleMapsHref = mapsQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}`
    : '';

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
            {org.logoUrl?.trim() ? (
              <Box
                component="img"
                src={org.logoUrl.trim()}
                alt=""
                sx={{
                  width: { xs: '100%', sm: 160 },
                  maxWidth: 200,
                  maxHeight: 120,
                  objectFit: 'contain',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                }}
              />
            ) : (
              <Avatar
                variant="rounded"
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                  fontWeight: 700,
                }}
              >
                {(org.name || 'O').trim().charAt(0).toUpperCase() || 'O'}
              </Avatar>
            )}
            <Stack spacing={0.5} flex={1} minWidth={0}>
              <Typography variant="h4" component="h2" fontWeight={700}>
                {(org.name || '—').trim() || '—'}
              </Typography>
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
              Opis
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {org.description?.trim() ? org.description.trim() : 'Brak opisu.'}
            </Typography>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
              Adres
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              {addressText.trim() ? addressText : '—'}
            </Typography>
            {googleMapsHref ? (
              <Button
                component="a"
                href={googleMapsHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              >
                Otwórz w Google Maps
              </Button>
            ) : null}
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
              Kontakt
            </Typography>
            {hasContact ? (
              <Stack spacing={1} component="ul" sx={{ m: 0, pl: 2.5 }}>
                {flat.contactEmail?.trim() ? (
                  <Typography component="li" variant="body1" sx={{ display: 'list-item' }}>
                    <MuiLink href={`mailto:${flat.contactEmail.trim()}`}>{flat.contactEmail.trim()}</MuiLink>
                  </Typography>
                ) : null}
                {flat.contactPhone?.trim() ? (
                  <Typography component="li" variant="body1" sx={{ display: 'list-item' }}>
                    <MuiLink href={`tel:${flat.contactPhone.trim().replace(/\s+/g, '')}`}>
                      {flat.contactPhone.trim()}
                    </MuiLink>
                  </Typography>
                ) : null}
                {websiteHref ? (
                  <Typography component="li" variant="body1" sx={{ display: 'list-item' }}>
                    <MuiLink href={websiteHref} target="_blank" rel="noopener noreferrer">
                      {org.website?.trim() || websiteHref}
                    </MuiLink>
                  </Typography>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary">
                —
              </Typography>
            )}
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
              Social media
            </Typography>
            {hasSocial ? (
              <Stack spacing={1} component="ul" sx={{ m: 0, pl: 2.5 }}>
                {facebookHref ? (
                  <Typography component="li" variant="body1" sx={{ display: 'list-item' }}>
                    <MuiLink href={facebookHref} target="_blank" rel="noopener noreferrer">
                      Facebook
                    </MuiLink>
                  </Typography>
                ) : null}
                {instagramHref ? (
                  <Typography component="li" variant="body1" sx={{ display: 'list-item' }}>
                    <MuiLink href={instagramHref} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </MuiLink>
                  </Typography>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary">
                —
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
