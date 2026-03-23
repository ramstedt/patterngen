import { useMemo, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useI18n } from '../../../i18n/useI18n';
import type {
  Measurements,
  Profile,
  ProfileType,
} from '../../types/measurements';
import {
  formatMeasurement,
  MEASUREMENT_FIELDS,
  roundToHalf,
} from '../../lib/measurements';
import {
  deleteProfile,
  loadProfiles,
  upsertProfile,
} from '../../storage/profiles';
import {
  measurementsFromMenStandardSize,
  measurementsFromStandardSize,
  type MenSize,
  type StandardSize,
} from '../../data/standardSizes';

const measurementSchema = z.object({
  backWaistLength: z.number().nonnegative().or(z.nan()),
  totalLength: z.number().nonnegative().or(z.nan()),
  backWidth: z.number().nonnegative().or(z.nan()),
  neckCircumference: z.number().nonnegative().or(z.nan()),
  bustCircumference: z.number().nonnegative().or(z.nan()),
  waistCircumference: z.number().nonnegative().or(z.nan()),
  hipCircumference: z.number().nonnegative().or(z.nan()),
  hipDepth: z.number().nonnegative().or(z.nan()),
  hipHeight: z.number().nonnegative().or(z.nan()),
  highHipCircumference: z.number().nonnegative().or(z.nan()),
  shoulderWidth: z.number().nonnegative().or(z.nan()),
  armLength: z.number().nonnegative().or(z.nan()),
  upperArmCircumference: z.number().nonnegative().or(z.nan()),
  elbowCircumference: z.number().nonnegative().or(z.nan()),
  wristCircumference: z.number().nonnegative().or(z.nan()),
  chestWidth: z.number().nonnegative().or(z.nan()),
  bustPoint: z.number().nonnegative().or(z.nan()),
  frontWaistLength: z.number().nonnegative().or(z.nan()),
  bustHeight: z.number().nonnegative().or(z.nan()),
  sideHeight: z.number().nonnegative().or(z.nan()),
  shoulderHeightRightBack: z.number().nonnegative().or(z.nan()),
  shoulderHeightRightFull: z.number().nonnegative().or(z.nan()),
  shoulderHeightLeftBack: z.number().nonnegative().or(z.nan()),
  shoulderHeightLeftFull: z.number().nonnegative().or(z.nan()),
  sideMeasurement: z.number().nonnegative().or(z.nan()),
  kneeHeight: z.number().nonnegative().or(z.nan()),
  trouserLength: z.number().nonnegative().or(z.nan()),
  inseamLength: z.number().nonnegative().or(z.nan()),
  rise: z.number().nonnegative().or(z.nan()),
  crotchDepth: z.number().nonnegative().or(z.nan()),
});

type FormValues = Measurements & { name: string; profileType: ProfileType };
type ProfileTypeFormValue = ProfileType | '';

const FIELDS = MEASUREMENT_FIELDS;
const WOMEN_ONLY_FIELDS: (keyof Measurements)[] = ['bustPoint', 'bustHeight'];
const MEN_ONLY_FIELDS: (keyof Measurements)[] = ['chestWidth', 'crotchDepth'];
const MEN_HIDDEN_FIELDS: (keyof Measurements)[] = ['hipDepth', 'hipHeight'];
const WOMEN_SIZES: StandardSize[] = [
  'C30',
  'C32',
  'C34',
  'C36',
  'C38',
  'C40',
  'C42',
  'C44',
  'C46',
  'C48',
  'C50',
  'C52',
  'C54',
  'C56',
  'C58',
  'C60',
];
const MEN_SIZES: MenSize[] = [
  'C40',
  'C42',
  'C44',
  'C46',
  'C48',
  'C50',
  'C52',
  'C54',
  'C56',
  'C58',
  'C60',
  'C62',
  'C64',
  'C66',
  'C68',
  'C70',
];

