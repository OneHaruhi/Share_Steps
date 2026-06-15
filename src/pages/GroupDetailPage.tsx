import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Trophy, Users } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { Message } from '../components/Message';
import { getGroup, getGroupMembers, getGroupRanking } from '../lib/api';
import type { Group, GroupMember, RankingRow } from '../types';

type GroupDetailPageProps = {
  date: string;
  groupId: string;
  navigate: (path: string) => void;
};

export function GroupDetailPage({ date, groupId, navigate }: GroupDetailPageProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const visibleMembers = members.slice(0, 3);
  const remainingMemberCount = members.length - visibleMembers.length;

  useEffect(() => {
    let ignore = false;

    async function loadDetail() {
      setLoading(true);
      setError(null);

      try {
        const [groupRow, memberRows, rankingRows] = await Promise.all([
          getGroup(groupId),
          getGroupMembers(groupId),
          getGroupRanking(groupId, date),
        ]);

        if (!groupRow) {
          throw new Error('グループが見つからないか、参加していません。');
        }

        if (!ignore) {
          setGroup(groupRow);
          setMembers(memberRows);
          setRanking(rankingRows);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'グループ詳細の読み込みに失敗しました。');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      ignore = true;
    };
  }, [date, groupId]);

  async function copyInviteCode() {
    if (!group) {
      return;
    }

    try {
      await navigator.clipboard.writeText(group.invite_code);
      setNotice('招待コードをコピーしました。');
    } catch {
      setNotice('招待コードを選択してコピーしてください。');
    }
  }

  return (
    <section className="page-stack">
      <button className="back-button" type="button" onClick={() => navigate('/groups')}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>グループ一覧へ</span>
      </button>

      <div className="page-title">
        <p>{date}</p>
        <h1>{group?.name ?? 'グループ詳細'}</h1>
      </div>

      <Message message={error} tone="error" />
      <Message message={notice} tone="success" />
      {loading ? <p className="loading-text">グループ詳細を読み込み中...</p> : null}

      {group ? (
        <>
          <section className="invite-band">
            <span>
              <small>招待コード</small>
              <strong>{group.invite_code}</strong>
            </span>
            <button className="secondary-button" type="button" onClick={copyInviteCode}>
              <Copy size={18} aria-hidden="true" />
              <span>コピー</span>
            </button>
          </section>

          <div className="split-layout">
            <section className="panel">
              <div className="section-heading">
                <Users size={22} aria-hidden="true" />
                <h2>メンバー</h2>
              </div>
              <div className="member-list">
                {visibleMembers.map((member) => (
                  <div className="member-row" key={member.id}>
                    <span>{member.profile?.username ?? '未設定ユーザー'}</span>
                    <small>目標 {Number(member.profile?.target_steps ?? 8000).toLocaleString()}歩</small>
                  </div>
                ))}
                {remainingMemberCount > 0 ? (
                  <p className="remaining-members">ほか{remainingMemberCount}人</p>
                ) : null}
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <Trophy size={22} aria-hidden="true" />
                <h2>この日のランキング</h2>
              </div>
              {ranking.length === 0 ? (
                <EmptyState title="ランキングはまだありません" description="メンバーの歩数が読み込まれるとここに表示されます。" />
              ) : (
                <div className="ranking-list">
                  {ranking.map((row) => (
                    <div className="ranking-row" key={row.userId}>
                      <span className="rank-number">{row.rank}</span>
                      <span className="ranking-user">
                        <strong>{row.username}</strong>
                        <small>{row.achieved ? '達成' : `あと ${Math.max(row.targetSteps - row.steps, 0).toLocaleString()}歩`}</small>
                      </span>
                      <span className="ranking-steps">{row.steps.toLocaleString()}歩</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
