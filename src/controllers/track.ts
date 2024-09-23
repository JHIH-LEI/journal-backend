import { prisma } from "../db";
import { AddJournalTrackInput, CreateTrackInput } from "../generated/graphql";
export const trackController = {
  createTrack: async (input: CreateTrackInput) => {
    const track = await prisma.track.create({
      data: {
        trackName: input.trackName,
        trackDisplayType: input.trackDisplayType,
        group: {
          connect: { id: input.groupId },
        },
      },
    });
    return track;
  },
  removeTrack: async (id: number) => {
    const deleteTrack = await prisma.track.delete({
      where: {
        id,
      },
    });

    return deleteTrack;
  },

  removeJournalTrack: async (id: number) => {
    const deleteTrack = await prisma.journalTrack.delete({
      where: {
        id,
      },
    });
    return deleteTrack;
  },

  addJournalTrack: async (input: AddJournalTrackInput) => {
    const jorunalTrack = await prisma.journalTrack.create({
      data: {
        journal: {
          connect: { id: input.journalId },
        },
        track: {
          connect: { id: input.trackId },
        },
        trackValue: input.trackValue,
        trackGoal: input.trackGoal,
      },
    });

    return jorunalTrack;
  },
};
