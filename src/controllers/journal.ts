import { prisma } from "../db";
import {
  CreateJournalInput,
  GetJournalsInput,
  InputMaybe,
  UpdateJournalEventInput,
  UpdateJournalInput,
} from "../generated/graphql";
import { JournalActivity, Event, PrismaClient } from "../prisma/prisma-client";
import * as runtime from "../prisma/prisma-client/runtime/library.js";

export const journalController = {
  addJournal: async (input: CreateJournalInput) => {
    const journal = await prisma.journal.create({
      data: {
        journalTitle: input.journalTitle,
        journalBody: input.journalBody,
        journalStatus: "GROUP_ONLY",
        journalDate: input.journalDate,
        user: {
          connect: { id: 1 },
        },
        group: {
          connect: { id: input.groupId },
        },
        ...(input.moodId && {
          mood: {
            connect: { id: input.moodId },
          },
        }),
        ...(input.categoryId && {
          category: {
            connect: { id: input.categoryId },
          },
        }),
      },
    });
    // validate index順序
    // 沒有重複, 而且index都是從1到大照順序
    if (journal) {
      await Promise.all([
        // 新增日記track
        input.tracks &&
          // TODO: 確保track確實是該group的
          prisma.journalTrack.createMany({
            data: input.tracks.map((track) => {
              return {
                trackValue: track.trackValue,
                trackGoal: track.trackGoal || null,
                trackId: track.trackId,
                journalId: journal.id,
              };
            }),
          }),
        // 新增日記事件
        input.events &&
          prisma.event.createMany({
            data: input.events.map((event, eventIndex) => {
              return {
                eventTitle: event.eventTitle,
                eventBody: event.eventBody,
                journalId: journal.id,
                eventIndex: eventIndex,
                moodId: event.eventMoodId,
                groupId: input.groupId,
              };
            }),
          }),
      ]);
    }

    return journal;
  },
  updateJournal: async (input: UpdateJournalInput) => {
    await prisma.$transaction(async (tx) => {
      await Promise.all([
        updateJournalEvents(input, tx, input.id, input.groupId),
        updateJournalActivities(input, tx),
        tx.journal.update({
          where: {
            id: input.id,
          },
          data: {
            categoryId: input.categoryId,
            moodId: input.moodId,
            journalTitle: input.journalTitle,
            journalDate: input.journalDate,
            journalBody: input.journalBody,
          },
        }),
      ]);
    });
  },
  //   @ts-ignore
  removeJournal: async (id: number, user) => {
    const journal = await prisma.journal.delete({
      where: {
        userId: user.id,
        id,
      },
    });
    return journal;
  },
  getJournals: async (
    input: InputMaybe<GetJournalsInput> | undefined,
    userId: number
  ) => {
    const filter: {
      userId: number;
      date?: { gte: Date; lte: Date };
      categoryId?: GetJournalsInput["categoryId"];
      moodId?: GetJournalsInput["moodId"];
    } = {
      userId,
    };

    if (input) {
      if (input.startDate && input.endDate) {
        filter.date = {
          gte: new Date(input.startDate),
          lte: new Date(input.endDate),
        };
      }

      if (input.categoryId) {
        filter.categoryId = input.categoryId;
      }

      if (input.moodId) {
        filter.moodId = input.moodId;
      }

      if (input.activityIds && input.activityIds.length > 0) {
      }
    }

    const journals = await prisma.journal.findMany({
      where: {
        ...filter,
        ...(input?.activityIds && {
          activities: {
            some: {
              id: { in: input.activityIds },
            },
          },
        }),
      },
      orderBy: {
        journalDate: "desc",
      },
      include: {
        activities: true,
      },
    });

    return journals || [];
  },
};

async function updateJournalActivities(
  input: UpdateJournalInput,
  tx: Omit<PrismaClient, runtime.ITXClientDenyList>
) {
  const oldData: JournalActivity[] = await tx.journalActivity.findMany({
    where: {
      journalId: input.id,
    },
  });
  const oldIds = oldData.map((data) => data.activityId);
  const toRemove = oldIds.filter((id) => !input.activities.includes(id));

  const toAdd = input.activities
    .filter((id) => !oldIds.includes(id))
    .map((newId) => ({
      activityId: newId,
      journalId: input.id,
    }));

  return await Promise.all([
    toRemove.length &&
      tx.journalActivity.deleteMany({
        where: {
          activityId: {
            in: toRemove,
          },
          journalId: input.id,
        },
      }),
    toAdd.length &&
      tx.journalActivity.createMany({
        data: toAdd,
      }),
  ]);
}

