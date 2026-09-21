import { describe, it, expect, beforeEach } from "vitest"

import { resetDatabase, getTestPayload } from "./setup-integration"
import { createTestUser } from "./lib/seed"

describe("integration harness smoke test", () => {
  beforeEach(resetDatabase)

  it("boots payload against the scratch database with migrations applied", async () => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload)
    const found = await payload.findByID({ collection: "users", id: user.id, overrideAccess: true })
    expect(found.email).toBe(user.email)
  })
})
