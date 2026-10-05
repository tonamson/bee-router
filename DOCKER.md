# Docker

Run BeeRouter in a container. Published image: [`tonamson/bee-router`](https://hub.docker.com/r/tonamson/bee-router) — multi-platform `linux/amd64` + `linux/arm64`.

---

# 👤 For Users

## Quick start

```bash
docker run -d \
  -p 20128:20128 \
  -v "$HOME/.bee-router:/app/data" \
  -e DATA_DIR=/app/data \
  --name bee-router \
  tonamson/bee-router:latest
```

App listens on port `20128`. Open: http://localhost:20128

## Manage container

```bash
docker logs -f bee-router        # view logs
docker stop bee-router           # stop
docker start bee-router          # start again
docker rm -f bee-router          # remove
```

## Data persistence

```bash
-v "$HOME/.bee-router:/app/data" \
-e DATA_DIR=/app/data
```

Without `DATA_DIR`, the app falls back to `~/.bee-router/` (macOS/Linux) or `%APPDATA%\bee-router\` (Windows). In the container, `DATA_DIR=/app/data` makes the bind mount work.

Data layout under `$DATA_DIR/`:

```text
$DATA_DIR/
├── db/
│   ├── data.sqlite       # main SQLite database
│   └── backups/          # auto backups
└── ...                   # certs, logs, runtime configs
```

Host path: `$HOME/.bee-router/db/data.sqlite`
Container path: `/app/data/db/data.sqlite`

## Optional env vars

```bash
docker run -d \
  -p 20128:20128 \
  -v "$HOME/.bee-router:/app/data" \
  -e DATA_DIR=/app/data \
  -e PORT=20128 \
  -e HOSTNAME=0.0.0.0 \
  -e DEBUG=true \
  --name bee-router \
  tonamson/bee-router:latest
```

## Optional Headroom sidecar

The BeeRouter image does not bundle Python or Headroom. To use Headroom in Docker, run it as a separate service and point BeeRouter at that proxy:

```yaml
services:
  bee-router:
    image: tonamson/bee-router:latest
    ports:
      - "20128:20128"
    volumes:
      - "$HOME/.bee-router:/app/data"
    environment:
      DATA_DIR: /app/data
      HEADROOM_URL: http://headroom:8787
    depends_on:
      - headroom

  headroom:
    image: ghcr.io/chopratejas/headroom:latest
    ports:
      - "8787:8787"
```

In the dashboard, open `Endpoint` → `Token Saver` → `Headroom`, confirm the URL is `http://headroom:8787`, recheck status, then enable Headroom.

If Headroom runs on the Docker host instead of as a sidecar, use `http://host.docker.internal:8787` on macOS/Windows. On Linux, add `--add-host=host.docker.internal:host-gateway` or the equivalent compose `extra_hosts` entry.

## Update to latest

```bash
docker pull tonamson/bee-router:latest
docker rm -f bee-router
# re-run the quick start command
```

To pin a specific version instead of following `latest`, use a numbered image tag:

```bash
docker pull tonamson/bee-router:0.3.7
```

---

# 🛠 For Developers

## Build image locally (test)

```bash
cd app && docker build -t bee-router .

docker run --rm -p 20128:20128 \
  -v "$HOME/.bee-router:/app/data" \
  -e DATA_DIR=/app/data \
  bee-router
```

The Dockerfile uses the official Alpine and npm registries by default. Regional mirrors can be supplied when needed:

```bash
docker build \
  --build-arg ALPINE_MIRROR=mirrors.aliyun.com \
  --build-arg NPM_REGISTRY=https://registry.npmmirror.com/ \
  -t bee-router .
```

## Publish (automatic via CI)

Push a git tag `v*` → GitHub Actions builds multi-platform (amd64+arm64) and pushes to:
- `ghcr.io/tonamson/bee-router:v{version}` + `:latest`
- `tonamson/bee-router:v{version}` + `:latest`

```bash
# Bump, commit, annotated tag vX.Y.Z (default patch)
yarn bump
yarn bump minor --push   # also push branch + tag (triggers this workflow)

# Or manually
git tag v0.3.7 && git push origin v0.3.7
```

To republish an existing tag, run the `Build and Push Docker Image` workflow manually and provide the exact tag, for example `v0.3.7`, in the `release_tag` input. Manual runs publish the numbered tag but leave `latest` unchanged by default:

```text
release_tag:     v0.3.7
promote_latest:  false
```

The `promote_latest` checkbox is an explicit opt-in for changing `latest`. Use it when a deliberate rollback or recovery should make that version the current default:

```text
release_tag:     v0.3.6
promote_latest:  true
```

Numbered image tags are mutable because a republish can replace their manifest. For a deployment that must be immutable, pin the image digest instead:

```bash
docker pull tonamson/bee-router@sha256:<verified-digest>
```

The release workflow runs `/api/health` on each native `amd64` and `arm64` platform image before it uploads the digest artifact or assembles the multi-platform manifest. It then runs a second health check against the resolved version manifest before any requested `latest` promotion.

During recovery, the selected tag remains the application source while the Dockerfile from the workflow revision is used, so an older tag can be rebuilt with the current publishing fixes.

The workflow is tag-driven. Creating a git tag does not automatically create a GitHub Release, so the Releases page and the published package/image tags can be at different versions unless a maintainer creates a release separately.

The BeeRouter repository needs these repository secrets for Docker Hub publishing:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

GHCR publishing uses the workflow's `GITHUB_TOKEN` with package write permission. Forks can publish to their own GHCR namespace, but Docker Hub publication is restricted to the `tonamson/bee-router` repository.

The optional repository variables `ALPINE_MIRROR` and `NPM_REGISTRY` can override the default package mirrors used by the CI Docker build.

Workflow: `.github/workflows/docker-publish.yml`
