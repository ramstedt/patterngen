import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useI18n } from '../../../i18n/i18n';
import type { Measurements, Profile } from '../../types/measurements';
import {
  deleteProfile,
  loadProfiles,
  upsertProfile,
} from '../../storage/profiles';
import './ProfileManager.css';
import {
  measurementsFromStandardSize,
  measurementsFromMenStandardSize,
  type MenSize,
  type StandardSize,
} from '../../data/standardSizes';

const measurementSchema = z.object({
  backWaistLength: z.number().nonnegative(),
  totalLength: z.number().nonnegative(),
  backWidth: z.number().nonnegative(),
  neckCircumference: z.number().nonnegative(),
  bustCircumference: z.number().nonnegative(),
  waistCircumference: z.number().nonnegative(),
  hipCircumference: z.number().nonnegative(),
  hipDepth: z.number().nonnegative(),
  hipHeight: z.number().nonnegative(),
  highHipCircumference: z.number().nonnegative(),
  shoulderWidth: z.number().nonnegative(),
  armLength: z.number().nonnegative(),
  upperArmCircumference: z.number().nonnegative(),
  elbowCircumference: z.number().nonnegative(),

  wristCircumference: z.number().nonnegative(),
  chestWidth: z.number().nonnegative(),
  bustPoint: z.number().nonnegative(),
  frontWaistLength: z.number().nonnegative(),
  bustHeight: z.number().nonnegative(),
  sideHeight: z.number().nonnegative(),
  shoulderHeight: z.number().nonnegative(),
  sideMeasurement: z.number().nonnegative(),
  kneeHeight: z.number().nonnegative(),
  trouserLength: z.number().nonnegative(),
  inseamLength: z.number().nonnegative(),
  rise: z.number().nonnegative(),
  crotchDepth: z.number().nonnegative(),
});

type FormValues = Measurements & { name: string };

function uid() {
  return (
    crypto.randomUUID?.() ??
    String(Date.now()) + Math.random().toString(16).slice(2)
  );
}

const FIELDS: Array<{ key: keyof Measurements; group: 'upper' | 'lower' }> = [
  { key: 'backWaistLength', group: 'upper' },
  { key: 'totalLength', group: 'upper' },
  { key: 'backWidth', group: 'upper' },
  { key: 'neckCircumference', group: 'upper' },
  { key: 'bustCircumference', group: 'upper' },
  { key: 'waistCircumference', group: 'upper' },
  { key: 'hipCircumference', group: 'upper' },
  { key: 'hipDepth', group: 'upper' },
  { key: 'hipHeight', group: 'upper' },
  { key: 'highHipCircumference', group: 'upper' },
  { key: 'shoulderWidth', group: 'upper' },
  { key: 'armLength', group: 'upper' },
  { key: 'upperArmCircumference', group: 'upper' },
  { key: 'elbowCircumference', group: 'upper' },

  { key: 'wristCircumference', group: 'lower' },
  { key: 'chestWidth', group: 'lower' },
  { key: 'bustPoint', group: 'lower' },
  { key: 'frontWaistLength', group: 'lower' },
  { key: 'bustHeight', group: 'lower' },
  { key: 'sideHeight', group: 'lower' },
  { key: 'shoulderHeight', group: 'lower' },
  { key: 'sideMeasurement', group: 'lower' },
  { key: 'kneeHeight', group: 'lower' },
  { key: 'trouserLength', group: 'lower' },
  { key: 'inseamLength', group: 'lower' },
  { key: 'rise', group: 'lower' },
  { key: 'crotchDepth', group: 'lower' },
];

const emptyMeasurements: Measurements = Object.fromEntries(
  FIELDS.map((f) => [f.key, 0]),
) as Measurements;

