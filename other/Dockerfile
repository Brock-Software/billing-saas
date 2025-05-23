# This file is moved to the root directory before building the image

# base node image
FROM node:20-bookworm-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV production

# Install openssl for Prisma and AWS CLI
RUN apt-get update && apt-get install -y fuse3 openssl sqlite3 ca-certificates curl unzip && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g bun

# Install all node_modules, including dev dependencies
FROM base as deps
WORKDIR /myapp
ADD package.json bun.lockb .npmrc ./
RUN bun i

# Setup production node_modules
FROM base as production-deps
WORKDIR /myapp
ADD package.json bun.lockb .npmrc ./
RUN bun i --production

# Build the app
FROM base as build

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules

ADD prisma .
RUN bunx prisma generate

ADD . .

# Mount the secret and set it as an environment variable and run the build
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
    bun run build

# Finally, build the production image with minimal footprint
FROM base

ENV FLY="true"
ENV LITEFS_DIR="/litefs/data"
ENV DATABASE_FILENAME="sqlite.db"
ENV DATABASE_PATH="$LITEFS_DIR/$DATABASE_FILENAME"
ENV DATABASE_URL="file:$DATABASE_PATH"
ENV CACHE_DATABASE_FILENAME="cache.db"
ENV CACHE_DATABASE_PATH="/$LITEFS_DIR/$CACHE_DATABASE_FILENAME"
ENV INTERNAL_PORT="8080"
ENV PORT="8081"
ENV NODE_ENV="production"

# Set environment variables for puppeteer & download chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update && apt-get install -y \
    udev \
    fonts-freefont-ttf \
    chromium-common \
    chromium-sandbox \
    chromium \
    libgif7

# add shortcut for connecting to database CLI
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$DATABASE_URL" > /usr/local/bin/database-cli && chmod +x /usr/local/bin/database-cli

WORKDIR /myapp

COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/node_modules/.prisma /myapp/node_modules/.prisma

COPY --from=build /myapp/server-build /myapp/server-build
COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/public /myapp/public
COPY --from=build /myapp/package.json /myapp/package.json
COPY --from=build /myapp/prisma /myapp/prisma

ADD . .

# Configure AWS CLI
ENV AWS_DEFAULT_REGION=auto
RUN --mount=type=secret,id=AWS_ACCESS_KEY_ID \
    --mount=type=secret,id=AWS_SECRET_ACCESS_KEY \
    aws configure set aws_access_key_id $(cat /run/secrets/AWS_ACCESS_KEY_ID) && \
    aws configure set aws_secret_access_key $(cat /run/secrets/AWS_SECRET_ACCESS_KEY)

CMD ["bun", "run", "start"]