/**
 * 處理日記事件的更新
 */
// async function updateJournalEvents(
//   input: UpdateJournalInput,
//   tx: Omit<PrismaClient, runtime.ITXClientDenyList>,
//   journalId: number,
//   groupId: number
// ) {
//   const oldEvents: Event[] = await tx.event.findMany({
//     where: {
//       journalId: input.id,
//     },
//   });

//   const pendingData = oldEvents.reduce(
//     (acc, oldEvent) => {
//       const latestExistEvents = input.events.filter((e) => e.id);

//       const stillExsitLatestEvent = latestExistEvents.find((event) => {
//         return event.id === oldEvent.id;
//       });

//       if (stillExsitLatestEvent) {
//         // 比較有的key，value要一樣
//         // 比較是否要被更新
//         let isDifferent = false;
//         for (const [key, latestValue] of Object.entries(
//           stillExsitLatestEvent
//         )) {
//           if (key !== "id") {
//             isDifferent =
//               // @ts-ignore
//               latestValue === oldEvent[key] ? false : true;
//           }
//         }
//         isDifferent &&
//           acc.toBeUpdate.push({
//             id: stillExsitLatestEvent.id,
//             moodId: stillExsitLatestEvent.eventMoodId,
//             eventTitle: stillExsitLatestEvent.eventTitle,
//             eventBody: stillExsitLatestEvent.eventBody,
//             eventIndex: stillExsitLatestEvent.eventIndex,
//           });
//       } else {
//         acc.toBeDelete.push(oldEvent);
//       }

//       return acc;
//     },
//     {
//       toBeDelete: [] as Event[],
//       toBeUpdate: [] as Omit<
//         Event,
//         "groupId" | "journalId" | "createdAt" | "updatedAt"
//       >[],
//     }
//   );

//   // index
//   const toBeAdd = input.events
//     .filter((inputE) => !inputE.id)
//     .map((data) => ({
//       eventTitle: data.eventTitle,
//       eventBody: data.eventBody,
//       eventIndex: data.eventIndex,
//       moodId: data.eventMoodId,
//       journalId,
//       groupId,
//     }));

//   return await Promise.all([
//     pendingData.toBeDelete.length &&
//       tx.event.deleteMany({
//         where: {
//           id: {
//             in: pendingData.toBeDelete.map((e) => e.id),
//           },
//         },
//       }),
//     toBeAdd &&
//       tx.event.createMany({
//         data: toBeAdd,
//       }),
//     ...(pendingData.toBeUpdate.length
//       ? pendingData.toBeUpdate.map((data) =>
//           tx.event.update({
//             where: {
//               id: data.id,
//             },
//             data,
//           })
//         )
//       : []),
//   ]);
// }

async function updateJournalEvents(
  input: UpdateJournalInput,
  tx: Omit<PrismaClient, runtime.ITXClientDenyList>,
  journalId: number,
  groupId: number
) {
  const oldEvents: Event[] = await tx.event.findMany({
    where: {
      journalId: input.id,
    },
  });

  const finalEvents = input.events.map((event, index) => ({
    ...event,
    eventIndex: index,
  }));

  const toBeDeleteEvents = oldEvents.filter(
    (event) => !finalEvents.some((e) => e.id === event.id)
  );

  const toBeUpdateEvents = finalEvents.filter(
    (event) => event.id && !toBeDeleteEvents.some((e) => e.id === event.id)
  );

  const toBeAdd = finalEvents
    .filter((inputE) => !inputE.id)
    .map((data) => ({
      eventTitle: data.eventTitle,
      eventBody: data.eventBody,
      eventIndex: data.eventIndex,
      moodId: data.eventMoodId,
      journalId,
      groupId,
    }));

  return await Promise.all([
    toBeDeleteEvents.length &&
      tx.event.deleteMany({
        where: {
          id: {
            in: toBeDeleteEvents.map((e) => e.id),
          },
        },
      }),
    toBeAdd &&
      tx.event.createMany({
        data: toBeAdd,
      }),
    ...(toBeUpdateEvents.length
      ? toBeUpdateEvents.map((data) =>
          tx.event.update({
            where: {
              id: data.id,
            },
            data,
          })
        )
      : []),
  ]);
}
