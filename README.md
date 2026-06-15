# Share Steps

大学生の友達グループ向けに、毎日の歩数を手入力で登録し、グループ内ランキングを確認できるMVPです。

## 実装機能

- 名前だけで始められるゲスト利用
- 参加コードと名前だけでグループ参加
- メールアドレスとパスワードによる新規登録、ログイン、ログアウト
- プロフィール編集: ユーザー名、1日の目標歩数
- 今日の歩数登録、登録済みの場合の更新、達成状況表示
- グループ作成、招待コード自動生成
- 招待コードによるグループ参加
- 参加中グループ一覧、グループ詳細、メンバー一覧
- グループ内の今日の歩数ランキング

## 技術スタック

- React
- TypeScript
- Vite
- CSS
- Supabase Auth
- Supabase PostgreSQL

## セットアップ

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` に Supabase の値を設定してください。

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Vercel Supabase Integration などで `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_URL` / `SUPABASE_ANON_KEY` が設定されている場合も、ビルド時に自動で読み取ります。手動設定する場合は `VITE_` 付きの2つを使うのが一番確実です。

## Supabase SQL実行手順

1. Supabaseで新規プロジェクトを作成します。
2. Project Settings > API から `Project URL` と `anon public` key を確認し、`.env` に設定します。
3. Supabase Dashboard の SQL Editor を開きます。
4. 以下のSQLファイルを番号順に貼り付けて実行します。各ファイルは100行未満です。
   - `supabase/01_tables.sql`
   - `supabase/02_functions.sql`
   - `supabase/03_rls_policies.sql`
   - `supabase/04_indexes.sql`
5. Authentication > Providers で Email が有効になっていることを確認します。
6. Authentication > Providers で Anonymous Sign-Ins を有効にします。ゲスト利用はSupabaseの匿名認証ユーザーとして保存されます。

SQLには以下が含まれています。

- `profiles`
- `groups`
- `group_members`
- `step_records`
- `updated_at` 更新トリガー
- 招待コード参加用RPC `join_group_by_invite_code`
- Row Level Security とMVP用ポリシー

招待コード参加は、全グループを検索可能にするRLSではなく、`join_group_by_invite_code` RPCで安全に処理しています。存在しない招待コードと参加済みグループはエラーになります。

ゲストはSupabase Authの匿名ユーザーとして作成され、通常ユーザーと同じ `profiles`、`group_members`、`step_records` に保存されます。そのためDB上ではメール登録ユーザーと同じRLS・ランキング処理を利用します。

## ビルド

```bash
npm run build
```

## CI

GitHub Actionsで、`main`へのpushとPull Requestごとに以下を実行します。

- `npm ci`
- `npm run build`（TypeScriptの型チェックとViteの本番ビルド）

手動実行する場合は、GitHubのActions画面から`CI`を選択して実行できます。

## Vercelにデプロイする場合

Viteの環境変数はビルド時に埋め込まれます。Vercelでは、デプロイ前に Project Settings > Environment Variables で以下を設定してください。

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

設定対象のEnvironmentは、公開URLがProductionなら `Production`、プレビューURLなら `Preview` にもチェックを入れます。設定後は既存デプロイには反映されないため、必ずRedeployしてください。`vercel.json` でSPA向けのrewriteを設定しているため、`/groups/:id` などを直接開いた場合も `index.html` に戻ります。

メール確認を有効にする場合は、Supabase Dashboard > Authentication > URL Configuration でVercelの公開URLを Site URL または Redirect URLs に追加してください。アプリ側は登録時に現在の公開URLへ戻るよう `emailRedirectTo` を指定しています。

## 画面

- `/login`: ログイン
- `/signup`: 新規登録
- `/`: ホーム
- `/groups`: グループ一覧
- `/groups/:id`: グループ詳細
- `/mypage`: マイページ
