import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Layout } from './components/Layout';
import { Message } from './components/Message';
import { AuthPage } from './pages/AuthPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { GroupsPage } from './pages/GroupsPage';
import { HomePage } from './pages/HomePage';
import { MyPage } from './pages/MyPage';
import { ensureProfile } from './lib/api';
import { getInitialDemoDate, getTodayDateString, resetDemoDate, saveDemoDate } from './lib/date';
import { hasSupabaseConfig, missingSupabaseEnvNames, supabase } from './lib/supabase';
import type { Profile } from './types';

function getCurrentPath() {
  return window.location.pathname || '/';
}

export default function App() {
  const [route, setRoute] = useState(getCurrentPath);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [demoDate, setDemoDate] = useState(getInitialDemoDate);
  const actualToday = getTodayDateString();

  const groupId = useMemo(() => {
    const match = route.match(/^\/groups\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [route]);

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    setRoute(path);
  }

  function changeDemoDate(date: string) {
    if (!date) {
      return;
    }

    saveDemoDate(date);
    setDemoDate(date);
  }

  function restoreToday() {
    setDemoDate(resetDemoDate());
  }

  useEffect(() => {
    function handlePopState() {
      setRoute(getCurrentPath());
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!ignore) {
        setSession(data.session);
        setLoading(false);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setRoute('/login');
      }
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      if (!session?.user) {
        return;
      }

      setProfileError(null);

      try {
        const ensuredProfile = await ensureProfile(session.user);
        if (!ignore) {
          setProfile(ensuredProfile);
        }
      } catch (err) {
        if (!ignore) {
          setProfileError(err instanceof Error ? err.message : 'プロフィールの読み込みに失敗しました。');
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [session]);

  if (!hasSupabaseConfig) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <h1>Share Steps</h1>
          <Message
            message={`Supabase環境変数が読み込めていません: ${missingSupabaseEnvNames.join(', ')}。Vercelでは Environment Variables に設定後、再デプロイしてください。`}
            tone="error"
          />
        </section>
      </main>
    );
  }

  if (loading) {
    return <main className="loading-screen">アプリを読み込み中...</main>;
  }

  if (!session) {
    return <AuthPage mode={route === '/signup' ? 'signup' : 'login'} navigate={navigate} />;
  }

  if (!profile) {
    return (
      <Layout
        actualToday={actualToday}
        demoDate={demoDate}
        profile={profile}
        route={route}
        navigate={navigate}
        onDemoDateChange={changeDemoDate}
        onRestoreToday={restoreToday}
      >
        <section className="page-stack">
          <p className="loading-text">プロフィールを読み込み中...</p>
          <Message message={profileError} tone="error" />
        </section>
      </Layout>
    );
  }

  return (
    <Layout
      actualToday={actualToday}
      demoDate={demoDate}
      profile={profile}
      route={route}
      navigate={navigate}
      onDemoDateChange={changeDemoDate}
      onRestoreToday={restoreToday}
    >
      {route === '/' ? <HomePage date={demoDate} profile={profile} userId={session.user.id} /> : null}
      {route === '/groups' ? <GroupsPage userId={session.user.id} navigate={navigate} /> : null}
      {groupId ? <GroupDetailPage date={demoDate} groupId={groupId} navigate={navigate} /> : null}
      {route === '/mypage' ? <MyPage profile={profile} onProfileUpdated={setProfile} /> : null}
      {!['/', '/groups', '/mypage'].includes(route) && !groupId ? (
        <section className="page-stack">
          <div className="page-title">
            <p>404</p>
            <h1>ページが見つかりません</h1>
          </div>
          <button className="primary-button" type="button" onClick={() => navigate('/')}>
            ホームへ戻る
          </button>
        </section>
      ) : null}
    </Layout>
  );
}
