import { prisma } from "../db";
import { CreateTrackInput } from "../generated/graphql";
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
};
