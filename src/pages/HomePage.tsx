import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Footprints, Target, Save } from 'lucide-react';
import { Message } from '../components/Message';
import { StatCard } from '../components/StatCard';
import { getTodayStep, upsertTodayStep } from '../lib/api';
import { parseNonNegativeInteger } from '../lib/validation';
import type { Profile, StepRecord } from '../types';

type HomePageProps = {
  date: string;
  userId: string;
  profile: Profile;
};

export function HomePage({ date, userId, profile }: HomePageProps) {
  const [stepRecord, setStepRecord] = useState<StepRecord | null>(null);
  const [stepsInput, setStepsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const steps = stepRecord?.steps ?? 0;
  const achieved = steps >= profile.target_steps;

  useEffect(() => {
    let ignore = false;

    async function loadStep() {
      setLoading(true);
      setError(null);

      try {
        const record = await getTodayStep(userId, date);
        if (!ignore) {
          setStepRecord(record);
          setStepsInput(record?.steps.toString() ?? '');
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : '歩数の読み込みに失敗しました。');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadStep();

    return () => {
      ignore = true;
    };
  }, [date, userId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const parsedSteps = parseNonNegativeInteger(stepsInput, '歩数');
      const saved = await upsertTodayStep(userId, date, parsedSteps);
      setStepRecord(saved);
      setNotice(`${date} の歩数を保存しました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '歩数の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-title">
        <p>{date}</p>
        <h1>ホーム</h1>
      </div>

      {loading ? <p className="loading-text">歩数を読み込み中...</p> : null}
      <Message message={error} tone="error" />
      <Message message={notice} tone="success" />

      <div className="stats-grid">
        <StatCard label="この日の歩数" value={`${steps.toLocaleString()}歩`} icon={<Footprints size={22} aria-hidden="true" />} />
        <StatCard label="目標歩数" value={`${profile.target_steps.toLocaleString()}歩`} icon={<Target size={22} aria-hidden="true" />} />
        <StatCard
          label="達成状況"
          value={achieved ? '達成' : '未達成'}
          detail={achieved ? 'この日の目標をクリアしています。' : `${Math.max(profile.target_steps - steps, 0).toLocaleString()}歩で達成`}
          icon={<CheckCircle2 size={22} aria-hidden="true" />}
        />
      </div>

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <h2>歩数登録</h2>
        <label>
          この日の歩数
          <input
            inputMode="numeric"
            min={0}
            pattern="[0-9]*"
            placeholder="例: 9200"
            required
            type="number"
            value={stepsInput}
            onChange={(event) => setStepsInput(event.target.value)}
          />
        </label>
        <button className="primary-button" disabled={saving} type="submit">
          <Save size={18} aria-hidden="true" />
          <span>{saving ? '保存中...' : '保存する'}</span>
        </button>
      </form>
    </section>
  );
}