function getVisibleFields(profileType: ProfileType | undefined) {
  if (profileType === 'women') {
    return FIELDS.filter((field) => !MEN_ONLY_FIELDS.includes(field.key));
  }

  if (profileType === 'men') {
    return FIELDS.filter(
      (field) =>
        !WOMEN_ONLY_FIELDS.includes(field.key) &&
        !MEN_HIDDEN_FIELDS.includes(field.key),
    );
  }

  return FIELDS.filter(
    (field) =>
      !WOMEN_ONLY_FIELDS.includes(field.key) &&
      !MEN_ONLY_FIELDS.includes(field.key) &&
      !MEN_HIDDEN_FIELDS.includes(field.key),
  );
}

function createBlankMeasurements(): Measurements {
  return Object.fromEntries(
    FIELDS.map(({ key }) => [key, Number.NaN]),
  ) as Measurements;
}

function getCurrentTimestamp() {
  return Date.now();
}

function uid() {
  return (
    crypto.randomUUID?.() ??
    String(Date.now()) + Math.random().toString(16).slice(2)
  );
}

function renderMeasurementField(
  key: keyof Measurements,
  label: string,
  canEdit: boolean,
  onBlur: (next: number) => void,
  register: ReturnType<typeof useForm<FormValues>>['register'],
) {
  return (
    <Stack
      key={String(key)}
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.75, sm: 1.5 }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ width: '100%' }}
    >
      <Typography sx={{ minWidth: 0, flex: { sm: '1 1 0' } }}>{label}</Typography>
      <Stack
        direction='row'
        spacing={1}
        alignItems='center'
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        <TextField
          type='number'
          size='small'
          inputProps={{ step: '0.01', inputMode: 'decimal' }}
          disabled={!canEdit}
          sx={{ width: { xs: '100%', sm: 132 } }}
          {...register(key as never, { valueAsNumber: true })}
          onBlur={(event) => {
            const raw = (event.target as HTMLInputElement).valueAsNumber;
            if (!isNaN(raw)) {
              onBlur(roundToHalf(raw));
            }
          }}
        />
        <Typography color='text.secondary' sx={{ flexShrink: 0 }}>
          cm
        </Typography>
      </Stack>
    </Stack>
  );
}

