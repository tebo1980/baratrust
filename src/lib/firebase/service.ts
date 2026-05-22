import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from './config';
import { JobLead, Contractor } from '../../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  async getContractor(uid: string) {
    const path = `contractors/${uid}`;
    try {
      const d = await getDocs(query(collection(db, 'contractors'), where('uid', '==', uid)));
      if (d.empty) return null;
      return d.docs[0].data() as Contractor;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  },

  async saveContractor(contractor: Contractor) {
    const path = `contractors/${contractor.uid}`;
    try {
      // Use existing UID as doc ID if possible, but here we'll just check if it exists
      const q = query(collection(db, 'contractors'), where('uid', '==', contractor.uid));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'contractors'), {
          ...contractor,
          createdAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'contractors', snap.docs[0].id), {
          ...contractor,
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async getLeads(uid: string) {
    const path = 'leads';
    try {
      const q = query(collection(db, 'leads'), where('contractorId', '==', uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobLead & { id: string }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  subscribeToLeads(uid: string, callback: (leads: (JobLead & { id: string })[]) => void) {
    const path = 'leads';
    const q = query(collection(db, 'leads'), where('contractorId', '==', uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const leads = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobLead & { id: string }));
      callback(leads);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async addLead(lead: Partial<JobLead>) {
    const path = 'leads';
    try {
      await addDoc(collection(db, 'leads'), {
        ...lead,
        createdAt: serverTimestamp(),
        status: 'new'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  async updateLeadStatus(leadId: string, status: JobLead['status']) {
    const path = `leads/${leadId}`;
    try {
      await updateDoc(doc(db, 'leads', leadId), { status });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  }
};
