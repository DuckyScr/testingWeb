import { prisma } from "@/lib/prisma";

// Define log severity types
export type LogSeverity = "info" | "warning" | "error";

// Add a simple in-memory cache to prevent excessive log fetching
let lastFetchTime = 0;
const FETCH_COOLDOWN = 5000; // 5 seconds between fetches

// Function to create a new log entry
export async function createLog(
  action: string,
  userId: string,
  details: string,
  entity: string,
  entityId: string,
  severity: string
) {
  try {
    // First verify the user exists
    const userExists = await prisma.user.findUnique({
      where: { id: String(userId) }, // Convert userId to string
      select: { id: true }
    });

    if (!userExists) {
      console.warn(`Attempted to create log for non-existent user: ${userId}`);
      return null;
    }

    return await prisma.log.create({
      data: {
        action,
        userId: String(userId), // Ensure userId is a string
        message: details,
        entityType: entity,
        entityId: String(entityId), // Ensure entityId is a string
        level: severity
      }
    });
  } catch (error) {
    // Log the error but don't throw it to prevent breaking the main operation
    console.error('Error creating log:', error);
    return null;
  }
}

// Add a rate-limited logs fetch function
export async function fetchLogsWithRateLimit() {
  const now = Date.now();
  
  // If we've fetched logs recently, return null to indicate cooldown
  if (now - lastFetchTime < FETCH_COOLDOWN) {
    return { rateLimited: true, logs: [] };
  }
  
  // Update last fetch time
  lastFetchTime = now;
  
  // Fetch logs
  try {
    const logs = await prisma.log.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    return { rateLimited: false, logs };
  } catch (error) {
    console.error('Error fetching logs:', error);
    return { rateLimited: false, logs: [] };
  }
}