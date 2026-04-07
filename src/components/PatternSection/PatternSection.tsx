import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { TranslationKey } from '../../../i18n/translations';
import { useI18n } from '../../../i18n/useI18n';
import { PatternDraftPreview } from '../PatternPreview/PatternDraftPreview';
import {
  PATTERN_CATEGORIES,
  buildPatternDraft,
  calculatePattern,
  getPatternDefinition,
  getPatternPrintConfig,
  type PatternCategory,
  type PatternSettings,
  type PatternOption,
} from '../../lib/patterns';
import easeNoDarts from '../../data/easeNoDarts.json';
import { formatMeasurement } from '../../lib/measurements';
import { loadProfiles, subscribeProfiles } from '../../storage/profiles';
import type { Profile } from '../../types/measurements';
import { downloadPatternPdf } from '../../lib/printing/patternPdf';

const SECTION_ORDER = [
  'basicMeasurements',
  'controlMeasurements',
  'fixedMeasurements',
  'dartWidth',
  'sideLine',
  'dartPlacement',
] as const;
const STEP_LABEL_MIN_HEIGHT = 32;

export function PatternSection({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    PatternCategory | ''
  >('');
  const [selectedPattern, setSelectedPattern] = useState<PatternOption | ''>(
    '',
  );
  const [selectedMovementEase, setSelectedMovementEase] = useState<number | ''>(
    '',
  );
  const [submittedProfileId, setSubmittedProfileId] = useState('');
  const [submittedPattern, setSubmittedPattern] = useState<PatternOption | ''>(
    '',
  );
  const [submittedMovementEase, setSubmittedMovementEase] = useState<
    number | ''
  >('');
  const [isMovementEaseHelpOpen, setIsMovementEaseHelpOpen] = useState(false);

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
        setSubmittedMovementEase('');
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
  const availablePatternsForCategory = useMemo(
    () =>
      PATTERN_CATEGORIES.find(({ category }) => category === selectedCategory)
        ?.patterns ?? [],
    [selectedCategory],
  );
  const requiresMovementEase = selectedPattern === 'bodiceWithoutDarts';
  const movementEaseOptions = useMemo(
    () => easeNoDarts.entries.map((entry) => entry.ease),
    [],
  );
  const submittedSettings = useMemo<PatternSettings | undefined>(
    () =>
      submittedPattern === 'bodiceWithoutDarts' && submittedMovementEase
        ? { movementEase: submittedMovementEase }
        : undefined,
    [submittedMovementEase, submittedPattern],
  );

  const calculations = useMemo(() => {
    if (!submittedProfile || !submittedPattern) return [];
    return calculatePattern(
      submittedPattern,
      submittedProfile,
      t,
      submittedSettings,
    );
  }, [submittedPattern, submittedProfile, submittedSettings, t]);

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
    return buildPatternDraft(
      submittedPattern,
      submittedProfile,
      t,
      submittedSettings,
    );
  }, [submittedPattern, submittedProfile, submittedSettings, t]);
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
    () =>
      requiredMeasurementStatus.some((measurement) => measurement.value === 0),
    [requiredMeasurementStatus],
  );
  const missingRequiredMeasurements = useMemo(
    () =>
      requiredMeasurementStatus.filter(
        (measurement) => measurement.value === 0,
      ),
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
  const isReadyToGenerate =
    Boolean(selectedCategory) &&
    Boolean(selectedPattern) &&
    Boolean(selectedProfileId) &&
    (!requiresMovementEase || Boolean(selectedMovementEase));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !selectedProfileId ||
      !selectedPattern ||
      (selectedPattern === 'bodiceWithoutDarts' && !selectedMovementEase)
    ) {
      return;
    }

    setSubmittedProfileId(selectedProfileId);
    setSubmittedPattern(selectedPattern);
    setSubmittedMovementEase(
      selectedPattern === 'bodiceWithoutDarts' ? selectedMovementEase : '',
    );
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
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            alignItems: 'start',
          }}
        >
          <Stack spacing={1}>
            <Box
              sx={{
                minHeight: STEP_LABEL_MIN_HEIGHT,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography variant='body2' color='text.secondary'>
                1. {t('selectPatternCategory')}
              </Typography>
            </Box>
            <TextField
              select
              label={t('patternCategory')}
              value={selectedCategory}
              onChange={(event) => {
                const nextCategory = event.target.value as PatternCategory | '';
                setSelectedCategory(nextCategory);
                setSelectedPattern('');
                setSelectedMovementEase('');
                setSelectedProfileId('');
              }}
              size='small'
            >
              <MenuItem value=''>{t('selectPatternCategory')}</MenuItem>
              {PATTERN_CATEGORIES.map(({ category }) => (
                <MenuItem key={category} value={category}>
                  {t(category as TranslationKey)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {selectedCategory && (
            <Stack spacing={1}>
              <Box
                sx={{
                  minHeight: STEP_LABEL_MIN_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant='body2' color='text.secondary'>
                  2. {t('selectPattern')}
                </Typography>
              </Box>
              <TextField
                select
                label={t('selectPattern')}
                value={selectedPattern}
                onChange={(event) => {
                  const nextPattern = event.target.value as PatternOption | '';
                  setSelectedPattern(nextPattern);
                  setSelectedProfileId('');

                  if (nextPattern !== 'bodiceWithoutDarts') {
                    setSelectedMovementEase('');
                  }
                }}
                size='small'
              >
                <MenuItem value=''>{t('selectPattern')}</MenuItem>
                {availablePatternsForCategory.map((pattern) => (
                  <MenuItem key={pattern} value={pattern}>
                    {t(pattern)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}

          {selectedPattern && requiresMovementEase && (
            <Stack spacing={1}>
              <Box
                sx={{
                  minHeight: STEP_LABEL_MIN_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Stack direction='row' spacing={0.5} alignItems='center'>
                  <Typography variant='body2' color='text.secondary'>
                    3. {t('movementEase')}
                  </Typography>
                  <IconButton
                    size='small'
                    aria-label={t('movementEaseHelp')}
                    onClick={() => setIsMovementEaseHelpOpen(true)}
                  >
                    <HelpOutlineIcon fontSize='inherit' />
                  </IconButton>
                </Stack>
              </Box>
              <TextField
                select
                label={t('movementEase')}
                value={selectedMovementEase}
                onChange={(event) =>
                  setSelectedMovementEase(
                    event.target.value ? Number(event.target.value) : '',
                  )
                }
                size='small'
              >
                <MenuItem value=''>{t('selectMovementEase')}</MenuItem>
                {movementEaseOptions.map((ease) => (
                  <MenuItem key={ease} value={ease}>
                    {formatMeasurement(ease)} cm
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}

          {selectedPattern &&
            (!requiresMovementEase || selectedMovementEase) && (
              <Stack spacing={1}>
                <Box
                  sx={{
                    minHeight: STEP_LABEL_MIN_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant='body2' color='text.secondary'>
                    {requiresMovementEase ? '4.' : '3.'} {t('selectProfile')}
                  </Typography>
                </Box>
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
              </Stack>
            )}

          {!profiles.length && (
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            >
              {t('noProfilesAvailable')}
            </Typography>
          )}
          {requiresMovementEase && !selectedMovementEase && selectedPattern && (
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            >
              {t('movementEaseRequired')}
            </Typography>
          )}
          {isReadyToGenerate && (
            <Stack
              spacing={1}
              sx={{
                width: { xs: '100%', md: 'auto' },
                gridColumn: { xs: '1', md: '1 / -1' },
                justifySelf: 'start',
              }}
            >
              <Box
                sx={{
                  minHeight: STEP_LABEL_MIN_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant='body2' color='text.secondary'>
                  {requiresMovementEase ? '5.' : '4.'} {t('calculatePattern')}
                </Typography>
              </Box>
              <Button
                type='submit'
                variant='contained'
                sx={{ width: { xs: '100%', md: 'auto' } }}
              >
                {t('calculatePattern')}
              </Button>
            </Stack>
          )}
        </Box>
        {hasPatternProfileTypeMismatch && (
          <Alert severity='warning' sx={{ mt: 2 }}>
            {t('patternProfileTypeWarning')}
          </Alert>
        )}
      </Paper>
      <Dialog
        open={isMovementEaseHelpOpen}
        onClose={() => setIsMovementEaseHelpOpen(false)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>{t('movementEase')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            <Typography variant='body2'>{t('movementEaseIntro')}</Typography>
            <Typography variant='body2'>
              {t('movementEaseHelperShirt')}
            </Typography>
            <Typography variant='body2'>
              {t('movementEaseHelperSummerJacket')}
            </Typography>
            <Typography variant='body2'>
              {t('movementEaseHelperWinterJacket')}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsMovementEaseHelpOpen(false)}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
      {submittedProfile && submittedPattern && (
        <Paper
          variant='outlined'
          sx={{
            p: { xs: 0, sm: 2.5 },
            border: { xs: 0, sm: 1 },
            borderColor: '#D9D9D9',
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
                      {t(measurement.key as TranslationKey)}:{' '}
                      {formatMeasurement(measurement.value)} cm
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            )}

            {draft && <PatternDraftPreview draft={draft} />}

            {draft && submittedPatternPrintConfig?.enabled && (
              <Stack spacing={1} alignItems='flex-start'>
                <Button variant='contained' onClick={onDownloadPdf}>
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
                  {t(
                    (section === 'basicMeasurements'
                      ? 'calculationBreakdown'
                      : section) as TranslationKey,
                  )}
                </Typography>

                {section === 'dartWidth' && showLargeDifferenceDartHelp && (
                  <Alert severity='info' sx={{ mb: 1.5 }}>
                    {t('dartWidthLargeDifferenceHelp')}
                  </Alert>
                )}
                {section === 'controlMeasurements' && (
                  <Alert severity='info' sx={{ mb: 1.5 }}>
                    {t('controlMeasurementsHelp')}
                  </Alert>
                )}
                {section === 'fixedMeasurements' && (
                  <Alert severity='info' sx={{ mb: 1.5 }}>
                    {t('fixedMeasurementsHelp')}
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
                                sx={{
                                  fontSize: '0.8rem',
                                  fontFamily: 'monospace',
                                }}
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
