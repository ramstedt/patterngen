import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { TranslationKey } from '../../../i18n/translations';
import { useI18n } from '../../../i18n/useI18n';
import { PatternDraftPreview } from '../PatternPreview/PatternDraftPreview';
import {
  PATTERN_CATEGORIES,
  buildPatternDraft,
  calculatePattern,
  getPatternDefinition,
  getPatternPrintConfig,
  type PatternOption,
} from '../../lib/patterns';
import { formatMeasurement } from '../../lib/measurements';
import { loadProfiles, subscribeProfiles } from '../../storage/profiles';
import type { Profile } from '../../types/measurements';
import { downloadPatternPdf } from '../../lib/printing/patternPdf';

const SECTION_ORDER = [
  'basicMeasurements',
  'dartWidth',
  'sideLine',
  'dartPlacement',
] as const;

export function PatternSection({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedPattern, setSelectedPattern] = useState<PatternOption | ''>(
    '',
  );
  const [submittedProfileId, setSubmittedProfileId] = useState('');
  const [submittedPattern, setSubmittedPattern] = useState<PatternOption | ''>(
    '',
  );

  useEffect(() => {
    const syncProfiles = () => {
      const nextProfiles = loadProfiles();
      setProfiles(nextProfiles);

      if (
        selectedProfileId &&
        !nextProfiles.some((profile) => profile.id === selectedProfileId)
      ) {
        setSelectedProfileId('');
      }

      if (
        submittedProfileId &&
        !nextProfiles.some((profile) => profile.id === submittedProfileId)
      ) {
        setSubmittedProfileId('');
        setSubmittedPattern('');
      }
    };

    syncProfiles();
    return subscribeProfiles(syncProfiles);
  }, [selectedProfileId, submittedProfileId]);

  const submittedProfile = useMemo(
    () => profiles.find((profile) => profile.id === submittedProfileId) ?? null,
    [profiles, submittedProfileId],
  );
  const submittedPatternDefinition = useMemo(
    () => (submittedPattern ? getPatternDefinition(submittedPattern) : null),
    [submittedPattern],
  );
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const calculations = useMemo(() => {
    if (!submittedProfile || !submittedPattern) return [];
    return calculatePattern(submittedPattern, submittedProfile, t);
  }, [submittedPattern, submittedProfile, t]);

  const calculationsBySection = useMemo(() => {
    const sections = new Map<string, typeof calculations>();

    for (const calculation of calculations) {
      const section = calculation.section ?? 'basicMeasurements';
      const existing = sections.get(section) ?? [];
      existing.push(calculation);
      sections.set(section, existing);
    }

    return Array.from(sections.entries()).sort(([left], [right]) => {
      const leftIndex = SECTION_ORDER.indexOf(
        left as (typeof SECTION_ORDER)[number],
      );
      const rightIndex = SECTION_ORDER.indexOf(
        right as (typeof SECTION_ORDER)[number],
      );

      const normalizedLeft =
        leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight =
        rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

      return normalizedLeft - normalizedRight;
    });
  }, [calculations]);

  const draft = useMemo(() => {
    if (!submittedProfile || !submittedPattern) return null;
    return buildPatternDraft(submittedPattern, submittedProfile, t);
  }, [submittedPattern, submittedProfile, t]);
  const submittedPatternPrintConfig = useMemo(
    () =>
      submittedPattern && submittedProfile
        ? getPatternPrintConfig(submittedPattern, submittedProfile, t)
        : undefined,
    [submittedPattern, submittedProfile, t],
  );

  const showLargeDifferenceDartHelp = useMemo(
    () =>
      calculations.some(
        (calculation) =>
          calculation.id === 'frontDartWidthSecondary' ||
          calculation.id === 'backDartWidthSecondary',
      ),
    [calculations],
  );

  const requiredMeasurementStatus = useMemo(
    () =>
      submittedProfile && submittedPatternDefinition
        ? submittedPatternDefinition.requiredMeasurements.map((key) => ({
            key,
            value: submittedProfile.measurements[key],
          }))
        : [],
    [submittedPatternDefinition, submittedProfile],
  );
  const hasMissingRequiredMeasurements = useMemo(
    () => requiredMeasurementStatus.some((measurement) => measurement.value === 0),
    [requiredMeasurementStatus],
  );
  const missingRequiredMeasurements = useMemo(
    () => requiredMeasurementStatus.filter((measurement) => measurement.value === 0),
    [requiredMeasurementStatus],
  );

  const selectedPatternDefinition = useMemo(
    () => (selectedPattern ? getPatternDefinition(selectedPattern) : null),
    [selectedPattern],
  );
  const hasPatternProfileTypeMismatch = useMemo(
    () =>
      Boolean(
        selectedProfile &&
          selectedPatternDefinition &&
          !selectedPatternDefinition.supportedProfileTypes.includes(
            selectedProfile.profileType,
          ),
      ),
    [selectedPatternDefinition, selectedProfile],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProfileId || !selectedPattern) return;

    setSubmittedProfileId(selectedProfileId);
    setSubmittedPattern(selectedPattern);
  }

  function onDownloadPdf() {
    if (
      !draft ||
      !submittedProfile ||
      !submittedPattern ||
      !submittedPatternPrintConfig?.enabled
    ) {
      return;
    }

    downloadPatternPdf({
      draft,
      profileName: submittedProfile.name,
      patternLabel: t(submittedPattern),
      printConfig: submittedPatternPrintConfig,
    });
  }

  return (
    <Stack spacing={3}>
      {showHeader && (
        <Stack spacing={1}>
          <Typography variant='h5'>{t('patterns')}</Typography>
          <Typography color='text.secondary'>
            {t('patternSectionDescription')}
          </Typography>
        </Stack>
      )}
      <Paper
        component='form'
        onSubmit={onSubmit}
        sx={{
          p: { xs: 0, sm: 2.5 },
          bgcolor: { xs: 'transparent', sm: 'background.paper' },
          boxShadow: 'none',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr auto' },
            alignItems: 'end',
          }}
        >
          <TextField
            select
            label={t('selectProfile')}
            value={selectedProfileId}
            onChange={(event) => setSelectedProfileId(event.target.value)}
            size='small'
          >
            <MenuItem value=''>{t('selectProfile')}</MenuItem>
            {profiles.map((profile) => (
              <MenuItem key={profile.id} value={profile.id}>
                {profile.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={t('selectPattern')}
            value={selectedPattern}
            onChange={(event) =>
              setSelectedPattern(event.target.value as PatternOption | '')
            }
            size='small'
          >
            <MenuItem value=''>{t('selectPattern')}</MenuItem>
            {PATTERN_CATEGORIES.map(({ category, patterns }) => [
              <ListSubheader key={category}>{t(category as TranslationKey)}</ListSubheader>,
              ...patterns.map((pattern) => (
                <MenuItem key={pattern} value={pattern}>
                  {t(pattern)}
                </MenuItem>
              )),
            ])}
          </TextField>

          <Stack spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <Button
              type='submit'
              variant='contained'
              disabled={
                !profiles.length || !selectedProfileId || !selectedPattern
              }
              sx={{ width: { xs: '100%', md: 'auto' } }}
            >
              {t('calculatePattern')}
            </Button>
            {!profiles.length && (
              <Typography variant='body2' color='text.secondary'>
                {t('noProfilesAvailable')}
              </Typography>
            )}
          </Stack>
        </Box>
        {hasPatternProfileTypeMismatch && (
          <Alert severity='warning' sx={{ mt: 2 }}>
            {t('patternProfileTypeWarning')}
          </Alert>
        )}
      </Paper>
      {submittedProfile && submittedPattern && (
        <Paper
          variant='outlined'
          sx={{
            p: { xs: 0, sm: 2.5 },
            border: { xs: 0, sm: 1 },
            borderColor: 'divider',
            bgcolor: { xs: 'transparent', sm: 'background.paper' },
            boxShadow: 'none',
          }}
        >
          <Stack spacing={3}>
            <Stack spacing={0.5}>
              <Typography variant='h6'>{t(submittedPattern)}</Typography>
              <Typography color='text.secondary'>
                {t('patternCalculationPending').replace(
                  '{profileName}',
                  submittedProfile.name,
                )}
              </Typography>
            </Stack>

            {hasMissingRequiredMeasurements && (
              <Alert severity='warning'>
                <Stack spacing={1}>
                  <Typography fontWeight={600}>
                    {t('zeroMeasurementsWarning')}
                  </Typography>
                  {missingRequiredMeasurements.map((measurement) => (
                    <Typography key={measurement.key} variant='body2'>
                      {t(measurement.key as TranslationKey)}: {formatMeasurement(measurement.value)} cm
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            )}

            {draft && <PatternDraftPreview draft={draft} />}

            {draft && submittedPatternPrintConfig?.enabled && (
              <Stack spacing={1} alignItems='flex-start'>
                <Button variant='outlined' onClick={onDownloadPdf}>
                  {t('downloadPdf')}
                </Button>
                <Typography variant='body2' color='text.secondary'>
                  {t('downloadA4PdfDescription')}
                </Typography>
              </Stack>
            )}

            {calculationsBySection.map(([section, sectionCalculations]) => (
              <Box key={section}>
                <Typography variant='h6' sx={{ mb: 1.5 }}>
                  {t(section as TranslationKey)}
                </Typography>

                {section === 'dartWidth' && showLargeDifferenceDartHelp && (
                  <Alert severity='info' sx={{ mb: 1.5 }}>
                    {t('dartWidthLargeDifferenceHelp')}
                  </Alert>
                )}

                <Table size='small'>
                  <TableBody>
                    {sectionCalculations.map((calculation) => (
                      <TableRow key={calculation.id}>
                        <TableCell sx={{ pl: 0, fontSize: '0.95rem' }}>
                          <Stack spacing={0.5}>
                            <Typography
                              fontWeight={600}
                              sx={{ fontSize: '0.95rem' }}
                            >
                              {calculation.label}
                            </Typography>
                            {calculation.explanation && (
                              <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ fontSize: '0.875rem' }}
                              >
                                {calculation.explanation}
                              </Typography>
                            )}
                            {calculation.description && (
                              <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
                              >
                                {calculation.description}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{
                            pr: 0,
                            whiteSpace: 'nowrap',
                            fontSize: '0.95rem',
                          }}
                        >
                          {formatMeasurement(calculation.value)} cm
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
