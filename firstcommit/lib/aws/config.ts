export function awsEnabled() {
  return Boolean(process.env.AWS_REGION && process.env.COURSE_CONTENT_BUCKET);
}

export function requiredAwsConfig() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.COURSE_CONTENT_BUCKET;
  if (!region || !bucket) throw new Error("AWS_REGION and COURSE_CONTENT_BUCKET must be configured");
  return { region, bucket };
}
