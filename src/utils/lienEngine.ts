import { addDays, addMonths } from 'date-fns';

export type StateCode = 'IN' | 'KY';
export type ProjectType = 'Existing Residential' | 'New Residential' | 'Commercial';

export interface DeadlineNotice {
  statuteCode: string;
  noticeType: string;
  dueDate: Date;
}

export function calculateStatutoryDeadlines(
  state: StateCode,
  projectType: ProjectType,
  firstFurnishedDate: Date,
  lastFurnishedDate: Date
): DeadlineNotice[] {
  const deadlines: DeadlineNotice[] = [];

  if (state === 'IN') {
    // Indiana (IC § 32-28-3)
    if (projectType === 'Existing Residential') {
      deadlines.push({
        statuteCode: 'IC § 32-28-3',
        noticeType: 'Pre-Lien Notice to Owner (Existing Residential)',
        dueDate: addDays(firstFurnishedDate, 30),
      });
    } else if (projectType === 'New Residential') {
      deadlines.push({
        statuteCode: 'IC § 32-28-3',
        noticeType: 'Pre-Lien Notice to Owner (New Residential)',
        dueDate: addDays(firstFurnishedDate, 60),
      });
    }
    
    // 60-day sworn statement and notice of intention to hold lien (Residential)
    if (projectType === 'Existing Residential' || projectType === 'New Residential') {
      deadlines.push({
        statuteCode: 'IC § 32-28-3',
        noticeType: 'Sworn Statement & Notice of Intention to Hold Lien',
        dueDate: addDays(lastFurnishedDate, 60),
      });
    }
  } else if (state === 'KY') {
    // Kentucky (KRS § 376)
    if (projectType === 'Existing Residential' || projectType === 'New Residential') {
      deadlines.push({
        statuteCode: 'KRS § 376',
        noticeType: 'Notice to Owner (Residential)',
        dueDate: addDays(lastFurnishedDate, 75), // Usually calculated from last furnished date in KY
      });
    }

    // 6-month county clerk lien filing clock
    deadlines.push({
      statuteCode: 'KRS § 376',
      noticeType: 'County Clerk Lien Filing',
      dueDate: addMonths(lastFurnishedDate, 6),
    });
  }

  return deadlines;
}
