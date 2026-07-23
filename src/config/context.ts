let currentAccount: string | undefined;

export function setCurrentAccount(account?: string): void {
  currentAccount = account;
}

export function getCurrentAccount(): string | undefined {
  return currentAccount;
}
