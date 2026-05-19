import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
}

export default withSentryConfig(nextConfig, {
  org: 'do-chat',
  project: 'javascript-nextjs',
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  sourcemaps: { disable: true },
})
