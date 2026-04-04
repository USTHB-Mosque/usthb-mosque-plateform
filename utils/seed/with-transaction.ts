import type { Payload } from 'payload'

export async function withTransaction<T>(
  payload: Payload,
  fn: () => Promise<T>,
  collectionName: string,
): Promise<{ success: boolean; result?: T; error?: string }> {
  const transactionID = await payload.db.beginTransaction()

  if (!transactionID) {
    console.warn(`⚠️  Transactions not supported for "${collectionName}", seeding without them`)
    try {
      const result = await fn()
      return { success: true, result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  try {
    const result = await fn()
    await payload.db.commitTransaction(transactionID)
    return { success: true, result }
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    console.error(`\n❌ Failed to seed "${collectionName}", transaction rolled back`)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
