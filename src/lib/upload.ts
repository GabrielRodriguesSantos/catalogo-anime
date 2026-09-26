export function isUploadedFile(
  value: FormDataEntryValue | null | undefined
): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    "size" in value &&
    "type" in value
  );
}

export function readAvatarCandidate(
  value: FormDataEntryValue | null | undefined
): File | null {
  if (!isUploadedFile(value)) return null;
  if (value.size <= 0) return null;
  return value;
}