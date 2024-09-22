import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface NextStep {
	goalId: string
	goalCreatedAt: Date
	goalTitle: string
	stepId: string
	stepTitle: string
	stepDescription: string | null
	stepDuration: number
	stepCompletedAt: Date | null
	stepSnoozeTill: Date | null
}

export async function getNextStep(userId: string) {
	const currentTimestamp = await prisma.$queryRaw<{ now: any }[]>`
		SELECT * FROM Step WHERE snoozeTill < '2024-09-21T04:50:06.452Z'
	`

	const nextSteps = await prisma.$queryRaw<NextStep[]>`
    WITH RankedSteps AS (
      SELECT
        g.id AS goalId,
        g.createdAt AS goalCreatedAt,
        g.title AS goalTitle,
        s.id AS stepId,
        s.title AS stepTitle,
        s.description AS stepDescription,
        s.duration AS stepDuration,
        s.completedAt AS stepCompletedAt,
        s.snoozeTill AS stepSnoozeTill,
        ROW_NUMBER() OVER (
          ORDER BY s.createdAt ASC
        ) AS stepRank,
        ROW_NUMBER() OVER (
          PARTITION BY g.id
          ORDER BY s.createdAt ASC
        ) AS stepWithinGoalRank
      FROM Goal g
      JOIN Step s ON g.id = s.goalId
      WHERE g.userId = ${userId}
    )
    SELECT
      goalId,
      goalCreatedAt,
      goalTitle,
      stepId,
      stepTitle,
      stepDescription,
      stepDuration,
      stepCompletedAt,
      stepSnoozeTill
    FROM RankedSteps
    WHERE stepCompletedAt IS NULL
      AND (stepSnoozeTill IS NULL OR stepSnoozeTill <= CURRENT_TIMESTAMP)
    ORDER BY stepWithinGoalRank ASC, stepRank ASC
  `

	// console.log(nextSteps)
	console.log(currentTimestamp)

	return nextSteps[0] || null
}
