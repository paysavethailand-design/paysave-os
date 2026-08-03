ARG NODE_IMAGE=node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY packages/security/package.json packages/security/package.json
COPY packages/testing/package.json packages/testing/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

FROM dependencies AS builder
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG PAYSAVE_RELEASE_VERSION
ARG PAYSAVE_SOURCE_REVISION
ARG PAYSAVE_BUILD_TIME
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
    PAYSAVE_RELEASE_VERSION=${PAYSAVE_RELEASE_VERSION} \
    PAYSAVE_SOURCE_REVISION=${PAYSAVE_SOURCE_REVISION} \
    PAYSAVE_BUILD_TIME=${PAYSAVE_BUILD_TIME} \
    PAYSAVE_ENABLE_DESIGN_PREVIEW=false \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM ${NODE_IMAGE} AS runner
ARG PAYSAVE_RELEASE_VERSION
ARG PAYSAVE_SOURCE_REVISION
ARG PAYSAVE_BUILD_TIME
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    PAYSAVE_RELEASE_VERSION=${PAYSAVE_RELEASE_VERSION} \
    PAYSAVE_SOURCE_REVISION=${PAYSAVE_SOURCE_REVISION} \
    PAYSAVE_BUILD_TIME=${PAYSAVE_BUILD_TIME} \
    PAYSAVE_ENABLE_DESIGN_PREVIEW=false
WORKDIR /workspace
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    && addgroup --system --gid 10001 paysave \
    && adduser --system --uid 10001 --ingroup paysave paysave
COPY --from=production-dependencies --chown=paysave:paysave /workspace/node_modules ./node_modules
COPY --from=builder --chown=paysave:paysave /workspace/package.json /workspace/package-lock.json ./
COPY --from=builder --chown=paysave:paysave /workspace/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=paysave:paysave /workspace/docker/next.config.mjs ./apps/web/next.config.mjs
COPY --from=builder --chown=paysave:paysave /workspace/apps/web/public ./apps/web/public
COPY --from=builder --chown=paysave:paysave /workspace/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=paysave:paysave /workspace/packages ./packages
USER paysave
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "node_modules/next/dist/bin/next", "start", "apps/web", "--hostname", "0.0.0.0", "--port", "3000"]
