import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/i18n';
import {
  calculatePattern,
  PATTERN_OPTIONS,
  type PatternOption,
} from '../../lib/patterns';
import { formatMeasurement } from '../../lib/measurements';
import { loadProfiles, subscribeProfiles } from '../../storage/profiles';
import type { Profile } from '../../types/measurements';
import './PatternSection.css';

export function PatternSection() {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedPattern, setSelectedPattern] = useState<PatternOption | ''>('');
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

    return Array.from(sections.entries());
  }, [calculations]);

  const showLargeDifferenceDartHelp = useMemo(
    () =>
      calculations.some(
        (calculation) =>
          calculation.id === 'frontDartWidthSecondary' ||
          calculation.id === 'backDartWidthSecondary',
      ),
    [calculations],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProfileId || !selectedPattern) return;

    setSubmittedProfileId(selectedProfileId);
    setSubmittedPattern(selectedPattern);
  }

  return (
    <section className='ps-root'>
      <div className='ps-header'>
        <h2 style={{ margin: 0 }}>{t('patterns')}</h2>
        <p className='ps-muted'>{t('patternSectionDescription')}</p>
      </div>

      <form onSubmit={onSubmit} className='ps-card ps-form'>
        <div className='ps-field'>
          <label htmlFor='pattern-profile' className='ps-label'>
            {t('selectProfile')}
          </label>
          <select
            id='pattern-profile'
            value={selectedProfileId}
            onChange={(event) => setSelectedProfileId(event.target.value)}
            className='ps-select'
          >
            <option value=''>{t('chooseProfile')}</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>

        <div className='ps-field'>
          <label htmlFor='pattern-name' className='ps-label'>
            {t('selectPattern')}
          </label>
          <select
            id='pattern-name'
            value={selectedPattern}
            onChange={(event) =>
              setSelectedPattern(event.target.value as PatternOption | '')
            }
            className='ps-select'
          >
            <option value=''>{t('choosePattern')}</option>
            {PATTERN_OPTIONS.map((pattern) => (
              <option key={pattern} value={pattern}>
                {t(pattern)}
              </option>
            ))}
          </select>
        </div>

        <div className='ps-actions'>
          <button
            type='submit'
            disabled={!profiles.length || !selectedProfileId || !selectedPattern}
          >
            {t('calculatePattern')}
          </button>
          {!profiles.length && (
            <span className='ps-muted'>{t('noProfilesAvailable')}</span>
          )}
        </div>
      </form>

      {submittedProfile && submittedPattern && (
        <div className='ps-card'>
          <strong>{t(submittedPattern)}</strong>
          <p className='ps-muted'>
            {t('patternCalculationPending').replace(
              '{profileName}',
              submittedProfile.name,
            )}
          </p>
          {!!calculationsBySection.length && (
            <>
              {calculationsBySection.map(([section, sectionCalculations]) => (
                <div key={section} className='ps-section'>
                  <h3 className='ps-sectionTitle'>{t(section as any)}</h3>
                  {section === 'dartWidth' && showLargeDifferenceDartHelp && (
                    <p className='ps-muted'>{t('dartWidthLargeDifferenceHelp')}</p>
                  )}
                  <table className='ps-table'>
                    <tbody>
                      {sectionCalculations.map((calculation) => (
                        <tr key={calculation.id}>
                          <td>
                            <strong>{calculation.label}</strong>
                            {calculation.description && (
                              <div className='ps-muted'>
                                {calculation.description}
                              </div>
                            )}
                          </td>
                          <td>{formatMeasurement(calculation.value)} cm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
