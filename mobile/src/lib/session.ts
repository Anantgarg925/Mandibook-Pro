export const APP_SESSION_KEY = 'mandibook_app_session';
export const MEMBER_SESSION_KEY = 'mandibook_member_session';

export type AppSession = {
  id: string;
  name: string;
  phone: string;
  role: string;
  sessionToken?: string;
};
