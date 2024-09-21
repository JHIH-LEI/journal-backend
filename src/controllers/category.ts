import { prisma } from "../db";
import { CreateCategoryInput, RemoveCategoryInput } from "../generated/graphql";
export const categoryController = {
  createCategory: async (input: CreateCategoryInput) => {
    const category = await prisma.category.create({
      data: {
        categoryName: input.categoryName,
        group: {
          connect: { id: input.groupId },
        },
      },
    });
    return category;
  },
  removeCategory: async (input: RemoveCategoryInput) => {
    const category = await prisma.category.delete({
      where: {
        id: input.id,
        groupId: input.groupId,
      },
    });
    return category;
  },
};
