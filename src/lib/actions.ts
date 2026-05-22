"use server";

import { db } from "../db";
import { leads } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export async function fetchNeonLeads() {
    try {
        const data = await db.select().from(leads).orderBy(desc(leads.createdAt));
        return data;
    } catch (e) {
        console.error("Failed to fetch leads", e);
        return [];
    }
}

export async function updateNeonLeadStatus(id: number, newStatus: string) {
    try {
        await db.update(leads).set({ status: newStatus }).where(eq(leads.id, id));
        return true;
    } catch (e) {
        console.error("Failed to update status", e);
        return false;
    }
}