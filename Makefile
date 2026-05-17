DOCKER_USER ?= basileldho1
IMAGE       = $(DOCKER_USER)/sleuth
VERSION     ?= latest

.PHONY: dev build docker run push release

# Start backend + frontend in separate terminals (development)
dev-backend:
	cd backend && go run ./cmd/sleuth

dev-frontend:
	cd frontend && pnpm dev

# Build a local binary with embedded frontend
build:
	cd frontend && pnpm build
	cp -r frontend/dist/. backend/internal/web/dist/
	cd backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o ../sleuth ./cmd/sleuth
	@echo "Binary ready: ./sleuth"

# Build the Docker image
docker:
	docker build -t sleuth .

# Build + run (mounts host Docker socket)
run: docker
	docker run --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-p 8080:8080 -d\
		sleuth

# Push multi-platform image to Docker Hub (amd64 + arm64)
push:
	docker buildx create --use --name sleuth-builder 2>/dev/null || docker buildx use sleuth-builder
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		-t $(IMAGE):latest \
		--push \
		.

# Push with a specific version tag (make release VERSION=v1.0.0)
release:
	docker buildx create --use --name sleuth-builder 2>/dev/null || docker buildx use sleuth-builder
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		-t $(IMAGE):$(VERSION) \
		-t $(IMAGE):latest \
		--push \
		.