export function ProfileManager() {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');
  const [savedMsg, setSavedMsg] = useState(false);

  const [standardChart, setStandardChart] = useState<'women' | 'men'>('women');
  const [womenSize, setWomenSize] = useState<StandardSize>('C44');
  const [menSize, setMenSize] = useState<MenSize>('C50');

  useEffect(() => {
    const p = loadProfiles();
    setProfiles(p);
    setActiveId(p[0]?.id ?? null);
  }, []);

  const active = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? null,
    [profiles, activeId],
  );

  const schema = useMemo(
    () => z.object({ name: z.string().min(1), ...measurementSchema.shape }),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', ...emptyMeasurements },
    mode: 'onSubmit',
  });

  const { isDirty, isSubmitting } = form.formState;

  // When selecting a profile, load it into the form (view/edit)
  useEffect(() => {
    if (!active) return;
    form.reset({ name: active.name, ...active.measurements });
    setMode('view');
  }, [activeId]);

  function refresh() {
    const p = loadProfiles();
    setProfiles(p);
    if (!p.find((x) => x.id === activeId)) setActiveId(p[0]?.id ?? null);
  }

  function startNew() {
    setMode('new');
    setActiveId(null);
    form.reset({ name: '', ...emptyMeasurements });
  }

  function applyPresetToForm(preset: Partial<Measurements>) {
    // Keep typed name
    for (const { key } of FIELDS) {
      const raw =
        (preset as Partial<Record<keyof Measurements, number>>)[key] ?? 0;
      const next = roundToHalf(raw);
      form.setValue(key as any, next, { shouldDirty: true });
    }
  }

  function roundToHalf(value: number) {
    // Round to nearest 0.5 cm
    return Math.round(value * 2) / 2;
  }

  function startEdit() {
    if (!active) return;
    setMode('edit');
  }

  function cancel() {
    if (active) form.reset({ name: active.name, ...active.measurements });
    setMode('view');
    if (!active && profiles[0]) setActiveId(profiles[0].id);
  }

  const canEdit = mode === 'edit' || mode === 'new';
  const showForm = mode === 'new' || mode === 'edit';

  function isDuplicateName(name: string) {
    const normalized = name.trim().toLowerCase();
    return profiles.some(
      (p) => p.name.trim().toLowerCase() === normalized && p.id !== active?.id,
    );
  }

  function onSave(values: FormValues) {
    const now = Date.now();

    if (isDuplicateName(values.name)) {
      alert(t('profileExists'));
      return;
    }

    const measurements: Measurements = Object.fromEntries(
      FIELDS.map((f) => [f.key, roundToHalf(values[f.key])]),
    ) as Measurements;

    const profile: Profile = {
      id: active?.id ?? uid(),
      name: values.name,
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
    const deletingId = active.id;

    if (!confirm(t('confirmDeleteProfile'))) return;

    deleteProfile(deletingId);

    // Reload and update UI immediately so the deleted profile disappears without refresh
    const p = loadProfiles();
    setProfiles(p);

    const nextActiveId = p[0]?.id ?? null;
    setActiveId(nextActiveId);

    setMode('view');

    if (nextActiveId) {
      const next = p.find((x) => x.id === nextActiveId);
      if (next) form.reset({ name: next.name, ...next.measurements });
    } else {
      form.reset({ name: '', ...emptyMeasurements });
    }
  }

  return (
    <div className='pm-root'>
      <div className='pm-header'>
        <h2 style={{ margin: 0 }}>{t('profiles')}</h2>
        <div className='pm-actions'>
          {!canEdit && (
            <button type='button' onClick={startNew}>
              {t('newProfile')}
            </button>
          )}
        </div>
      </div>

      <div className='pm-layout'>
        <div>
          {!canEdit && profiles.length > 0 && (
            <>
              <label className='pm-label'>{t('selectProfile')}</label>
              <select
                value={activeId ?? ''}
                onChange={(e) => setActiveId(e.target.value || null)}
                className='pm-select'
              >
                <option value='' disabled>
                  —
                </option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {active && (
            <div className='pm-muted' style={{ marginTop: 12 }}>
              <div>Updated: {new Date(active.updatedAt).toLocaleString()}</div>
            </div>
          )}
        </div>

        {showForm && (
          <form onSubmit={form.handleSubmit(onSave)} className='pm-card'>
            <div className='pm-row' style={{ justifyContent: 'space-between' }}>
              <div className='pm-row'>
                <label>{t('profileName')}</label>
                <span className='pm-status' aria-live='polite'>
                  {mode === 'new'
                    ? 'Not saved'
                    : isDirty
                      ? 'Unsaved changes'
                      : 'Saved'}
                </span>
              </div>
              <input
                {...form.register('name')}
                disabled={!canEdit}
                placeholder={`${t('eg')} Anna`}
                className='pm-input'
              />
            </div>

            {mode === 'new' && (
              <div className='pm-card' style={{ marginTop: 12 }}>
                <div
                  className='pm-row'
                  style={{ justifyContent: 'space-between' }}
                >
                  <strong>{t('standardSizes')}</strong>
                </div>
                <p>
                  <small>{t('standardSizesExplanation')}</small>
                </p>
                <div style={{ marginTop: 10 }}>
                  <label className='pm-label' style={{ marginBottom: 6 }}>
                    Chart
                  </label>
                  <select
                    value={standardChart}
                    onChange={(e) =>
                      setStandardChart(e.target.value as 'women' | 'men')
                    }
                    className='pm-select'
                  >
                    <option value='women'>Women</option>
                    <option value='men'>Men</option>
                  </select>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label className='pm-label' style={{ marginBottom: 6 }}>
                    Size
                  </label>

                  {standardChart === 'women' ? (
                    <select
                      value={womenSize}
                      onChange={(e) =>
                        setWomenSize(e.target.value as StandardSize)
                      }
                      className='pm-select'
                    >
                      {(
                        [
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
                        ] as StandardSize[]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={menSize}
                      onChange={(e) => setMenSize(e.target.value as MenSize)}
                      className='pm-select'
                    >
                      {(
                        [
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
                        ] as MenSize[]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className='pm-btnrow'>
                  <button
                    type='button'
                    onClick={() => {
                      const preset =
                        standardChart === 'women'
                          ? measurementsFromStandardSize(womenSize)
                          : measurementsFromMenStandardSize(menSize);
                      applyPresetToForm(preset);
                    }}
                  >
                    Apply standard size to form
                  </button>
                </div>
              </div>
            )}

            <div className='pm-fields'>
              {['upper', 'lower'].map((group) => (
                <div key={group} className='pm-col'>
                  {FIELDS.filter((f) => f.group === group).map(({ key }) => (
                    <div key={String(key)} className='pm-field'>
                      <label>{t(key as any)}</label>
                      <input
                        type='number'
                        step='0.01'
                        inputMode='decimal'
                        disabled={!canEdit}
                        {...form.register(key as any, { valueAsNumber: true })}
                        onBlur={(e) => {
                          const raw = e.target.valueAsNumber;
                          if (!isNaN(raw)) {
                            const rounded = roundToHalf(raw);
                            form.setValue(key as any, rounded, {
                              shouldDirty: true,
                            });
                          }
                        }}
                        style={{ padding: 8 }}
                      />
                      <span style={{ opacity: 0.8 }}>cm</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className='pm-btnrow'>
              <button
                type='submit'
                disabled={!canEdit || !isDirty || isSubmitting}
              >
                {t('saveProfile')}
              </button>
              {mode === 'edit' && active && (
                <button type='button' onClick={onDelete}>
                  {t('deleteProfile')}
                </button>
              )}
              <button type='button' onClick={cancel}>
                {t('cancel')}
              </button>
              {savedMsg && <span style={{ marginLeft: 8 }}>{t('saved')}</span>}
              <span className='pm-muted'>
                {mode === 'new'
                  ? 'Fill in the measurements and save to create the profile.'
                  : isDirty
                    ? 'Remember to save your changes.'
                    : 'No changes to save.'}
              </span>
            </div>
          </form>
        )}

        {!showForm && (
          <div className='pm-card'>
            {!active ? (
              <div className='pm-muted'>{t('noProfileSelected')}</div>
            ) : (
              <>
                <div
                  className='pm-row'
                  style={{ justifyContent: 'space-between' }}
                >
                  <div className='pm-row'>
                    <strong>{active.name}</strong>
                    <button type='button' onClick={startEdit}>
                      {t('editProfile')}
                    </button>
                  </div>
                  <span className='pm-muted'>cm</span>
                </div>

                <table className='pm-table' style={{ marginTop: 12 }}>
                  <tbody>
                    {FIELDS.map(({ key }) => (
                      <tr key={String(key)}>
                        <td>{t(key as any)}</td>
                        <td>{active.measurements[key].toFixed(1)} cm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
