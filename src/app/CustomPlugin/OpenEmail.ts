import { registerPlugin } from '@capacitor/core';

export interface OpenEmailPlugin {
  openGmail(options: { email: string; subject: string; body: string }): Promise<void>;
}

const OpenEmail = registerPlugin<OpenEmailPlugin>('OpenEmail');

export const openGmailApp = async (email: string, subject: string, body: string) => {
  await OpenEmail.openGmail({ email, subject, body });
};

export default OpenEmail;
