// 클라우드 저장 (Supabase)
// - 처음 접속하면 게스트(익명) 계정을 자동으로 만들고 진행을 서버에 자동 저장
// - 이메일로 '저장 지키기'를 하면 다른 기기·브라우저에서 6자리 코드로 이어 하기
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CLOUD } from './cloudConfig';
import type { SaveData } from './meta/save';

export type CloudStatus = 'off' | 'connecting' | 'on' | 'error';
export const cloud = {
  status: 'off' as CloudStatus,
  email: '' as string,
  lastSync: 0,
  error: '',
};

let sb: SupabaseClient | null = null;
let uid: string | null = null;
let pushTimer = 0;
let pending: SaveData | null = null;

export function cloudEnabled(): boolean {
  return !!(CLOUD.url && CLOUD.anonKey);
}

function client(): SupabaseClient {
  if (!sb) sb = createClient(CLOUD.url, CLOUD.anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'catwar.auth' } });
  return sb;
}

async function ensureUser(): Promise<string> {
  const c = client();
  const { data } = await c.auth.getSession();
  let user = data.session?.user ?? null;
  if (!user) {
    const r = await c.auth.signInAnonymously();
    if (r.error) throw r.error;
    user = r.data.user;
  }
  if (!user) throw new Error('no user');
  cloud.email = user.email ?? '';
  return user.id;
}

/** 서버에 있는 내 저장 (없으면 null) */
async function fetchSave(): Promise<SaveData | null> {
  const { data, error } = await client().from('saves').select('data').eq('user_id', uid!).maybeSingle();
  if (error) throw error;
  return (data?.data as SaveData) ?? null;
}

/** 진행 정도 비교용 점수 (저장 시각이 없을 때 대비) */
function progress(s: SaveData): number {
  return Object.keys(s.stages ?? {}).length * 1e6 + (s.exp ?? 0);
}

/**
 * 시작할 때 한 번: 게스트 로그인 후 서버 저장과 비교.
 * 서버 쪽이 더 최근이면 그 저장을 돌려준다 (호출한 쪽에서 적용). 아니면 내 저장을 올린다.
 */
export async function cloudInit(local: SaveData): Promise<SaveData | null> {
  if (!cloudEnabled()) return null;
  cloud.status = 'connecting';
  try {
    uid = await ensureUser();
    const remote = await fetchSave();
    cloud.status = 'on';
    if (remote && ((remote.savedAt ?? 0) > (local.savedAt ?? 0) || progress(remote) > progress(local) && !local.savedAt)) {
      cloud.lastSync = Date.now();
      return remote;
    }
    await pushNow(local);
    return null;
  } catch (e) {
    cloud.status = 'error';
    cloud.error = (e as Error).message ?? String(e);
    return null;
  }
}

async function pushNow(s: SaveData): Promise<void> {
  if (!uid) return;
  const { error } = await client().from('saves').upsert({ user_id: uid, data: s, updated_at: new Date().toISOString() });
  if (error) { cloud.status = 'error'; cloud.error = error.message; return; }
  cloud.status = 'on';
  cloud.lastSync = Date.now();
}

/** 저장할 때마다 불림: 3초 모아서 한 번에 올린다 */
export function cloudPush(s: SaveData): void {
  if (!cloudEnabled() || !uid) return;
  pending = s;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => { const p = pending; pending = null; if (p) void pushNow(p); }, 3000);
}

/** 창을 닫기 직전 등: 모아 둔 저장을 바로 올림 */
export function cloudFlush(): void {
  if (pending) { const p = pending; pending = null; window.clearTimeout(pushTimer); void pushNow(p); }
}

// ───────────── 이메일로 저장 지키기 / 다른 기기에서 이어 하기 ─────────────

/** 지금 게스트 계정에 이메일을 연결 (메일로 6자리 코드가 감) */
export async function linkEmailStart(email: string): Promise<string | null> {
  const { error } = await client().auth.updateUser({ email });
  return error ? error.message : null;
}

export async function linkEmailVerify(email: string, code: string): Promise<string | null> {
  const { error } = await client().auth.verifyOtp({ email, token: code, type: 'email_change' });
  if (error) return error.message;
  cloud.email = email;
  return null;
}

/** 다른 기기: 이메일로 6자리 코드 받기 */
export async function loginEmailStart(email: string): Promise<string | null> {
  const { error } = await client().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  return error ? error.message : null;
}

/** 코드 확인 → 그 계정의 저장을 돌려줌 (호출한 쪽에서 적용) */
export async function loginEmailVerify(email: string, code: string): Promise<{ save: SaveData | null; error: string | null }> {
  const { data, error } = await client().auth.verifyOtp({ email, token: code, type: 'email' });
  if (error || !data.user) return { save: null, error: error?.message ?? '로그인 실패' };
  uid = data.user.id;
  cloud.email = email;
  try {
    return { save: await fetchSave(), error: null };
  } catch (e) {
    return { save: null, error: (e as Error).message };
  }
}
