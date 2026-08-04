import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── Initialise once ──────────────────────────────────────────────────────────
function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set");
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || "legacy-business-erp",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "legacy-business-erp.firebasestorage.app",
  });
}

export function getFirestoreDb() {
  getFirebaseApp();
  return getFirestore();
}

// ─── License key helpers ──────────────────────────────────────────────────────
export function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `LBE-${segment()}-${segment()}-${segment()}-${segment()}`;
}

// ─── Firestore company record ─────────────────────────────────────────────────
export interface FirestoreCompany {
  companyCode: string;
  companyName: string;
  licenseKey: string;
  maxUsers: number;
  maxDevices: number;
  maxBranches: number;
  subscriptionStatus: string;      // active | suspended | expired
  subscriptionExpiry: string | null; // ISO date or null
  activationStatus: string;         // pending | active | suspended | expired
  plan: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Create or update company in Firestore ────────────────────────────────────
export async function syncCompanyToFirestore(data: FirestoreCompany): Promise<string> {
  const db = getFirestoreDb();
  const docRef = db.collection("companies").doc(data.companyCode);
  const now = new Date().toISOString();
  await docRef.set({ ...data, updatedAt: now }, { merge: true });
  return docRef.id;
}

// ─── Verify license against Firestore ────────────────────────────────────────
export interface LicenseVerifyResult {
  valid: boolean;
  reason?: string;
  company?: FirestoreCompany;
}

export async function verifyLicenseInFirestore(
  companyCode: string,
  licenseKey: string
): Promise<LicenseVerifyResult> {
  let db: ReturnType<typeof getFirestoreDb>;
  try {
    db = getFirestoreDb();
  } catch (err: any) {
    return { valid: false, reason: `Firebase not configured: ${err.message}` };
  }

  const docRef = db.collection("companies").doc(companyCode.toUpperCase());
  const snap = await docRef.get();

  if (!snap.exists) {
    return { valid: false, reason: "Company code not found. Please contact Legacy Solutions support." };
  }

  const data = snap.data() as FirestoreCompany;

  if (data.licenseKey !== licenseKey.toUpperCase()) {
    return { valid: false, reason: "Invalid license key. Please check and try again." };
  }

  if (data.activationStatus === "suspended") {
    return { valid: false, reason: "This license has been suspended. Please contact support." };
  }

  if (data.subscriptionStatus === "expired" || data.activationStatus === "expired") {
    return { valid: false, reason: "This license has expired. Please renew your subscription." };
  }

  if (data.subscriptionExpiry) {
    const expiry = new Date(data.subscriptionExpiry);
    if (expiry < new Date()) {
      return { valid: false, reason: "Subscription has expired. Please renew to continue." };
    }
  }

  return { valid: true, company: data };
}

// ─── Update activation status in Firestore ────────────────────────────────────
export async function activateCompanyInFirestore(companyCode: string): Promise<void> {
  const db = getFirestoreDb();
  await db.collection("companies").doc(companyCode.toUpperCase()).update({
    activationStatus: "active",
    updatedAt: new Date().toISOString(),
  });
}

// ─── Delete company from Firestore ────────────────────────────────────────────
export async function deleteCompanyFromFirestore(companyCode: string): Promise<void> {
  try {
    const db = getFirestoreDb();
    await db.collection("companies").doc(companyCode.toUpperCase()).delete();
  } catch {
    // Non-fatal — log but don't throw
  }
}
