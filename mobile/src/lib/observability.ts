type EventProperties = Record<string, string | number | boolean | null | undefined>;

type CapturedError = {
  error: Error;
  context?: string;
  extra?: EventProperties;
};

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === 'string' ? error : JSON.stringify(error));
}

export const observability = {
  captureException(error: unknown, context?: string, extra?: EventProperties) {
    const captured: CapturedError = { error: normalizeError(error), context, extra };
    if (isDev) {
      console.error('[observability.captureException]', captured.context, captured.error, captured.extra);
    }
    // Production hook point:
    // - Sentry.captureException(captured.error, { tags: { context }, extra })
    // - or send to your own logging endpoint from a backend that protects secrets.
  },

  track(eventName: string, properties?: EventProperties) {
    if (isDev) {
      console.log('[observability.track]', eventName, properties ?? {});
    }
    // Production hook point:
    // - analytics.track(eventName, properties)
    // Keep PII out of analytics events unless your privacy policy covers it.
  },
};
