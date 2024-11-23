import { prisma } from "./db";
import { journalController } from "./controllers/journal";
import { trackController } from "./controllers/track";
import { categoryController } from "./controllers/category";
import { activityController } from "./controllers/activity";
import {
  GetJournalsInput,
  MonthlyMoodData,
  MoodName,
  Resolvers,
  YearlyDashBoard,
} from "./generated/graphql";

const resolvers: Resolvers = {
  Query: {
    readJournal: async (_, { id }) => {
      try {
        const journal = await prisma.journal.findUnique({
          where: {
            id: id,
          },
        });
        return {
          data: journal,
          code: journal ? 200 : 404,
          success: journal ? true : false,
          message: journal ? "success" : `can not find id ${id} journal`,
        };
      } catch (err: any) {
        return {
          code: 500,
          message: err.message,
          success: false,
          data: null,
        };
      }
    },
    getMoods: async () => {
      const moods = await prisma.mood.findMany();
      return {
        data: moods,
        code: moods ? 200 : 404,
        success: moods ? true : false,
        message: moods ? "success" : "err",
      };
    },
    getTracks: async (_, { groupId }: { groupId: number }) => {
      const tracks = await prisma.track.findMany({
        where: {
          groupId,
        },
        select: {
          id: true,
          trackDisplayType: true,
          trackName: true,
        },
      });

      return {
        data: tracks,
        code: tracks ? 200 : 404,
        success: tracks ? true : false,
        message: tracks ? "success" : "err",
      };
    },
    getActivities: async (_, { groupId }: { groupId: number }) => {
      const activities = await prisma.activity.findMany({
        where: {
          groupId,
        },
      });

      return {
        data: activities,
        code: activities ? 200 : 404,
        success: activities ? true : false,
        message: activities ? "success" : "err",
      };
    },
    getJournals: async (_, { input }, { user }) => {
      try {
        const journals = await journalController.getJournals(input, user.id);
        return {
          data: journals,
          code: 200,
          success: journals ? true : false,
          message: journals ? "success" : "err",
        };
      } catch (err: any) {
        return {
          data: null,
          code: 500,
          success: false,
          message: err.message,
        };
      }
    },
    getYearlySummaryData: async (_, { year }: { year: string }, { user }) => {
      const moodRawData = await prisma.$queryRaw<
        {
          month: number;
          moodId: number;
          moodName: MoodName;
          eventsCount: number;
          journalCount: number;
        }[]
      >`
        WITH RECURSIVE months AS (
          SELECT 1 as month
          UNION ALL
          SELECT month + 1 FROM months WHERE month < 12
        )
        SELECT
          m.month,
      	moods.id as "moodId",
          moods.mood_name as "moodName",
      	COUNT(events.id)::INTEGER as "eventsCount",
          COUNT(j.id)::INTEGER as "journalCount"
        FROM months m
        CROSS JOIN moods
        LEFT JOIN "journals" j ON
          EXTRACT(MONTH FROM j."journal_date") = m.month
          AND EXTRACT(YEAR FROM j."journal_date") = ${year}
          AND j."user_id" = ${user.id}
          AND j.mood_id = moods.id
        LEFT JOIN "events" ON
      	j.id = events.journal_id
        GROUP BY m.month, moods.mood_name, moods.id
        ORDER BY m.month, moods.mood_name;
            `;
      const queryCounterRes = await prisma.$queryRaw<
        {
          journalCount: number;
          eventCount: number;
        }[]
      >`
      SELECT
        COUNT(DISTINCT j.id)::INTEGER AS "journalCount",
        COUNT(e.id)::INTEGER AS "eventCount"
      FROM journals j
      LEFT JOIN events e ON j.id = e.journal_id
      WHERE j.user_id = ${user.id}
        AND j.journal_date >= ${new Date(`${year}-01-01`)}
        AND j.journal_date <= ${new Date(`${year}-12-31T23:59:59`)};
    `;
      const monthlyMoodData: MonthlyMoodData[] = Array.from(
        { length: 12 },
        (_, i) => ({
          month: i + 1,
          moods: [],
        })
      );
      moodRawData.forEach((data) => {
        monthlyMoodData[data.month - 1].moods.push({
          moodId: data.moodId,
          moodName: data.moodName,
          journalCount: data.journalCount,
          eventCount: data.eventsCount,
        });
      });

      const counter = {
        totalEventCount: queryCounterRes[0].journalCount,
        totalJournalCount: queryCounterRes[0].eventCount,
      };

      return {
        data: {
          monthlyMoodData,
          counter,
        },
        message: "ok",
        code: 200,
        success: true,
      };
    },
  },

  Journal: {
    journalMood: async ({ moodId }) => {
      return moodId
        ? prisma.mood.findUnique({
            where: {
              id: moodId,
            },
          })
        : null;
    },
    author: async ({ userId }) => {
      return prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
    },
    tracks: async ({ id: journalId }) => {
      const rawData = await prisma.journalTrack.findMany({
        where: {
          journalId,
        },
        include: {
          track: true,
        },
      });

      return rawData.map((data) => ({
        id: data.id,
        trackId: data.track.id,
        trackName: data.track.trackName,
        trackDisplayType: data.track.trackDisplayType,
        trackValue: data.trackValue,
        trackGoal: data.trackGoal,
      }));
    },
    category: async ({ categoryId }) => {
      return (
        categoryId &&
        (await prisma.category.findUnique({
          where: { id: categoryId },
        }))
      );
    },
    activities: async ({ id: journalId }) => {
      const activities = await prisma.journalActivity.findMany({
        where: {
          journalId,
        },
        include: {
          activity: true,
        },
      });
      return activities.map((data) => ({
        id: data.activity.id,
        activityName: data.activity.activityName,
        groupId: data.activity.groupId,
      }));
    },
    events: async ({ id: journalId }) => {
      return await prisma.event.findMany({
        where: {
          journalId,
        },
        orderBy: {
          eventIndex: "asc",
        },
      });
    },
  },

  Activity: {
    group: ({ groupId }) => {
      return prisma.group.findUnique({
        where: {
          id: groupId,
        },
      });
    },
  },

  Mood: {
    icon: ({ iconId }) => {
      return prisma.icon.findUnique({
        where: {
          id: iconId,
        },
      });
    },
  },

  Track: {
    trackDisplayType: async (parent) => {
      if (parent.trackDisplayType) {
        return parent.trackDisplayType;
      }

      if (!parent.trackId) {
        throw new Error(
          `need trackId to find trackDisplayType. parent: ${parent}`
        );
      }
      const track = await prisma.track.findUnique({
        where: {
          id: parent.trackId,
        },
      });

      if (!track) {
        throw new Error(`can not find track id: ${parent.trackId}`);
      }

      return track.trackDisplayType;
    },
    trackName: async (parent) => {
      if (parent.trackName) {
        return parent.trackName;
      }

      if (!parent.trackId) {
        throw new Error(
          `need trackId to find track name, parent: ${JSON.stringify(parent)}`
        );
      }
      const track = await prisma.track.findUnique({
        where: {
          id: parent.trackId,
        },
      });

      if (!track) {
        throw new Error(`can not find track id: ${parent.trackId}`);
      }
      return track.trackName;
    },
  },

  JournalEvent: {
    mood: ({ moodId }) => {
      return moodId
        ? prisma.mood.findUnique({
            where: { id: moodId },
          })
        : null;
    },
    group: ({ groupId }) => {
      return prisma.group.findUnique({
        where: {
          id: groupId,
        },
      });
    },
  },

  JournalCategory: {
    group: ({ groupId }) => {
      return prisma.group.findUnique({
        where: {
          id: groupId,
        },
      });
    },
  },

  Mutation: {
    // TODO: validation 確保category, user確實屬於該群組
    addJournal: async (_, { input }, { user }) => {
      try {
        const journal = await journalController.addJournal(input);
        return {
          code: 201,
          message: "success",
          success: true,
          data: journal,
        };
      } catch (err: any) {
        return {
          code: 500,
          message: err.message,
          success: false,
          data: null,
        };
      }
    },

    updateJournal: async (_, { input }) => {
      try {
        await journalController.updateJournal(input);
        return {
          code: 200,
          message: "successfully update journal",
          success: true,
        };
      } catch (err: any) {
        console.log(JSON.stringify(err.stack));
        return {
          code: 500,
          message: err.message,
          success: false,
        };
      }
    },

    removeJournal: async (_, { id }, { user }) => {
      try {
        const journal = await journalController.removeJournal(id, user);
        return {
          success: true,
          code: 200,
          message: "delete success",
          data: journal,
        };
      } catch (err: any) {
        return {
          success: true,
          code: 500,
          message: err.message,
          data: null,
        };
      }
    },

    createTrack: async (_, { input }, { user }) => {
      try {
        return {
          data: await trackController.createTrack(input),
          code: 201,
          message: "success create track",
          success: true,
        };
      } catch (err: any) {
        return {
          data: null,
          success: false,
          message: err.message,
          code: 500,
        };
      }
    },

    removeTrack: async (_, { id }) => {
      try {
        return {
          success: true,
          code: 200,
          message: "success remove track",
          data: await prisma.track.delete({
            where: {
              id: id,
            },
          }),
        };
      } catch (err: any) {
        return {
          code: 500,
          message: err.message,
          data: null,
          success: false,
        };
      }
    },

    createCategory: async (_, { input }) => {
      try {
        return {
          code: 201,
          message: "success create category",
          data: await categoryController.createCategory(input),
          success: true,
        };
      } catch (err: any) {
        return {
          success: false,
          data: false,
          message: err.message,
          code: 500,
        };
      }
    },

    removeCategory: async (_, { input }) => {
      try {
        return {
          code: 200,
          message: "success remove category",
          success: true,
          data: await categoryController.removeCategory(input),
        };
      } catch (err: any) {
        return {
          code: 500,
          message: err.message,
          data: null,
          success: false,
        };
      }
    },

    createActivity: async (_, { input }) => {
      try {
        return {
          data: await activityController.createActivity(input),
          code: 201,
          message: "successfully create activity",
          success: false,
        };
      } catch (err: any) {
        return {
          code: 500,
          message: err.message,
          success: false,
          data: null,
        };
      }
    },
    // TODO: 更新圖片
    updateActivity: async (_, { input }) => {
      try {
        return {
          data: await activityController.updateActivity(input),
          code: 200,
          message: "successfully update activity",
          success: true,
        };
      } catch (err: any) {
        return {
          data: null,
          success: false,
          message: err.message,
          code: 500,
        };
      }
    },
    // 前端要跳出警告？

    removeActivity: async (_, { id }) => {
      try {
        return {
          data: await activityController.removeActivity(id),
          success: true,
          code: 200,
          message: "successfully remove activity",
        };
      } catch (err: any) {
        return {
          code: 500,
          message: err.message,
          success: false,
          data: null,
        };
      }
    },

    removeJournalTrack: async (_, { id }) => {
      try {
        const deleteTrack = await trackController.removeJournalTrack(id);
        return {
          data: deleteTrack,
          code: 200,
          message: `successfully remove ${deleteTrack.id}`,
          success: true,
        };
      } catch (err: any) {
        return {
          code: 500,
          message: err.message,
          success: false,
          data: null,
        };
      }
    },

    addJournalTrack: async (_, { input }) => {
      try {
        return {
          data: await trackController.addJournalTrack(input),
          code: 201,
          message: "success",
          success: true,
        };
      } catch (err: any) {
        return {
          data: null,
          code: 500,
          message: err.message,
          success: false,
        };
      }
    },
  },
};

export default resolvers;
