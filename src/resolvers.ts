import { prisma } from "./db";
import { journalController } from "./controllers/journal";
import { trackController } from "./controllers/track";
import { categoryController } from "./controllers/category";
import { activityController } from "./controllers/activity";
import { Resolvers } from "./generated/graphql";

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
        id: data.track.id,
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
        iconId: data.activity.iconId,
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
    icon: ({ iconId }) => {
      return prisma.icon.findUnique({
        where: {
          id: iconId,
        },
      });
    },
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
      if (!parent.trackId) {
        throw new Error(`need trackId to find track name`);
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
      return prisma.mood.findUnique({
        where: { id: moodId },
      });
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
