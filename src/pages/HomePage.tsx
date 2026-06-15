import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Footprints, Target, Save } from 'lucide-react';
import { Message } from '../components/Message';
import { StatCard } from '../components/StatCard';
import { getStepRecords, getTodayStep, upsertTodayStep } from '../lib/api';
import { getStepHistoryDates, type StepHistoryPeriod } from '../lib/date';
import { parseNonNegativeInteger } from '../lib/validation';
import type { Profile, StepRecord } from '../types';

type HomePageProps = {
  date: string;
  userId: string;
  profile: Profile;
};

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function formatPeriodLabel(dates: string[], period: StepHistoryPeriod) {
  const firstDate = new Date(`${dates[0]}T00:00:00`);
  const lastDate = new Date(`${dates[dates.length - 1]}T00:00:00`);

  if (period === 'month') {
    return `${firstDate.getFullYear()}年${firstDate.getMonth() + 1}月`;
  }

  return `${firstDate.getMonth() + 1}/${firstDate.getDate()} - ${lastDate.getMonth() + 1}/${lastDate.getDate()}`;
}

export function HomePage({ date, userId, profile }: HomePageProps) {
  const [stepRecord, setStepRecord] = useState<StepRecord | null>(null);
  const [stepsInput, setStepsInput] = useState('');
  const [historyPeriod, setHistoryPeriod] = useState<StepHistoryPeriod>('week');
  const [stepHistory, setStepHistory] = useState<StepRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const steps = stepRecord?.steps ?? 0;
  const achieved = steps >= profile.target_steps;
  const historyDates = useMemo(() => getStepHistoryDates(date, historyPeriod), [date, historyPeriod]);
  const stepsByDate = useMemo(
    () => new Map(stepHistory.map((record) => [record.date, record.steps])),
    [stepHistory],
  );
  const chartData = historyDates.map((historyDate) => ({
    date: historyDate,
    steps: stepsByDate.get(historyDate) ?? 0,
  }));
  const maxSteps = Math.max(profile.target_steps, ...chartData.map((item) => item.steps), 1);
  const totalSteps = chartData.reduce((sum, item) => sum + item.steps, 0);
  const averageSteps = Math.round(totalSteps / chartData.length);
  const targetLineBottom = 37 + (profile.target_steps / maxSteps) * 196;

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

  useEffect(() => {
    let ignore = false;

    async function loadStepHistory() {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const records = await getStepRecords(userId, historyDates[0], historyDates[historyDates.length - 1]);
        if (!ignore) {
          setStepHistory(records);
        }
      } catch (err) {
        if (!ignore) {
          setHistoryError(err instanceof Error ? err.message : '歩数履歴の読み込みに失敗しました。');
        }
      } finally {
        if (!ignore) {
          setHistoryLoading(false);
        }
      }
    }

    void loadStepHistory();

    return () => {
      ignore = true;
    };
  }, [historyDates, userId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const parsedSteps = parseNonNegativeInteger(stepsInput, '歩数');
      const saved = await upsertTodayStep(userId, date, parsedSteps);
      setStepRecord(saved);
      setStepHistory((current) => {
        const otherRecords = current.filter((record) => record.date !== saved.date);
        return [...otherRecords, saved].sort((a, b) => a.date.localeCompare(b.date));
      });
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

      <section className="panel step-history-panel">
        <div className="step-history-heading">
          <div className="section-heading">
            <BarChart3 size={22} aria-hidden="true" />
            <h2>歩数グラフ</h2>
          </div>
          <div className="period-tabs" aria-label="グラフの表示期間">
            <button
              className={historyPeriod === 'week' ? 'active' : ''}
              type="button"
              onClick={() => setHistoryPeriod('week')}
            >
              週
            </button>
            <button
              className={historyPeriod === 'month' ? 'active' : ''}
              type="button"
              onClick={() => setHistoryPeriod('month')}
            >
              月
            </button>
          </div>
        </div>

        <div className="step-history-summary">
          <span>
            <small>{formatPeriodLabel(historyDates, historyPeriod)}</small>
            <strong>{totalSteps.toLocaleString()}歩</strong>
          </span>
          <span>
            <small>1日平均</small>
            <strong>{averageSteps.toLocaleString()}歩</strong>
          </span>
        </div>

        {historyLoading ? <p className="loading-text">歩数履歴を読み込み中...</p> : null}
        <Message message={historyError} tone="error" />

        {!historyLoading && !historyError ? (
          <div className={`step-chart-scroll ${historyPeriod}`}>
            <div className="step-chart" role="img" aria-label={`${formatPeriodLabel(historyDates, historyPeriod)}の歩数棒グラフ`}>
              <div className="step-target-line" style={{ bottom: `${targetLineBottom}px` }}>
                <span>目標 {profile.target_steps.toLocaleString()}歩</span>
              </div>
              {chartData.map((item) => {
                const itemDate = new Date(`${item.date}T00:00:00`);
                const label =
                  historyPeriod === 'week'
                    ? `${WEEKDAY_LABELS[itemDate.getDay()]} ${itemDate.getMonth() + 1}/${itemDate.getDate()}`
                    : `${itemDate.getDate()}日`;

                return (
                  <div className="step-bar-item" key={item.date} title={`${item.date}: ${item.steps.toLocaleString()}歩`}>
                    <span className="step-bar-value">{item.steps > 0 ? item.steps.toLocaleString() : ''}</span>
                    <div className="step-bar-track">
                      <div
                        className={`step-bar ${item.steps >= profile.target_steps ? 'achieved' : ''}`}
                        style={{ height: `${(item.steps / maxSteps) * 100}%` }}
                      />
                    </div>
                    <span className="step-bar-label">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

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