export function ProfileManager({ showHeader = true }: { showHeader?: boolean }) {
  const { t } = useI18n();
  const initialProfiles = useMemo(() => loadProfiles(), []);
  const initialActiveProfile = initialProfiles[0] ?? null;
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [activeId, setActiveId] = useState<string | null>(
    initialActiveProfile?.id ?? null,
  );
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');
  const [savedMsg, setSavedMsg] = useState(false);
  const [womenSize, setWomenSize] = useState<StandardSize>('C44');
  const [menSize, setMenSize] = useState<MenSize>('C50');

  const active = useMemo(
    () => profiles.find((profile) => profile.id === activeId) ?? null,
    [profiles, activeId],
  );

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1),
        profileType: z.enum(['women', 'men']),
        ...measurementSchema.shape,
      }),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialActiveProfile
      ? {
          name: initialActiveProfile.name,
          profileType: initialActiveProfile.profileType,
          ...initialActiveProfile.measurements,
        }
      : { name: '', ...createBlankMeasurements() },
    mode: 'onSubmit',
  });

  const { isDirty, isSubmitting } = form.formState;
  const watchedValues = form.watch();
  const selectedProfileType = form.watch('profileType');
  const visibleFields = useMemo(
    () => getVisibleFields(selectedProfileType),
    [selectedProfileType],
  );
  const activeVisibleFields = useMemo(
    () => getVisibleFields(active?.profileType),
    [active?.profileType],
  );

  function setProfileType(nextProfileType: ProfileTypeFormValue) {
    form.setValue(
      'profileType',
      (nextProfileType || undefined) as never,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );

    const keysToClear =
      nextProfileType === 'women'
        ? MEN_ONLY_FIELDS
        : nextProfileType === 'men'
          ? WOMEN_ONLY_FIELDS
          : [...WOMEN_ONLY_FIELDS, ...MEN_ONLY_FIELDS];

    for (const key of keysToClear) {
      form.setValue(key as never, Number.NaN as never, {
        shouldDirty: true,
      });
    }
  }

  function selectActiveProfile(nextActiveId: string | null) {
    setActiveId(nextActiveId);

    const nextProfile =
      profiles.find((profile) => profile.id === nextActiveId) ?? null;

    if (nextProfile) {
      form.reset({
        name: nextProfile.name,
        profileType: nextProfile.profileType,
        ...nextProfile.measurements,
      });
      setMode('view');
      return;
    }

    form.reset({ name: '', ...createBlankMeasurements() });
  }

  function refresh() {
    const nextProfiles = loadProfiles();
    setProfiles(nextProfiles);
    if (!nextProfiles.find((profile) => profile.id === activeId)) {
      setActiveId(nextProfiles[0]?.id ?? null);
    }
  }

  function startNew() {
    setMode('new');
    setActiveId(null);
    form.reset({ name: '', ...createBlankMeasurements() });
  }

  function startEdit() {
    if (!active) return;
    setMode('edit');
  }

  function cancel() {
    if (active) {
      form.reset({
        name: active.name,
        profileType: active.profileType,
        ...active.measurements,
      });
    }
    setMode('view');
    if (!active && profiles[0]) setActiveId(profiles[0].id);
  }

  function applyPresetToForm(preset: Partial<Measurements>) {
    for (const { key } of FIELDS) {
      const raw =
        (preset as Partial<Record<keyof Measurements, number>>)[key] ?? 0;
      form.setValue(key as never, roundToHalf(raw) as never, {
        shouldDirty: true,
      });
    }
  }

  function isDuplicateName(name: string) {
    const normalized = name.trim().toLowerCase();
    return profiles.some(
      (profile) =>
        profile.name.trim().toLowerCase() === normalized &&
        profile.id !== active?.id,
    );
  }

  function onSave(values: FormValues) {
    if (isDuplicateName(values.name)) {
      alert(t('profileExists'));
      return;
    }

    const now = getCurrentTimestamp();
    const measurements: Measurements = Object.fromEntries(
      FIELDS.map((field) => [
        field.key,
        Number.isNaN(values[field.key]) ? 0 : roundToHalf(values[field.key]),
      ]),
    ) as Measurements;

    const profile: Profile = {
      id: active?.id ?? uid(),
      name: values.name,
      profileType: values.profileType,
      measurements,
      createdAt: active?.createdAt ?? now,
      updatedAt: now,
    };

    upsertProfile(profile);
    refresh();
    setActiveId(profile.id);
    setMode('view');
    setSavedMsg(true);
    window.setTimeout(() => setSavedMsg(false), 1200);
  }

  function onDelete() {
    if (!active) return;
    if (!confirm(t('confirmDeleteProfile'))) return;

    deleteProfile(active.id);

    const nextProfiles = loadProfiles();
    setProfiles(nextProfiles);
    const nextActiveId = nextProfiles[0]?.id ?? null;
    setActiveId(nextActiveId);
    setMode('view');

    if (nextActiveId) {
      const nextProfile = nextProfiles.find((profile) => profile.id === nextActiveId);
      if (nextProfile) {
        form.reset({
          name: nextProfile.name,
          profileType: nextProfile.profileType,
          ...nextProfile.measurements,
        });
      }
    } else {
      form.reset({ name: '', ...createBlankMeasurements() });
    }
  }

  const canEdit = mode === 'edit' || mode === 'new';
  const showForm = mode === 'new' || mode === 'edit';
  const hasProfiles = profiles.length > 0;
  const showMeasurementInputs = Boolean(selectedProfileType);
  const isFormComplete = useMemo(() => {
    if (!watchedValues.name?.trim()) return false;
    if (!selectedProfileType) return false;

    return visibleFields.every(({ key }) => {
      const value = watchedValues[key];
      return typeof value === 'number' && !Number.isNaN(value);
    });
  }, [selectedProfileType, visibleFields, watchedValues]);

  return (
    <Stack spacing={3} sx={{ width: '100%', maxWidth: 922, mx: 'auto' }}>
      {showHeader && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography variant='h5'>{t('profiles')}</Typography>
          {!canEdit && hasProfiles && (
            <Button variant='contained' onClick={startNew}>
              {t('newProfile')}
            </Button>
          )}
        </Stack>
      )}

      {!showHeader && !canEdit && hasProfiles && (
        <Box>
          <Button variant='contained' onClick={startNew}>
            {t('newProfile')}
          </Button>
        </Box>
      )}

      <Stack spacing={3}>
        {!canEdit && hasProfiles && (
          <Paper variant='outlined' sx={{ p: 2, borderColor: 'divider' }}>
            <Stack spacing={2}>
              <TextField
                select
                label={t('selectProfile')}
                value={activeId ?? ''}
                onChange={(event) =>
                  selectActiveProfile(event.target.value || null)
                }
                size='small'
              >
                {profiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.name} ({t(profile.profileType)})
                  </MenuItem>
                ))}
              </TextField>

              {active && (
                <Stack spacing={0.5}>
                  <Typography variant='body2' color='text.secondary'>
                    {t('profileType')}: {t(active.profileType)}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {t('updated')}: {new Date(active.updatedAt).toLocaleString()}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Paper>
        )}

        {showForm ? (
          <Paper
            component='form'
            variant='outlined'
            onSubmit={form.handleSubmit(onSave)}
            sx={{ p: { xs: 2, sm: 2.5 } }}
          >
            <Stack spacing={2.5}>
              {(mode === 'new' || (mode === 'edit' && isDirty)) && (
                <Alert severity='error'>{t('notSaved')}</Alert>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: mode === 'new' ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr',
                  },
                  alignItems: 'start',
                }}
              >
                <Stack
                  spacing={1.25}
                  alignItems='stretch'
                  justifyContent='space-between'
                  sx={{ minHeight: { xs: 'auto', lg: 165 } }}
                >
                  <Stack spacing={0.5}>
                    <Typography variant='subtitle1'>{t('profileName')}</Typography>
                    {mode !== 'new' && !isDirty && (
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('saved')}
                      </Typography>
                    )}
                  </Stack>

                  <TextField
                    {...form.register('name')}
                    disabled={!canEdit}
                    placeholder={`${t('eg')} Anna`}
                    size='small'
                    sx={{ width: { xs: '100%', sm: 'auto' }, maxWidth: 280 }}
                  />
                </Stack>

                <Stack
                  spacing={1.25}
                  alignItems='stretch'
                  justifyContent='space-between'
                  sx={{ minHeight: { xs: 'auto', lg: 165 } }}
                >
                  <Stack spacing={0.5}>
                    <Typography variant='subtitle1'>{t('profileType')}</Typography>
                  </Stack>
                  <TextField
                    select
                    size='small'
                    value={selectedProfileType ?? ''}
                    onChange={(event) =>
                      setProfileType(event.target.value as ProfileTypeFormValue)
                    }
                    disabled={!canEdit}
                    sx={{ width: { xs: '100%', sm: 'auto' }, maxWidth: 280 }}
                  >
                    <MenuItem value=''></MenuItem>
                    <MenuItem value='women'>{t('women')}</MenuItem>
                    <MenuItem value='men'>{t('men')}</MenuItem>
                  </TextField>
                </Stack>

                {mode === 'new' && selectedProfileType && (
                  <Accordion
                    disableGutters
                    elevation={0}
                    square
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      minHeight: 84,
                      '&::before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        px: 2,
                        py: 0.25,
                        '& .MuiAccordionSummary-content': {
                          my: 0.75,
                        },
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Typography variant='subtitle1'>
                          {t('standardSizes')}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {t('openStandardSizesHelp')}
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Typography variant='body2' color='text.secondary'>
                          {t('standardSizesExplanation')}
                        </Typography>

                        <TextField
                          select
                          size='small'
                          label={t('size')}
                          disabled={!selectedProfileType}
                          value={
                            selectedProfileType === 'men' ? menSize : womenSize
                          }
                          onChange={(event) => {
                            if (selectedProfileType === 'women') {
                              setWomenSize(event.target.value as StandardSize);
                            } else if (selectedProfileType === 'men') {
                              setMenSize(event.target.value as MenSize);
                            }
                          }}
                        >
                          {(selectedProfileType === 'men'
                            ? MEN_SIZES
                            : WOMEN_SIZES
                          ).map((size) => (
                            <MenuItem key={size} value={size}>
                              {size}
                            </MenuItem>
                          ))}
                        </TextField>

                        <Box>
                          <Button
                            type='button'
                            variant='contained'
                            disabled={!selectedProfileType}
                            onClick={() => {
                              const preset =
                                selectedProfileType === 'men'
                                  ? measurementsFromMenStandardSize(menSize)
                                  : measurementsFromStandardSize(womenSize);
                              applyPresetToForm(preset);
                            }}
                          >
                            {t('applyStandardSize')}
                          </Button>
                        </Box>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>

              {showMeasurementInputs && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ textAlign: { xs: 'left', sm: 'right' }, maxWidth: 360 }}
                    >
                      {t('measurementRoundingHelp')}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      columnGap: 6,
                      rowGap: 2,
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    }}
                  >
                    {['upper', 'lower'].map((group) => (
                      <Stack key={group} spacing={2}>
                        {visibleFields
                          .filter((field) => field.group === group)
                          .map(({ key }) =>
                            renderMeasurementField(
                              key,
                              t(key as never),
                              canEdit,
                              (next) =>
                                form.setValue(key as never, next as never, {
                                  shouldDirty: true,
                                }),
                              form.register,
                            ),
                          )}
                      </Stack>
                    ))}
                  </Box>
                </>
              )}

              <Divider />

              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  flexWrap='wrap'
                  sx={{
                    '& > button': {
                      width: { xs: '100%', sm: 'auto' },
                    },
                  }}
                >
                  <Button
                    type='submit'
                    variant='contained'
                    disabled={!canEdit || !isDirty || !isFormComplete || isSubmitting}
                  >
                    {t('saveProfile')}
                  </Button>
                  {mode === 'edit' && active && (
                    <Button type='button' color='error' onClick={onDelete}>
                      {t('deleteProfile')}
                    </Button>
                  )}
                  <Button type='button' variant='outlined' onClick={cancel}>
                    {t('cancel')}
                  </Button>
                </Stack>

                {savedMsg && <Alert severity='success'>{t('saved')}</Alert>}

                <Typography variant='body2' color='text.secondary'>
                  {mode === 'new'
                    ? t('fillInMeaseurements')
                    : isDirty
                      ? t('rememberToSave')
                      : t('nothingToSave')}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        ) : !hasProfiles ? (
          <Paper variant='outlined' sx={{ p: { xs: 2.5, sm: 3 }, borderColor: 'divider' }}>
            <Stack spacing={1} alignItems='flex-start'>
              <Typography variant='h6'>{t('noProfilesTitle')}</Typography>
              <Typography color='text.secondary'>
                {t('noProfilesBody')}
              </Typography>
              <Button variant='contained' onClick={startNew} sx={{ mt: 1 }}>
                {t('newProfile')}
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper variant='outlined' sx={{ p: 2.5, borderColor: 'divider' }}>
            {!active ? (
              <Typography color='text.secondary'>
                {t('noProfileSelected')}
              </Typography>
            ) : (
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  justifyContent='space-between'
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography variant='h6'>{active.name}</Typography>
                    <Button variant='outlined' size='small' onClick={startEdit}>
                      {t('editProfile')}
                    </Button>
                  </Stack>
                  <Typography variant='body2' color='text.secondary'>
                    cm
                  </Typography>
                </Stack>

                <Table size='small'>
                  <TableBody>
                    {activeVisibleFields.map(({ key }) => (
                      <TableRow key={String(key)}>
                        <TableCell
                          sx={{
                            pl: 0,
                            pr: { xs: 1.5, sm: 0 },
                            width: { xs: '60%', sm: 'auto' },
                            verticalAlign: 'top',
                          }}
                        >
                          {t(key as never)}
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{
                            pr: 0,
                            whiteSpace: { xs: 'nowrap', sm: 'normal' },
                            width: { xs: '40%', sm: 'auto' },
                            verticalAlign: 'top',
                          }}
                        >
                          {formatMeasurement(active.measurements[key])} cm
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Stack>
            )}
          </Paper>
        )}
      </Stack>
    </Stack>
  );
}
