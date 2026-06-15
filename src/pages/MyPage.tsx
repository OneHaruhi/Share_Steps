import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BarChart3, LogOut, Save } from 'lucide-react';
import { Message } from '../components/Message';
import { getStepRecords, signOut, updateProfile } from '../lib/api';
import { getStepHistoryDates, type StepHistoryPeriod } from '../lib/date';
import { parsePositiveInteger } from '../lib/validation';
import type { Profile, StepRecord } from '../types';

type MyPageProps = {
  date: string;
  profile: Profile;
  onProfileUpdated: (profile: Profile) => void;
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

export function MyPage({ date, profile, onProfileUpdated }: MyPageProps) {
  const [username, setUsername] = useState(profile.username);
  const [targetSteps, setTargetSteps] = useState(profile.target_steps.toString());
  const [historyPeriod, setHistoryPeriod] = useState<StepHistoryPeriod>('week');
  const [stepHistory, setStepHistory] = useState<StepRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    setUsername(profile.username);
    setTargetSteps(profile.target_steps.toString());
  }, [profile]);

  useEffect(() => {
    let ignore = false;

    async function loadStepHistory() {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const records = await getStepRecords(profile.id, historyDates[0], historyDates[historyDates.length - 1]);
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
  }, [historyDates, profile.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        throw new Error('ユーザー名を入力してください。');
      }

      const parsedTargetSteps = parsePositiveInteger(targetSteps, '目標歩数');
      const saved = await updateProfile(profile.id, trimmedUsername, parsedTargetSteps);
      onProfileUpdated(saved);
      setNotice('プロフィールを保存しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プロフィールの保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setLoggingOut(true);
    setError(null);

    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログアウトに失敗しました。');
      setLoggingOut(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-title">
        <p>Profile</p>
        <h1>マイページ</h1>
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
              <div
                className="step-target-line"
                style={{ bottom: `${targetLineBottom}px` }}
              >
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

      <section className="panel form-stack">
        <h2>プロフィール編集</h2>
        <form className="form-stack compact" onSubmit={handleSubmit}>
          <label>
            ユーザー名
            <input required value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            1日の目標歩数
            <input
              inputMode="numeric"
              min={1}
              pattern="[0-9]*"
              required
              type="number"
              value={targetSteps}
              onChange={(event) => setTargetSteps(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={saving} type="submit">
            <Save size={18} aria-hidden="true" />
            <span>{saving ? '保存中...' : '保存する'}</span>
          </button>
        </form>
        <Message message={error} tone="error" />
        <Message message={notice} tone="success" />
      </section>

      <section className="panel">
        <button className="danger-button" disabled={loggingOut} type="button" onClick={handleSignOut}>
          <LogOut size={18} aria-hidden="true" />
          <span>{loggingOut ? 'ログアウト中...' : 'ログアウト'}</span>
        </button>
      </section>
    </section>
  );
}
