/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AlertRuleConfig,
  BudgetSettings,
  CategoryRule,
  ConnectedAccount,
  PaymentChannel,
  Transaction,
} from '../types/finance';
import { DEFAULT_BUDGET_SETTINGS } from '../utils/storage';
import { PRESET_CATEGORY_RULES } from '../utils/rulesEngine';
import { DEFAULT_ALERT_CONFIG } from '../utils/alertEngine';
import { DEFAULT_CONNECTED_ACCOUNTS } from '../utils/accountDefaults';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  hasCompletedOnboarding: boolean;
  totalBudget: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch or initialize a user profile under /users/{userId}
 */
export async function getOrCreateUserProfile(
  userId: string,
  userAuth: { email?: string | null; displayName?: string | null; photoURL?: string | null }
): Promise<{ profile: UserProfileData; isNewUser: boolean }> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      return { profile: snap.data() as UserProfileData, isNewUser: false };
    }

    // Create new user profile document
    const nowStr = new Date().toISOString();
    const newProfile: UserProfileData = {
      uid: userId,
      email: userAuth.email || '',
      displayName: userAuth.displayName || '财务用户',
      photoURL: userAuth.photoURL || '',
      hasCompletedOnboarding: false,
      totalBudget: 2500,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await setDoc(userDocRef, newProfile);

    // Also initialize default budget settings for this user
    const budgetPath = `users/${userId}/settings/budget`;
    const budgetRef = doc(db, 'users', userId, 'settings', 'budget');
    await setDoc(budgetRef, {
      userId,
      totalBudget: DEFAULT_BUDGET_SETTINGS.totalBudget,
      buckets: DEFAULT_BUDGET_SETTINGS.buckets,
      updatedAt: nowStr,
    });

    return { profile: newProfile, isNewUser: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update user onboarding state
 */
export async function updateUserOnboarding(
  userId: string,
  hasCompleted: boolean
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      hasCompletedOnboarding: hasCompleted,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Load user budget configuration from /users/{userId}/settings/budget
 */
export async function getUserBudget(userId: string): Promise<BudgetSettings> {
  const path = `users/${userId}/settings/budget`;
  try {
    const budgetRef = doc(db, 'users', userId, 'settings', 'budget');
    const snap = await getDoc(budgetRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        totalBudget: data.totalBudget || 2500,
        buckets: data.buckets || DEFAULT_BUDGET_SETTINGS.buckets,
      };
    }

    // Default if not created yet
    return DEFAULT_BUDGET_SETTINGS;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Save user budget configuration to /users/{userId}/settings/budget
 */
export async function saveUserBudget(
  userId: string,
  budget: BudgetSettings
): Promise<void> {
  const path = `users/${userId}/settings/budget`;
  try {
    const budgetRef = doc(db, 'users', userId, 'settings', 'budget');
    await setDoc(budgetRef, {
      userId,
      totalBudget: budget.totalBudget,
      buckets: budget.buckets,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Load all transactions for this user from /users/{userId}/transactions
 */
export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const path = `users/${userId}/transactions`;
  try {
    const txColRef = collection(db, 'users', userId, 'transactions');
    const snap = await getDocs(txColRef);

    const results: Transaction[] = [];
    snap.forEach((d) => {
      const data = d.data();
      results.push({
        id: d.id,
        type: data.type,
        amount: Number(data.amount) || 0,
        date: data.date,
        time: data.time || '',
        category: data.category,
        channel: data.channel,
        note: data.note || '',
        isCategorized: data.isCategorized !== false,
        targetAccount: data.targetAccount || undefined,
        isRefund: Boolean(data.isRefund),
        merchant: data.merchant || '',
        sourceBillType: data.sourceBillType || 'manual',
        createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
      });
    });

    // Sort by date descending in memory
    results.sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return timeB - timeA;
    });

    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Add a new transaction under /users/{userId}/transactions/{txId}
 */
export async function addUserTransaction(
  userId: string,
  txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Transaction> {
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `users/${userId}/transactions/${txId}`;

  try {
    const docRef = doc(db, 'users', userId, 'transactions', txId);
    const nowIso = new Date().toISOString();

    const payload = {
      id: txId,
      userId,
      type: txData.type,
      amount: Math.round(txData.amount * 100) / 100,
      date: txData.date,
      time: txData.time || '',
      category: txData.category,
      channel: txData.channel,
      note: txData.note || '',
      isCategorized: txData.isCategorized,
      targetAccount: txData.targetAccount || '',
      isRefund: Boolean(txData.isRefund),
      merchant: txData.merchant || '',
      sourceBillType: txData.sourceBillType || 'manual',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(docRef, payload);

    return {
      ...txData,
      id: txId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Update an existing transaction
 */
export async function updateUserTransaction(
  userId: string,
  tx: Transaction
): Promise<void> {
  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', tx.id);
    const nowIso = new Date().toISOString();

    await setDoc(docRef, {
      id: tx.id,
      userId,
      type: tx.type,
      amount: Math.round(tx.amount * 100) / 100,
      date: tx.date,
      time: tx.time || '',
      category: tx.category,
      channel: tx.channel,
      note: tx.note || '',
      isCategorized: tx.isCategorized,
      targetAccount: tx.targetAccount || '',
      isRefund: Boolean(tx.isRefund),
      merchant: tx.merchant || '',
      sourceBillType: tx.sourceBillType || 'manual',
      updatedAt: nowIso,
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a transaction
 */
export async function deleteUserTransaction(
  userId: string,
  txId: string
): Promise<void> {
  const path = `users/${userId}/transactions/${txId}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', txId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Batch migrate local transactions into user's private cloud archive
 * with anti-duplication protection
 */
export async function migrateLocalTransactionsToCloud(
  userId: string,
  localTransactions: Transaction[],
  existingCloudTxs: Transaction[]
): Promise<{ migratedCount: number; skippedDuplicateCount: number }> {
  const path = `users/${userId}/transactions`;
  try {
    // Detect duplicates against existing cloud transactions
    const toMigrate: Transaction[] = [];
    let skipped = 0;

    localTransactions.forEach((localTx) => {
      const isDup = existingCloudTxs.some(
        (cloudTx) =>
          cloudTx.date === localTx.date &&
          Math.abs(cloudTx.amount - localTx.amount) < 0.001 &&
          cloudTx.channel === localTx.channel &&
          (cloudTx.note.trim() === localTx.note.trim() || (!cloudTx.note && !localTx.note))
      );

      if (isDup) {
        skipped++;
      } else {
        toMigrate.push(localTx);
      }
    });

    if (toMigrate.length === 0) {
      return { migratedCount: 0, skippedDuplicateCount: skipped };
    }

    // Write in batches of up to 450 (Firestore limit is 500)
    const BATCH_SIZE = 400;
    for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
      const chunk = toMigrate.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((tx) => {
        const cleanId = tx.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const txDocRef = doc(db, 'users', userId, 'transactions', cleanId);
        const nowIso = new Date().toISOString();

        batch.set(txDocRef, {
          id: cleanId,
          userId,
          type: tx.type,
          amount: Math.round(tx.amount * 100) / 100,
          date: tx.date,
          time: tx.time || '',
          category: tx.category,
          channel: tx.channel,
          note: tx.note || '',
          isCategorized: tx.isCategorized,
          targetAccount: tx.targetAccount || '',
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      });

      await batch.commit();
    }

    return { migratedCount: toMigrate.length, skippedDuplicateCount: skipped };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Record an import log into /users/{userId}/importHistory/{importId}
 */
export async function logUserImportRecord(
  userId: string,
  fileName: string,
  count: number
): Promise<void> {
  const importId = `imp_${Date.now()}`;
  const path = `users/${userId}/importHistory/${importId}`;
  try {
    const ref = doc(db, 'users', userId, 'importHistory', importId);
    await setDoc(ref, {
      id: importId,
      userId,
      fileName,
      importedCount: count,
      importedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Non-blocking error
    console.warn('Failed to log import history:', error);
  }
}

/**
 * Load all category rules for this user from /users/{userId}/categoryRules
 * If no custom rules exist yet, returns the preset category rules.
 */
export async function getUserCategoryRules(userId: string): Promise<CategoryRule[]> {
  const path = `users/${userId}/categoryRules`;
  try {
    const rulesColRef = collection(db, 'users', userId, 'categoryRules');
    const snap = await getDocs(rulesColRef);

    if (snap.empty) {
      return PRESET_CATEGORY_RULES;
    }

    const customRules: CategoryRule[] = [];
    snap.forEach((d) => {
      const data = d.data();
      customRules.push({
        id: d.id,
        keyword: data.keyword,
        targetCategory: data.targetCategory,
        targetType: data.targetType,
        channel: data.channel || undefined,
        enabled: data.enabled !== false,
        description: data.description || '',
        isPreset: Boolean(data.isPreset),
        createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
      });
    });

    // Merge preset rules that are not overridden by custom rule ids
    const customIds = new Set(customRules.map((r) => r.id));
    const merged = [
      ...customRules,
      ...PRESET_CATEGORY_RULES.filter((p) => !customIds.has(p.id)),
    ];

    return merged;
  } catch (error) {
    console.warn('Failed to fetch user category rules from cloud, fallback to presets:', error);
    return PRESET_CATEGORY_RULES;
  }
}

/**
 * Save or update a category rule under /users/{userId}/categoryRules/{ruleId}
 */
export async function saveUserCategoryRule(
  userId: string,
  rule: CategoryRule
): Promise<CategoryRule> {
  const ruleId = rule.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const path = `users/${userId}/categoryRules/${ruleId}`;

  try {
    const docRef = doc(db, 'users', userId, 'categoryRules', ruleId);
    const nowIso = new Date().toISOString();

    const payload = {
      id: ruleId,
      userId,
      keyword: rule.keyword.trim(),
      targetCategory: rule.targetCategory,
      targetType: rule.targetType,
      channel: rule.channel || '',
      enabled: rule.enabled,
      description: rule.description || '',
      isPreset: Boolean(rule.isPreset),
      updatedAt: nowIso,
      createdAt: nowIso,
    };

    await setDoc(docRef, payload, { merge: true });

    return {
      ...rule,
      id: ruleId,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a category rule under /users/{userId}/categoryRules/{ruleId}
 */
export async function deleteUserCategoryRule(
  userId: string,
  ruleId: string
): Promise<void> {
  const path = `users/${userId}/categoryRules/${ruleId}`;
  try {
    const docRef = doc(db, 'users', userId, 'categoryRules', ruleId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Batch insert multiple transactions into user's Firestore (e.g. from confirmed bill import)
 */
export async function batchAddUserTransactions(
  userId: string,
  txList: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<Transaction[]> {
  const path = `users/${userId}/transactions`;
  try {
    const createdList: Transaction[] = [];
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    txList.forEach((txData, index) => {
      const txId = `tx_imp_${nowMs}_${index}_${Math.random().toString(36).substring(2, 6)}`;
      const docRef = doc(db, 'users', userId, 'transactions', txId);

      const payload = {
        id: txId,
        userId,
        type: txData.type,
        amount: Math.round(txData.amount * 100) / 100,
        date: txData.date,
        time: txData.time || '',
        category: txData.category,
        channel: txData.channel,
        note: txData.note || '',
        isCategorized: txData.isCategorized,
        targetAccount: txData.targetAccount || '',
        isRefund: Boolean(txData.isRefund),
        merchant: txData.merchant || '',
        sourceBillType: txData.sourceBillType || 'csv',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      batch.set(docRef, payload);

      createdList.push({
        ...txData,
        id: txId,
        createdAt: nowMs + index,
        updatedAt: nowMs + index,
      });
    });

    await batch.commit();
    return createdList;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch User Alert Configuration from /users/{userId}/settings/alerts
 */
export async function getUserAlertConfig(userId: string): Promise<AlertRuleConfig> {
  const path = `users/${userId}/settings/alerts`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'alerts');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        ...DEFAULT_ALERT_CONFIG,
        ...data.config,
      };
    }

    return DEFAULT_ALERT_CONFIG;
  } catch (error) {
    console.warn('Error reading user alert config from Firestore, falling back to defaults:', error);
    return DEFAULT_ALERT_CONFIG;
  }
}

/**
 * Save User Alert Configuration to /users/{userId}/settings/alerts
 */
export async function saveUserAlertConfig(
  userId: string,
  config: AlertRuleConfig
): Promise<void> {
  const path = `users/${userId}/settings/alerts`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'alerts');
    await setDoc(
      docRef,
      {
        userId,
        config,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch User Connected Accounts & Authorization Settings from /users/{userId}/settings/accounts
 */
export async function getUserConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
  const path = `users/${userId}/settings/accounts`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'accounts');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.accounts)) {
        return DEFAULT_CONNECTED_ACCOUNTS.map((def) => {
          const match = data.accounts.find((a: ConnectedAccount) => a.id === def.id);
          return match ? { ...def, ...match } : def;
        });
      }
    }

    return DEFAULT_CONNECTED_ACCOUNTS;
  } catch (error) {
    console.warn('Error fetching connected accounts, using defaults:', error);
    return DEFAULT_CONNECTED_ACCOUNTS;
  }
}

/**
 * Save User Connected Accounts & Authorization Settings to /users/{userId}/settings/accounts
 */
export async function saveUserConnectedAccounts(
  userId: string,
  accounts: ConnectedAccount[]
): Promise<void> {
  const path = `users/${userId}/settings/accounts`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'accounts');
    await setDoc(
      docRef,
      {
        userId,
        accounts,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete all transactions belonging to a specific payment channel
 * (Used when user revokes account authorization and chooses to wipe imported channel records)
 */
export async function deleteUserTransactionsByChannel(
  userId: string,
  channel: PaymentChannel
): Promise<number> {
  const path = `users/${userId}/transactions`;
  try {
    const txCol = collection(db, 'users', userId, 'transactions');
    const snapshot = await getDocs(txCol);

    const batch = writeBatch(db);
    let deletedCount = 0;

    snapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.channel === channel) {
        batch.delete(d.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      await batch.commit();
    }
    return deletedCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return 0;
  }
}

/**
 * Delete all transactions of the user (Clear ledger data)
 */
export async function deleteAllUserTransactions(userId: string): Promise<number> {
  const path = `users/${userId}/transactions`;
  try {
    const txCol = collection(db, 'users', userId, 'transactions');
    const snapshot = await getDocs(txCol);

    const batch = writeBatch(db);
    let deletedCount = 0;

    snapshot.docs.forEach((d) => {
      batch.delete(d.ref);
      deletedCount++;
    });

    if (deletedCount > 0) {
      await batch.commit();
    }
    return deletedCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return 0;
  }
}

/**
 * Complete Data Wipe / Reset for current user
 * Clears transactions, resets budget, resets category rules, resets accounts
 */
export async function wipeAllUserData(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    // 1. Delete all transactions
    await deleteAllUserTransactions(userId);

    // 2. Reset Budget to Default 2500
    await saveUserBudget(userId, DEFAULT_BUDGET_SETTINGS);

    // 3. Reset Category Rules
    const rulesCol = collection(db, 'users', userId, 'categoryRules');
    const rulesSnap = await getDocs(rulesCol);
    const ruleBatch = writeBatch(db);
    rulesSnap.docs.forEach((d) => {
      ruleBatch.delete(d.ref);
    });
    await ruleBatch.commit();

    // 4. Reset Accounts
    await saveUserConnectedAccounts(userId, DEFAULT_CONNECTED_ACCOUNTS);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

