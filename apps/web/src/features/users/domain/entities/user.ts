/** A global identity registry record (`iam.users`); decrypted at the domain boundary. */
export interface User {
  readonly id: string;
  readonly authSubject: string;
  readonly displayName: string;
  readonly status: string;
  readonly lastSeenAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
