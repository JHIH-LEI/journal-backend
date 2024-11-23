import { prisma } from "../db";
import { CreateActivityInput, UpdateActivityInput } from "../generated/graphql";

export const activityController = {
  createActivity: async (input: CreateActivityInput) => {
    const activity = await prisma.activity.create({
      data: {
        activityName: input.activityName,
        group: {
          connect: {
            id: input.groupId,
          },
        },
      },
    });
    return activity;
  },
  updateActivity: async (input: UpdateActivityInput) => {
    const updateActivity = await prisma.activity.update({
      where: {
        id: input.id,
      },
      data: {
        activityName: input.activityName,
      },
    });
    return updateActivity;
  },
  removeActivity: async (id: number) => {
    const activity = await prisma.activity.delete({
      where: { id },
    });
    return activity;
  },
};
