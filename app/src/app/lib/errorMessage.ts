export default (e: unknown) => {
  let message;
  if (e instanceof Error) {
    message = e.message;
  }
  if (typeof e === "string") {
    message = e;
  } else {
    message = `Unexpected Error: ${e}`;
  }
  return message;
};
