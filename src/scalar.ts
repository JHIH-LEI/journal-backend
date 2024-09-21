import { GraphQLScalarType, Kind } from "graphql";

export const intIDScalar = new GraphQLScalarType({
  name: "intID",
  description: "ID but in int format",
  // backend response
  serialize(outputValue: any): number {
    const coercedValue = serializeObject(outputValue);

    if (typeof coercedValue === "string") {
      return Number(coercedValue);
    }

    if (Number.isInteger(coercedValue)) {
      return coercedValue as number;
    }

    throw new Error(`GraphQL IntID Scalar serialize error`);
  },

  parseValue(inputValue: any) {
    if (typeof inputValue === "string") {
      return Number(inputValue);
    }
    if (typeof inputValue === "number" && Number.isInteger(inputValue)) {
      return inputValue;
    }
    throw new Error(`GraphQL IntID Scalar parse error`);
  },

  parseLiteral(valueNode: any) {
    if (valueNode.kind !== Kind.STRING && valueNode.kind !== Kind.INT) {
      return null;
    }
    return Number(valueNode.value);
  },
});

function isObjectLike(value: unknown): value is { [key: string]: unknown } {
  return typeof value == "object" && value !== null;
}

// Support serializing objects with custom valueOf() or toJSON() functions -
// a common way to represent a complex value which can be represented as
// a string (ex: MongoDB id objects).
function serializeObject(outputValue: unknown): unknown {
  if (isObjectLike(outputValue)) {
    if (typeof outputValue.valueOf === "function") {
      const valueOfResult = outputValue.valueOf();
      if (!isObjectLike(valueOfResult)) {
        return valueOfResult;
      }
    }
    if (typeof outputValue.toJSON === "function") {
      return outputValue.toJSON();
    }
  }
  return outputValue;
}
