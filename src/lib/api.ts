import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Group, GroupMember, Profile, RankingRow, StepRecord } from '../types';

type GroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return '処理に失敗しました。';
}

function generateInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomValues = crypto.getRandomValues(new Uint32Array(8));

  return Array.from(randomValues)
    .map((value) => alphabet[value % alphabet.length])
    .join('');
}

function normalizeMember(
  row: GroupMemberRow,
  profile: Pick<Profile, 'id' | 'username' | 'target_steps'> | null,
): GroupMember {
  return {
    id: row.id,
    group_id: row.group_id,
    user_id: row.user_id,
    joined_at: row.joined_at,
    profile,
  };
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signInAsGuest(username: string, inviteCode?: string) {
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    throw new Error('名前を入力してください。');
  }

  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        username: trimmedUsername,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const user = data.user ?? data.session?.user;
  if (!user) {
    throw new Error('ゲストの開始に失敗しました。');
  }

  try {
    await ensureProfile(user, trimmedUsername);

    const trimmedInviteCode = inviteCode?.trim();
    if (!trimmedInviteCode) {
      return null;
    }

    return await joinGroupByInviteCode(trimmedInviteCode);
  } catch (err) {
    await supabase.auth.signOut();
    throw err;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile | null;
}

export async function ensureProfile(user: User, preferredUsername?: string) {
  const existing = await getMyProfile(user.id);

  if (existing) {
    return existing;
  }

  const username =
    preferredUsername?.trim() ||
    (typeof user.user_metadata.username === 'string' ? user.user_metadata.username.trim() : '') ||
    user.email?.split('@')[0] ||
    'ゲスト';
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, username, target_steps: 8000 })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

export async function updateProfile(userId: string, username: string, targetSteps: number) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ username, target_steps: targetSteps })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

export async function getTodayStep(userId: string, date: string) {
  const { data, error } = await supabase
    .from('step_records')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as StepRecord | null;
}

export async function upsertTodayStep(userId: string, date: string, steps: number) {
  const { data, error } = await supabase
    .from('step_records')
    .upsert({ user_id: userId, date, steps }, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as StepRecord;
}

export async function getMyGroups(userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(id, name, invite_code, created_by, created_at)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as { groups: Group | Group[] | null }[])
    .flatMap((row) => {
      if (!row.groups) {
        return [];
      }

      return Array.isArray(row.groups) ? row.groups : [row.groups];
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createGroup(userId: string, name: string) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name, invite_code: inviteCode, created_by: userId })
      .select()
      .single();

    if (groupError) {
      lastError = groupError;
      if (groupError.code === '23505') {
        continue;
      }

      throw new Error(groupError.message);
    }

    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
    });

    if (memberError) {
      throw new Error(memberError.message);
    }

    return group as Group;
  }

  throw new Error(`招待コードの生成に失敗しました。${getErrorMessage(lastError)}`);
}

export async function joinGroupByInviteCode(inviteCode: string) {
  const { data, error } = await supabase.rpc('join_group_by_invite_code', {
    invite_code_input: inviteCode.trim().toUpperCase(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function getGroup(groupId: string) {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Group | null;
}

export async function getGroupMembers(groupId: string) {
  const { data: memberRows, error: membersError } = await supabase
    .from('group_members')
    .select('id, group_id, user_id, joined_at')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (membersError) {
    throw new Error(membersError.message);
  }

  const members = (memberRows ?? []) as GroupMemberRow[];
  const memberIds = members.map((member) => member.user_id);

  if (memberIds.length === 0) {
    return [];
  }

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, target_steps')
    .in('id', memberIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profilesById = new Map(
    ((profileRows ?? []) as Pick<Profile, 'id' | 'username' | 'target_steps'>[]).map((profile) => [profile.id, profile]),
  );

  return members.map((member) => normalizeMember(member, profilesById.get(member.user_id) ?? null));
}

export async function getGroupRanking(groupId: string, date: string) {
  const members = await getGroupMembers(groupId);
  const memberIds = members.map((member) => member.user_id);

  if (memberIds.length === 0) {
    return [];
  }

  const { data: stepRows, error } = await supabase
    .from('step_records')
    .select('*')
    .eq('date', date)
    .in('user_id', memberIds);

  if (error) {
    throw new Error(error.message);
  }

  const stepsByUserId = new Map((stepRows as StepRecord[] | null)?.map((record) => [record.user_id, record.steps]) ?? []);

  return members
    .map((member) => {
      const steps = stepsByUserId.get(member.user_id) ?? 0;
      const targetSteps = member.profile?.target_steps ?? 8000;

      return {
        userId: member.user_id,
        username: member.profile?.username ?? '未設定ユーザー',
        steps,
        targetSteps,
        achieved: steps >= targetSteps,
      };
    })
    .sort((a, b) => b.steps - a.steps || a.username.localeCompare(b.username, 'ja'))
    .map<RankingRow>((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}
