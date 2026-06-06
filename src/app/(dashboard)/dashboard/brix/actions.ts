"use server";

import { db } from "@/db";
import { projects, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function saveProjectDetails(jobName: string, address: string) {
  if (!jobName || !jobName.trim()) {
    return { success: false, error: "Job name is required" };
  }

  try {
    const result = await db.insert(projects).values({
      name: jobName,
      address,
    }).returning({ id: projects.id });
    return { success: true, id: result[0].id };
  } catch (error) {
    console.error("Error saving project:", error);
    return { success: false, error: "Failed to save project details" };
  }
}

export async function saveMessage(projectId: string, role: "user" | "assistant", content: string) {
  try {
    await db.insert(messages).values({
      projectId,
      role,
      content,
    });
    return { success: true };
  } catch (error) {
    console.error("Error saving message:", error);
    return { success: false, error: "Failed to save message" };
  }
}

export async function getProjectHistory(projectId: string) {
  try {
    const proj = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!proj.length) return { success: false, error: "Project not found" };
    
    const msgs = await db.select().from(messages).where(eq(messages.projectId, projectId)).orderBy(asc(messages.id));
    return { success: true, project: proj[0], messages: msgs };
  } catch (error) {
    console.error("Error fetching project history:", error);
    return { success: false, error: "Failed to fetch project history" };
  }
}
