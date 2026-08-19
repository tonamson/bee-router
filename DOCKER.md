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

## Publish (automatic via CI)

Push a git tag `v*` → GitHub Actions builds multi-platform (amd64+arm64) and pushes to:
- `ghcr.io/tonamson/bee-router:v{version}` + `:latest`
- `tonamson/bee-router:v{version}` + `:latest`

```bash
# Bump, commit, annotated tag vX.Y.Z (default patch)
yarn bump
yarn bump minor --push   # also push branch + tag (triggers this workflow)

# Or manually
git tag v0.4.x && git push origin v0.4.x
```

Workflow: `app/.github/workflows/docker-publish.yml`
