import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Generates an official, sequential certificate ID with the format CM-YYYY-XXXXXX.
 * Uses the existing count of certificates to determine the next number.
 * The `certificates` collection is publicly readable, so no special permissions required.
 */
export async function generateOfficialCertId(): Promise<string> {
  const certCollection = collection(db, "certificates");
  const snapshot = await getCountFromServer(certCollection);
  const count = snapshot.data().count;
  const nextNum = count + 1;

  const year = new Date().getFullYear();
  // Pad the sequence with zeroes to 6 digits (e.g. 000001, 000042, 001305)
  const sequenceStr = String(nextNum).padStart(6, "0");
  return `CM-${year}-${sequenceStr}`;
}
