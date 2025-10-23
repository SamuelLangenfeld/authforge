const errorMessage = (e: unknown) => {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === "string") {
    return e;
  }
  if (e && typeof e === "object" && "message" in e) {
    return (e as Record<string, unknown>).message as string;
  }
  return `Unexpected Error: ${JSON.stringify(e)}`;
};

export default errorMessage;
